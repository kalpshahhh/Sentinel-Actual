import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { FileText, RotateCcw, Send, Hourglass, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AuditEntry, Case, Vessel } from '../types';
import { callClaudeText } from '../lib/anthropic';
import { HANDOFF_NOTE_PROMPT } from '../lib/prompts';
import { TREATMENT_SUBSTITUTIONS } from '../data/treatmentSubstitutions';
import { AuditTimeline } from './AuditTimeline';

type Props = {
  vessel: Vessel;
  kase: Case;
  auditLog: AuditEntry[];
  satelliteCountdownSec: number;
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  onCloudCall: () => void;
  onReset: () => void;
};

function fmtCountdown(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const SBAR_HEADERS = ['SITUATION:', 'BACKGROUND:', 'ASSESSMENT:', 'RECOMMENDATION:'] as const;
type SbarHeader = (typeof SBAR_HEADERS)[number];

function parseSbar(text: string): Array<{ header: SbarHeader | null; body: string }> {
  if (!text) return [];
  const pattern = new RegExp(`(${SBAR_HEADERS.join('|')})`, 'g');
  const tokens = text.split(pattern);
  const out: Array<{ header: SbarHeader | null; body: string }> = [];
  let currentHeader: SbarHeader | null = null;
  let buf = '';
  for (const tok of tokens) {
    if ((SBAR_HEADERS as readonly string[]).includes(tok)) {
      if (buf.trim().length > 0 || currentHeader !== null) {
        out.push({ header: currentHeader, body: buf });
      }
      currentHeader = tok as SbarHeader;
      buf = '';
    } else {
      buf += tok;
    }
  }
  if (buf.length > 0 || currentHeader !== null) out.push({ header: currentHeader, body: buf });
  return out;
}

/**
 * Build an SBAR handoff note from the actual case data when the LLM is
 * unavailable. The output is structured so a clinician can read it cold:
 * vessel context, free-text operator notes, differential with probabilities,
 * the chosen treatment plan, every documented substitution per step, and
 * the deterministic red-flags for evac.
 */
function buildFallbackSbar(kase: Case, vessel: Vessel): string {
  const startedAt = new Date(kase.startedAt);
  const elapsedMin = Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 60_000));
  const regions = (kase.symptoms?.regions ?? []) as string[];
  const extra = (kase.symptoms?.extraInfo ?? '') as string;
  const condition = kase.selectedCondition ?? 'Undifferentiated — operator handed off before final diagnosis';
  const diff = kase.differential ?? [];
  const top3 = diff
    .slice(0, 3)
    .map((d) => `${d.condition} ${Math.round(d.probability * 100)}%`)
    .join('; ');
  const regionsLine =
    regions.length > 0
      ? regions.map((r) => r.replace(/_/g, ' ')).join(', ')
      : 'no body-region tap recorded';

  const situation = [
    `Crewmember aboard ${vessel.name} (${vessel.type}, flag ${vessel.flag}, ${vessel.crew} crew).`,
    `Incident started ${startedAt.toISOString()} — ${elapsedMin} min ago.`,
    `Operator-reported location of complaint: ${regionsLine}.`,
    `Shore ETA approx ${vessel.etaToShoreHours}h. Weather on deck: ${vessel.weatherCondition}.`,
  ].join(' ');

  const background = [
    extra ? `Operator notes: "${extra.trim()}"` : 'No additional operator notes recorded.',
    'No structured PMHx captured (Sentinel non-clinician path).',
    'Assessor: non-physician with Sentinel offline-graph guidance — pre-compiled protocols only, zero cloud calls during incident run.',
  ].join(' ');

  const assessmentLines: string[] = [];
  assessmentLines.push(`Working diagnosis: ${condition}.`);
  if (top3) assessmentLines.push(`Differential (top 3 by deterministic ranking): ${top3}.`);
  if (kase.ultrasoundFindings) assessmentLines.push(`POCUS finding: ${kase.ultrasoundFindings}.`);
  const answers = (kase.symptoms?.answers ?? {}) as Record<string, string>;
  const answeredCount = Object.keys(answers).length;
  if (answeredCount > 0) {
    const yes = Object.values(answers).filter((v) => v === 'yes').length;
    const no = Object.values(answers).filter((v) => v === 'no').length;
    const skip = Object.values(answers).filter((v) => v === 'skip').length;
    assessmentLines.push(`Yes/no questions answered: ${answeredCount} (yes=${yes}, no=${no}, not-sure=${skip}).`);
  }

  const recParts: string[] = [];
  const steps = kase.recommendation?.steps ?? [];
  if (steps.length === 0) {
    recParts.push(
      'No treatment plan finalized before handoff — operator chose to wait for arriving professionals.'
    );
  } else {
    recParts.push(`Decision: ${kase.recommendation?.decision?.toUpperCase()}. ${kase.recommendation?.rationale ?? ''}`.trim());
    recParts.push('Compiled treatment plan (in order):');
    steps.forEach((s, idx) => {
      const line: string[] = [`${idx + 1}. ${s.action}`];
      if (s.drug) line.push(`[${s.drug}${s.dose ? ` ${s.dose}` : ''}${s.route ? ` ${s.route}` : ''}${s.frequency ? `, ${s.frequency}` : ''}]`);
      if (s.why) line.push(`— ${s.why}`);
      recParts.push(line.join(' '));
      // Step-level alternatives (already compiled into the protocol)
      if (s.alternatives && s.alternatives.length > 0) {
        recParts.push(
          `   Substitutions if primary not possible: ${s.alternatives
            .map((a) => `if ${a.when} → ${a.instead}`)
            .join(' | ')}`
        );
      }
      // Cross-reference deterministic substitution table by drug name
      if (s.drug) {
        const tableHit = TREATMENT_SUBSTITUTIONS.find((sub) =>
          s.drug!.toLowerCase().includes(sub.originalDrugPattern.toLowerCase())
        );
        if (tableHit) {
          if (tableHit.criticalWarning) {
            recParts.push(`   ⚠ CRITICAL: ${tableHit.criticalWarning}`);
          }
          if (tableHit.alternatives.length > 0) {
            recParts.push(
              `   Inventory-aware alternatives: ${tableHit.alternatives
                .map((a) => `${a.action} (${a.note})`)
                .join(' | ')}`
            );
          }
        }
      }
    });
  }

  // Pull evacuateIf red-flags via differential top scenario — we have the
  // condition name but not the scenario object here, so quote the rationale
  // line that already contains the trigger summary.
  if (kase.recommendation?.decision === 'evacuate') {
    recParts.push('Disposition: evacuation requested. Telemedicine consult requested at next satellite window.');
  }

  return [
    `SITUATION: ${situation}`,
    '',
    `BACKGROUND: ${background}`,
    '',
    `ASSESSMENT: ${assessmentLines.join(' ')}`,
    '',
    `RECOMMENDATION: ${recParts.join('\n')}`,
  ].join('\n');
}

export function HandoffMode({
  vessel,
  kase,
  auditLog,
  satelliteCountdownSec,
  addAuditEntry,
  onCloudCall,
  onReset,
}: Props) {
  const [note, setNote] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generatedRef = useRef(false);
  const noteEndRef = useRef<HTMLDivElement | null>(null);

  const streamWords = useCallback((full: string) => {
    setNote('');
    const words = full.split(/(\s+)/);
    let i = 0;
    const tick = () => {
      if (i >= words.length) {
        setStreaming(false);
        return;
      }
      setNote((cur) => cur + words[i]);
      i += 1;
      const delay = 18 + Math.random() * 36;
      setTimeout(tick, delay);
      if (noteEndRef.current) noteEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };
    setStreaming(true);
    tick();
  }, []);

  const generate = useCallback(async () => {
    if (generatedRef.current) return;
    generatedRef.current = true;
    setError(null);
    setGenerated(true);
    onCloudCall();
    addAuditEntry({
      mode: 'handoff',
      type: 'llm_call',
      description: 'Generating SBAR handoff note via cloud LLM',
      data: { caseId: kase.id },
    });

    const payload = {
      vessel,
      case: {
        id: kase.id,
        startedAt: kase.startedAt,
        symptoms: kase.symptoms,
        vitals: kase.vitals,
        differential: kase.differential,
        selectedCondition: kase.selectedCondition,
        ultrasoundFindings: kase.ultrasoundFindings,
        recommendation: kase.recommendation,
      },
      auditSummary: auditLog.slice(-20).map((a) => ({ t: a.timestamp, type: a.type, desc: a.description })),
    };

    try {
      const text = await callClaudeText(HANDOFF_NOTE_PROMPT, payload, 1024);
      streamWords(text.trim());
      addAuditEntry({
        mode: 'handoff',
        type: 'recommendation',
        description: 'SBAR handoff note generated, queued for sync',
        data: { length: text.length },
      });
    } catch (err) {
      setError((err as Error).message);
      streamWords(buildFallbackSbar(kase, vessel));
      addAuditEntry({
        mode: 'handoff',
        type: 'recommendation',
        description: 'SBAR handoff note generated (fallback, LLM unavailable)',
      });
    }
  }, [onCloudCall, addAuditEntry, kase, vessel, auditLog, streamWords]);

  const sbarSections = parseSbar(note);

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-4 max-w-[1400px] mx-auto pb-32">
      {/* Left: Handoff note */}
      <section className="lg:col-span-3 bg-rig-surface border border-rig-dim/20 rounded-md overflow-hidden flex flex-col">
        <header className="px-5 py-3 border-b border-rig-dim/20 flex items-center gap-2">
          <FileText size={14} className="text-rig-accent" />
          <span className="text-xs uppercase tracking-widest text-rig-text">Clinical Handoff — SBAR</span>
          <span className="ml-auto text-[10px] text-rig-dim font-mono">{kase.id}</span>
        </header>

        <div className="p-4 flex items-center gap-2 border-b border-rig-dim/20">
          <button
            disabled={streaming || generated}
            onClick={generate}
            className={clsx(
              'px-4 py-2 rounded text-xs uppercase tracking-widest font-bold flex items-center gap-2',
              streaming
                ? 'bg-rig-dim/30 text-rig-dim cursor-wait'
                : generated
                ? 'bg-rig-ok/15 border border-rig-ok/40 text-rig-ok cursor-default'
                : 'bg-rig-accent text-rig-bg hover:bg-rig-accent/85 glow-accent'
            )}
          >
            {streaming ? (
              <>
                <Hourglass size={12} className="animate-spin" /> Generating
              </>
            ) : generated ? (
              <>
                <CheckCircle size={12} /> Note generated
              </>
            ) : (
              <>
                <Send size={12} /> Generate Note
              </>
            )}
          </button>
          {error && (
            <span className="text-[10px] text-rig-critical font-mono flex items-center gap-1">
              <AlertTriangle size={11} /> Fallback used
            </span>
          )}

          <span className="ml-auto text-[10px] font-mono text-rig-dim">
            Next sat window: <span className="text-rig-accent">{fmtCountdown(satelliteCountdownSec)}</span>
          </span>
        </div>

        <div className="flex-1 min-h-[420px] max-h-[640px] overflow-y-auto px-5 py-4">
          {!generated && (
            <div className="text-xs text-rig-dim italic">
              Click <span className="text-rig-accent">Generate Note</span> to compose the SBAR handoff
              from case data and audit log. The note will queue for sync at the next satellite window.
            </div>
          )}
          {generated && (
            <div className="font-mono text-xs leading-relaxed text-rig-text space-y-3">
              {sbarSections.map((sec, i) => (
                <div key={i}>
                  {sec.header && (
                    <div className="text-[10px] uppercase tracking-widest text-rig-accent font-bold border-b border-rig-accent/30 pb-1 mb-1">
                      {sec.header.replace(':', '')}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{sec.body.replace(/^\s+/, '')}</div>
                </div>
              ))}
              {streaming && (
                <motion.span
                  className="inline-block w-2 h-3 bg-rig-accent align-text-bottom"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
              <div ref={noteEndRef} />
            </div>
          )}
        </div>

        {generated && !streaming && (
          <div className="px-5 py-3 border-t border-rig-dim/20 bg-rig-bg/40 flex items-center gap-2">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-rig-accent pulse-dot" />
            </span>
            <span className="text-[10px] uppercase tracking-widest text-rig-accent font-mono">
              Queued for sync · Next satellite window in {fmtCountdown(satelliteCountdownSec)}
            </span>
          </div>
        )}
      </section>

      {/* Right: Audit timeline */}
      <section className="lg:col-span-2 bg-rig-surface border border-rig-dim/20 rounded-md overflow-hidden flex flex-col">
        <header className="px-5 py-3 border-b border-rig-dim/20 flex items-center gap-2">
          <FileText size={14} className="text-rig-accent" />
          <span className="text-xs uppercase tracking-widest text-rig-text">Audit Timeline</span>
          <span className="ml-auto text-[10px] text-rig-dim font-mono">{auditLog.length} entries</span>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 max-h-[640px]">
          <AuditTimeline entries={auditLog} />
        </div>
      </section>

      {/* Reset */}
      <div className="lg:col-span-5 mt-4 flex justify-center">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-rig-surface border border-rig-dim/40 hover:bg-rig-bg rounded text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <RotateCcw size={14} /> Reset Demo
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Pill,
  X,
  ChevronDown,
  Image as ImageIcon,
  ShieldAlert,
} from 'lucide-react';
import type { Scenario } from '../types';
import type { InventoryManifest } from '../types/inventory';
import { CitationChip, CitationProvider } from './CitationChip';
import { findDrugLocation } from '../data/equipment-lookup';
import { enrichStep } from '../data/protocols';
import { InjectionDiagram } from './InjectionDiagram';
import { TREATMENT_SUBSTITUTIONS } from '../data/treatmentSubstitutions';
import { isDrugAvailable, getMedicationSubstitutes } from '../lib/inventory/engine';

type Props = {
  scenario: Scenario;
  onCitationLookup: (id: string) => void;
  onBack: () => void;
  onComplete: () => void;
  /** When provided, steps are checked against live inventory and warnings/substitutions shown. */
  manifest?: InventoryManifest | null;
};

export function TreatmentSteps({ scenario, onCitationLookup, onBack, onComplete, manifest }: Props) {
  const steps = scenario.treatment.map((t) => enrichStep(t, scenario.condition));
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [showDetail, setShowDetail] = useState(false);
  const [showPro, setShowPro] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [altOpen, setAltOpen] = useState(false);

  const step = steps[idx];
  const total = steps.length;
  const completed = Object.values(done).filter(Boolean).length;
  const drugInfo = step?.drug ? findDrugLocation(step.drug) : null;

  // Inventory adaptation — deterministic, zero cloud calls
  const substitutionInfo = useMemo(() => {
    if (!manifest || !step?.drug) return null;
    const drugAvailable = isDrugAvailable(manifest, step.drug);
    if (drugAvailable) return null;

    const rule = TREATMENT_SUBSTITUTIONS.find((r) =>
      step.drug!.toLowerCase().includes(r.originalDrugPattern.toLowerCase())
    );
    if (!rule) return { available: false, alternatives: [], criticalWarning: undefined, substitutes: [] };

    const substitutes = rule.substituteGroup
      ? getMedicationSubstitutes(manifest, rule.substituteGroup)
      : [];

    return {
      available: false,
      alternatives: rule.alternatives,
      criticalWarning: rule.criticalWarning,
      substitutes,
    };
  }, [manifest, step?.drug]);

  // Reset per-step UI when stepping
  const goTo = (i: number) => {
    setIdx(Math.max(0, Math.min(total - 1, i)));
    setShowDetail(false);
    setShowPro(false);
    setShowDiagram(false);
  };

  const markDone = () => {
    const wasAlreadyDone = !!done[step.id];
    setDone((d) => ({ ...d, [step.id]: !wasAlreadyDone }));
    // Auto-advance when marking done (not when unchecking)
    if (!wasAlreadyDone) {
      setTimeout(() => {
        if (idx + 1 < total) goTo(idx + 1);
        else onComplete();
      }, 650);
    }
  };
  const next = () => {
    if (idx + 1 < total) goTo(idx + 1);
    else onComplete();
  };

  if (!step) return null;

  const isDone = !!done[step.id];

  return (
    <CitationProvider>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-widest text-rig-dim font-mono">
          <span>Step {idx + 1} of {total}</span>
          <span>·</span>
          <span>{completed} marked done</span>
          <span className="ml-auto text-rig-text">{scenario.shortHeadline ?? scenario.condition}</span>
        </div>

        <div className="h-1.5 bg-rig-dim/20 rounded-full overflow-hidden mb-4">
          <motion.div className="h-full bg-rig-accent" animate={{ width: `${((idx + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className={clsx(
              'bg-rig-surface border rounded-md p-5 sm:p-6',
              isDone ? 'border-rig-ok/40' : 'border-rig-accent/40'
            )}
          >
            {/* SIMPLE — always visible */}
            <h2 className="text-2xl sm:text-3xl font-bold text-rig-text leading-tight">{step.action}</h2>

            {/* Drug card */}
            {(step.drug || step.dose || step.route || step.frequency) && (
              <div className={clsx(
                'mt-4 border rounded p-3',
                substitutionInfo
                  ? 'bg-rig-critical/10 border-rig-critical/40'
                  : 'bg-rig-bg/40 border-rig-accent/30'
              )}>
                <div className={clsx(
                  'text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1.5',
                  substitutionInfo ? 'text-rig-critical' : 'text-rig-accent'
                )}>
                  {substitutionInfo ? <ShieldAlert size={11} /> : <Pill size={11} />}
                  {substitutionInfo ? 'Drug not in inventory — see alternatives below' : 'Use exactly this'}
                </div>
                <div className={clsx('text-base', substitutionInfo ? 'text-rig-dim line-through' : 'text-rig-text')}>
                  {step.drug && <span className="font-bold">{step.drug}</span>}
                  {step.dose && <> · <span className="font-mono">{step.dose}</span></>}
                  {step.route && <> · {step.route}</>}
                </div>
                {step.frequency && !substitutionInfo && (
                  <div className="text-sm text-rig-dim mt-1">When: {step.frequency}</div>
                )}
                {drugInfo && !substitutionInfo && (
                  <div className="text-[12px] text-rig-ok mt-2 flex flex-wrap items-center gap-1.5">
                    <CheckCircle size={11} />
                    Find it at <span className="font-mono">{drugInfo.location}</span>
                    {drugInfo.locked && (
                      <span className="px-1.5 py-0.5 bg-rig-critical/20 border border-rig-critical/40 rounded text-[9px] text-rig-critical">
                        LOCKED — ask the captain for the key
                      </span>
                    )}
                    {drugInfo.quantityOnboard !== undefined && (
                      <span className="text-rig-dim">· {drugInfo.quantityOnboard} in stock</span>
                    )}
                  </div>
                )}

                {/* Inventory-adapted substitutions — deterministic, no LLM */}
                {substitutionInfo && (
                  <div className="mt-3 space-y-2">
                    {substitutionInfo.criticalWarning && (
                      <div className="flex items-start gap-1.5 p-2 bg-rig-critical/20 border border-rig-critical/40 rounded text-[11px] text-rig-critical">
                        <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                        {substitutionInfo.criticalWarning}
                      </div>
                    )}
                    {substitutionInfo.alternatives.map((alt, i) => (
                      <div key={i} className="bg-rig-bg/60 border border-rig-dim/30 rounded p-2.5">
                        <div className="text-[10px] uppercase tracking-widest text-rig-accent mb-1">
                          Alternative {substitutionInfo.alternatives.length > 1 ? i + 1 : ''}
                        </div>
                        <div className="text-sm text-rig-text">{alt.action}</div>
                        <div className="text-[10px] text-rig-dim mt-1 italic">{alt.note}</div>
                      </div>
                    ))}
                    {substitutionInfo.substitutes.length > 0 && (
                      <div className="text-[10px] text-rig-dim font-mono">
                        In inventory: {substitutionInfo.substitutes.map((m) => m.genericName).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Progressive disclosure: show how-to detail */}
            {step.detail && (
              <div className="mt-4 border-t border-rig-dim/20 pt-3">
                <button
                  onClick={() => setShowDetail((v) => !v)}
                  className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-rig-accent hover:text-rig-accent/80"
                >
                  <ChevronDown size={12} className={clsx('transition-transform', showDetail && 'rotate-180')} />
                  {showDetail ? 'Hide how-to' : 'Show how to do it (step by step)'}
                </button>
                <AnimatePresence>
                  {showDetail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-3 text-sm text-rig-text leading-relaxed">{step.detail}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Diagram (separate toggle) */}
            {step.diagram && (
              <div className="mt-3">
                <button
                  onClick={() => setShowDiagram((v) => !v)}
                  className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-rig-accent hover:text-rig-accent/80"
                >
                  <ImageIcon size={12} />
                  {showDiagram ? 'Hide diagram' : 'Show diagram'}
                </button>
                <AnimatePresence>
                  {showDiagram && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <InjectionDiagram kind={step.diagram} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Professional notes — third tier */}
            {step.professionalNotes && (
              <div className="mt-3">
                <button
                  onClick={() => setShowPro((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-rig-dim hover:text-rig-text"
                >
                  <ChevronDown size={11} className={clsx('transition-transform', showPro && 'rotate-180')} />
                  {showPro ? 'Hide clinical notes' : 'Show clinical notes (for trained staff)'}
                </button>
                <AnimatePresence>
                  {showPro && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-2 text-xs text-rig-dim leading-relaxed italic">{step.professionalNotes}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {step.citationIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {step.citationIds.map((cid) => (
                  <CitationChip key={cid} citationId={cid} onLookup={onCitationLookup} />
                ))}
              </div>
            )}

            {/* Why + Alternatives buttons */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setWhyOpen(true)}
                className="px-4 py-3 bg-rig-bg border border-rig-dim/40 rounded text-sm text-rig-text hover:bg-rig-surface flex items-center justify-center gap-2"
              >
                <HelpCircle size={14} className="text-rig-accent" />
                Why this step?
              </button>
              <button
                onClick={() => setAltOpen(true)}
                className="px-4 py-3 bg-rig-bg border border-rig-dim/40 rounded text-sm text-rig-text hover:bg-rig-surface flex items-center justify-center gap-2"
              >
                <AlertTriangle size={14} className="text-rig-critical" />
                I can't do this step
              </button>
            </div>

            {/* Mark done — toggle only, does NOT advance */}
            <div className="mt-4">
              <button
                onClick={markDone}
                className={clsx(
                  'w-full px-5 py-4 rounded font-bold uppercase tracking-widest text-base flex items-center justify-center gap-2 border-2',
                  isDone
                    ? 'bg-rig-ok/15 border-rig-ok text-rig-ok'
                    : 'bg-rig-surface border-rig-ok/40 text-rig-text hover:bg-rig-ok/10'
                )}
              >
                <CheckCircle size={18} />
                {isDone ? 'Marked done — click to undo' : 'Mark this step done'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation — independent of mark-done */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => goTo(idx - 1)}
            disabled={idx === 0}
            className={clsx(
              'px-3 py-3 rounded border text-sm uppercase tracking-widest flex items-center justify-center gap-1.5',
              idx === 0
                ? 'border-rig-dim/30 text-rig-dim/50 cursor-not-allowed'
                : 'border-rig-dim/40 text-rig-text hover:bg-rig-surface'
            )}
          >
            <ArrowLeft size={14} /> Previous
          </button>

          {/* Step jump pills */}
          <div className="flex items-center justify-center gap-1 overflow-x-auto">
            {steps.map((s, i) => {
              const completedHere = !!done[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={clsx(
                    'w-7 h-7 text-[10px] font-mono rounded-full border flex items-center justify-center shrink-0',
                    i === idx
                      ? 'bg-rig-accent text-rig-bg border-rig-accent'
                      : completedHere
                      ? 'bg-rig-ok/20 text-rig-ok border-rig-ok/40'
                      : 'bg-rig-surface text-rig-dim border-rig-dim/30 hover:bg-rig-bg'
                  )}
                >
                  {completedHere ? <CheckCircle size={10} /> : i + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={next}
            className="px-3 py-3 rounded bg-rig-accent text-rig-bg font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-1.5 hover:bg-rig-accent/85"
          >
            {idx + 1 < total ? 'Next' : 'All steps reviewed'} <ArrowRight size={14} />
          </button>
        </div>

        <button
          onClick={onBack}
          className="mt-3 text-[11px] uppercase tracking-widest text-rig-dim hover:text-rig-text flex items-center gap-1"
        >
          <ArrowLeft size={11} /> back to summary
        </button>

        {/* Modals */}
        <AnimatePresence>
          {whyOpen && (
            <Modal onClose={() => setWhyOpen(false)} title="Why this step?" tone="accent">
              <p className="text-rig-text leading-relaxed">{step.why}</p>
              {step.citationIds.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2">Evidence sources</div>
                  <div className="flex flex-wrap gap-1.5">
                    {step.citationIds.map((cid) => (
                      <CitationChip key={cid} citationId={cid} onLookup={onCitationLookup} />
                    ))}
                  </div>
                </div>
              )}
            </Modal>
          )}
          {altOpen && (
            <Modal onClose={() => setAltOpen(false)} title="What to do instead" tone="critical">
              <ul className="space-y-3">
                {(step.alternatives ?? []).map((a, i) => (
                  <li key={i} className="bg-rig-bg/40 border border-rig-dim/30 rounded p-3">
                    <div className="text-[11px] uppercase tracking-widest text-rig-critical mb-1">If: {a.when}</div>
                    <div className="text-sm text-rig-text">Do instead: {a.instead}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setAltOpen(false)}
                  className="px-4 py-2 bg-rig-bg border border-rig-dim/40 rounded text-sm text-rig-text hover:bg-rig-surface"
                >
                  Got it
                </button>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </CitationProvider>
  );
}

function Modal({
  onClose,
  title,
  tone,
  children,
}: {
  onClose: () => void;
  title: string;
  tone: 'accent' | 'critical';
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'bg-rig-panel rounded-md border-2 p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto',
          tone === 'accent' ? 'border-rig-accent/60' : 'border-rig-critical/60'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className={clsx('text-xs uppercase tracking-widest', tone === 'accent' ? 'text-rig-accent' : 'text-rig-critical')}>
            {title}
          </div>
          <button onClick={onClose} className="text-rig-dim hover:text-rig-text">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

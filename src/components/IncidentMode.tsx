import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Zap,
  FileText,
  Bell,
  Clock,
  Plane,
  XCircle,
  Radio,
} from 'lucide-react';
import type { AuditEntry, BodyRegion, CapabilityProfile, Case, OneHandedMode, Scenario, Vessel, Vitals } from '../types';
import type { InventoryManifest } from '../types/inventory';
import { buildQuestionPool, rankFromAnswers, nextBestQuestion, type Answer, type QuestionEntry } from '../data/protocols';
import { saveIncidentState, clearIncidentState, type PersistedIncident } from '../lib/incidentPersistence';
import { InteractiveBody } from './InteractiveBody';
import { CompareConditions } from './CompareConditions';
import { TreatmentSteps } from './TreatmentSteps';
import { EmergencyTierBadge } from './EmergencyTierBadge';
import { GuidedUltrasound, type UltrasoundFinding } from './GuidedUltrasound';
import { WhenHelpArrives } from './WhenHelpArrives';
import { WaitChecklist } from './WaitChecklist';

type Props = {
  caseId: string;
  vessel: Vessel;
  compiledScenarios: Scenario[];
  hasThermometer: boolean;
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  onConfirm: (kase: Case) => void;
  fastForwardKey: number;
  oneHanded: OneHandedMode;
  inventoryManifest?: InventoryManifest | null;
  capabilityProfile?: CapabilityProfile | null;
  /** Pre-loaded draft from Dexie — avoids async reads inside the component. */
  restoredDraft?: PersistedIncident | null;
};

type Stage = 'setup' | 'body' | 'questions' | 'compare' | 'ultrasound' | 'result' | 'steps' | 'when_help' | 'wait_plan';

export function IncidentMode({
  caseId,
  vessel,
  compiledScenarios,
  addAuditEntry,
  onConfirm,
  fastForwardKey,
  oneHanded,
  inventoryManifest,
  capabilityProfile,
  restoredDraft,
}: Props) {
  const restored = restoredDraft ?? null;

  const [stage, setStage] = useState<Stage>((restored?.stage as Stage) ?? 'setup');
  // Setup stage state
  const [medicNotified, setMedicNotified] = useState(restored?.medicNotified ?? false);
  const [upfrontEtaHours, setUpfrontEtaHours] = useState<number>(
    restored?.upfrontEtaHours ?? capabilityProfile?.expectedMedicEtaHours ?? 2
  );
  const [evacConfirmed, setEvacConfirmed] = useState<boolean>(
    restored?.evacConfirmed ?? capabilityProfile?.evacPossible ?? true
  );
  const [regions, setRegions] = useState<BodyRegion[]>(restored?.regions ?? []);
  const [answers, setAnswers] = useState<Record<string, Answer>>(restored?.answers ?? {});
  const [answeredOrder, setAnsweredOrder] = useState<string[]>(restored?.answeredOrder ?? []);
  const MAX_QUESTIONS = 6;
  const questionIdx = answeredOrder.length;
  const [extraInfo, setExtraInfo] = useState<string>(restored?.extraInfo ?? '');
  const [ultrasoundFinding, setUltrasoundFinding] = useState<{ key: UltrasoundFinding; label: string } | null>(null);
  const [confirmedScenarioId, setConfirmedScenarioId] = useState<string | null>(null);
  const [helpInHours, setHelpInHours] = useState<number | null>(restored?.helpInHours ?? null);
  const [stageStartedAt] = useState<Date>(() => new Date());

  const startedAtRef = useRef<string>(restored?.startedAt ?? new Date().toISOString());
  const incidentLoggedRef = useRef(false);
  const fastForwardHandledRef = useRef(0);

  // Auto-save incident state so it survives page reloads
  useEffect(() => {
    if (stage === 'body' || stage === 'questions' || stage === 'compare' || stage === 'result' || stage === 'steps' || stage === 'when_help' || stage === 'wait_plan') {
      saveIncidentState({
        caseId,
        stage,
        regions,
        answers,
        answeredOrder,
        extraInfo,
        medicNotified,
        upfrontEtaHours,
        evacConfirmed,
        helpInHours,
        startedAt: startedAtRef.current,
      });
    }
  }, [stage, regions, answers, answeredOrder, extraInfo, medicNotified, upfrontEtaHours, evacConfirmed, helpInHours, caseId]);

  useEffect(() => {
    if (incidentLoggedRef.current) return;
    incidentLoggedRef.current = true;
    addAuditEntry({
      mode: 'incident',
      type: 'input',
      description: 'Incident started — non-clinician operator',
      data: { caseId, vessel: vessel.name },
    });
    addAuditEntry({
      mode: 'incident',
      type: 'override_available',
      description: 'Captain override available at all decision points',
    });
  }, [addAuditEntry, caseId, vessel.name]);

  const handleSetupComplete = useCallback(() => {
    addAuditEntry({
      mode: 'incident',
      type: 'decision',
      description: `Setup confirmed — medic notified: ${medicNotified ? 'yes' : 'no'} · upfront ETA: ${upfrontEtaHours}h · evac possible: ${evacConfirmed ? 'yes' : 'no'}`,
      data: { medicNotified, upfrontEtaHours, evacConfirmed },
    });
    // Diagnostic engine algorithm explanation for audit trail
    addAuditEntry({
      mode: 'incident',
      type: 'recommendation',
      description: 'Diagnostic engine: entropy-based question selection — each question scored by split-score × ambiguity boost × relevance. No cloud calls.',
    });
    setStage('body');
  }, [addAuditEntry, medicNotified, upfrontEtaHours, evacConfirmed]);

  // Question pool built from the regions
  const questionPool = useMemo<QuestionEntry[]>(
    () => (regions.length > 0 ? buildQuestionPool(compiledScenarios, regions) : []),
    [compiledScenarios, regions]
  );

  // Ranking
  const ranked = useMemo(
    () => rankFromAnswers(compiledScenarios, regions, answers, questionPool),
    [compiledScenarios, regions, answers, questionPool]
  );

  // Dynamic question selector — picks the question that best splits the
  // current top scenarios by probability mass. Re-derived after every answer.
  const nextQ = useMemo(
    () => nextBestQuestion(compiledScenarios, regions, answers, questionPool),
    [compiledScenarios, regions, answers, questionPool]
  );

  // Early-stop heuristic: high lead + decent absolute confidence.
  const confidenceReached =
    ranked.length >= 1 &&
    ranked[0].probability > 0.55 &&
    ranked[0].probability - (ranked[1]?.probability ?? 0) > 0.18;

  const topScenario =
    confirmedScenarioId ? compiledScenarios.find((s) => s.id === confirmedScenarioId) ?? ranked[0]?.scenario ?? null : ranked[0]?.scenario ?? null;
  const topProbability = ranked[0]?.probability ?? 0;
  const secondProbability = ranked[1]?.probability ?? 0;
  const ambiguous = !confirmedScenarioId && ranked.length >= 2 && secondProbability > 0 && topProbability - secondProbability < 0.12;

  // === handlers ===

  const handleContinueToQuestions = useCallback(() => {
    if (regions.length === 0) return;
    setStage('questions');
    setAnsweredOrder([]);
    addAuditEntry({
      mode: 'incident',
      type: 'decision',
      description: `Loaded ${questionPool.length} candidate questions for selected location${regions.length > 1 ? 's' : ''} — adaptive selection enabled`,
    });
  }, [regions.length, questionPool.length, addAuditEntry]);

  const handleAnswer = useCallback(
    (ans: Answer) => {
      const q = nextQ?.question;
      if (!q) return;
      setAnswers((prev) => ({ ...prev, [q.id]: ans }));
      setAnsweredOrder((prev) => [...prev, q.id]);
      addAuditEntry({
        mode: 'incident',
        type: 'input',
        description: `${ans.toUpperCase()} — "${q.text}" (gain ${nextQ.gain.toFixed(2)})`,
      });
    },
    [nextQ, addAuditEntry]
  );

  const finishQuestions = useCallback(() => {
    addAuditEntry({
      mode: 'incident',
      type: 'recommendation',
      description: 'Deterministic ranking complete (zero cloud calls)',
      data: ranked.map((r) => ({ id: r.scenario.id, prob: r.probability })),
    });
    if (ambiguous) {
      setStage('compare');
      return;
    }
    const top = ranked[0]?.scenario;
    if (top?.category === 'gu') setStage('ultrasound');
    else setStage('result');
  }, [addAuditEntry, ranked, ambiguous]);

  // Adaptive auto-advance: once we hit confidence, the max, or run out of
  // useful questions, finish without asking another one. We wait until at
  // least one answer is in so the operator doesn't skip past the first prompt.
  useEffect(() => {
    if (stage !== 'questions') return;
    if (answeredOrder.length === 0) return;
    if (!nextQ || answeredOrder.length >= MAX_QUESTIONS || confidenceReached || nextQ.gain < 0.05) {
      finishQuestions();
    }
  }, [stage, answeredOrder.length, nextQ, confidenceReached, finishQuestions]);

  const handleCompareChoose = useCallback(
    (s: Scenario) => {
      setConfirmedScenarioId(s.id);
      addAuditEntry({
        mode: 'incident',
        type: 'decision',
        description: `Compare/contrast: operator chose ${s.condition}`,
      });
      if (s.category === 'gu') setStage('ultrasound');
      else setStage('result');
    },
    [addAuditEntry]
  );

  const goBack = useCallback(() => {
    if (stage === 'steps') setStage('result');
    else if (stage === 'result') setStage(ambiguous ? 'compare' : 'questions');
    else if (stage === 'compare') setStage('questions');
    else if (stage === 'ultrasound') setStage(ambiguous ? 'compare' : 'questions');
    else if (stage === 'questions') {
      if (answeredOrder.length > 0) {
        const lastId = answeredOrder[answeredOrder.length - 1];
        setAnsweredOrder((prev) => prev.slice(0, -1));
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[lastId];
          return next;
        });
      } else {
        setStage('body');
      }
    } else if (stage === 'body') {
      setStage('setup');
    }
  }, [stage, ambiguous, answeredOrder]);

  const handleUltrasoundConfirm = useCallback(
    (key: UltrasoundFinding, label: string) => {
      setUltrasoundFinding({ key, label });
      addAuditEntry({ mode: 'incident', type: 'decision', description: `Ultrasound finding: ${label}` });
      setStage('result');
    },
    [addAuditEntry]
  );

  const onCitationLookup = useCallback(
    (id: string) => addAuditEntry({ mode: 'incident', type: 'citation_lookup', description: `Looked up source: ${id}` }),
    [addAuditEntry]
  );

  // Empty vitals (non-clinician mode)
  const derivedVitals: Vitals = useMemo(
    () => ({ bp_systolic: 0, bp_diastolic: 0, hr: 0, spo2: 0, temp_c: 0, rr: 0, pain_0_10: 0 }),
    []
  );

  const handleConfirmDecision = useCallback(
    (action: 'treat_onboard' | 'helicopter_now' | 'helicopter_2h' | 'shore_24h', overridden = false) => {
      if (!topScenario) return;
      const decision = action === 'treat_onboard' ? 'onboard' : 'evacuate';
      const rationale =
        decision === 'onboard'
          ? `Pre-compiled protocol for ${topScenario.condition.toLowerCase()}. Onboard supplies sufficient.`
          : overridden
          ? 'Operator override — escalating to evacuation.'
          : `${topScenario.condition} requires hospital-level care. Stabilizing on board.`;

      addAuditEntry({
        mode: 'incident',
        type: 'decision',
        description: `Treatment decision: ${action.toUpperCase()}${overridden ? ' (override)' : ''}`,
      });

      const kase: Case = {
        id: caseId,
        startedAt: startedAtRef.current,
        symptoms: { regions, answers, extraInfo },
        vitals: derivedVitals,
        differential: ranked.map((d) => ({
          condition: d.scenario.condition,
          probability: d.probability,
          reasoning: d.reasoning,
        })),
        selectedCondition: topScenario.condition,
        ultrasoundFindings: ultrasoundFinding?.label,
        recommendation: {
          steps: topScenario.treatment,
          decision,
          rationale,
          costSavings: action === 'treat_onboard' ? 127000 : 0,
        },
        resolved: false,
      };
      clearIncidentState();
      onConfirm(kase);
    },
    [topScenario, addAuditEntry, caseId, regions, answers, extraInfo, derivedVitals, ranked, ultrasoundFinding, onConfirm]
  );

  // Fast-forward (key '3')
  useEffect(() => {
    if (fastForwardKey === fastForwardHandledRef.current) return;
    fastForwardHandledRef.current = fastForwardKey;
    if (fastForwardKey === 0) return;
    let cancelled = false;
    void (async () => {
      setMedicNotified(true);
      setStage('body');
      setRegions(['flank_right']);
      await new Promise((r) => setTimeout(r, 280));
      if (cancelled) return;
      setStage('questions');
      const pool = buildQuestionPool(compiledScenarios, ['flank_right']);
      const fa: Record<string, Answer> = {};
      pool.forEach((p, i) => (fa[p.id] = i === 0 ? 'no' : 'yes'));
      setAnswers(fa);
      await new Promise((r) => setTimeout(r, 380));
      if (cancelled) return;
      const r2 = rankFromAnswers(compiledScenarios, ['flank_right'], fa, pool);
      const top = r2[0]?.scenario;
      if (top?.category === 'gu') {
        setStage('ultrasound');
        await new Promise((r) => setTimeout(r, 700));
        if (cancelled) return;
        handleUltrasoundConfirm('no_hydronephrosis', 'Kidney looks normal (no dark space)');
      } else {
        setStage('result');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fastForwardKey, compiledScenarios, handleUltrasoundConfirm]);

  // === RENDER ===
  return (
    <div className={clsx('flex flex-col w-full', oneHanded === 'right' && 'items-end', oneHanded === 'left' && 'items-start')}>
      <div className="w-full border-b border-rig-dim/10">
        <div className="px-6 pt-4 pb-2">
          <div className="bg-rig-critical/15 border border-rig-critical/40 rounded-md p-3 flex items-center gap-3 glow-critical">
            <AlertTriangle size={20} className="text-rig-critical shrink-0" />
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-rig-critical">Emergency Mode</div>
              <div className="text-sm text-rig-text">{stageLabel(stage)}</div>
            </div>
            <div className="text-[10px] text-rig-ok font-mono flex items-center gap-1">
              <CheckCircle size={11} /> 0 cloud calls
            </div>
          </div>
        </div>
        <ProgressBar stage={stage} questionIdx={questionIdx} total={Math.max(1, questionPool.length)} />
      </div>

      <div className="px-6 pb-16 w-full">
        <AnimatePresence mode="wait">
          {stage === 'setup' && (
            <StageContainer key="setup">
              <SetupStage
                capabilityProfile={capabilityProfile}
                medicNotified={medicNotified}
                upfrontEtaHours={upfrontEtaHours}
                evacConfirmed={evacConfirmed}
                onMedicNotified={setMedicNotified}
                onEtaChange={setUpfrontEtaHours}
                onEvacChange={setEvacConfirmed}
                onContinue={handleSetupComplete}
              />
            </StageContainer>
          )}

          {stage === 'body' && (
            <StageContainer key="body">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-wider text-rig-text mb-2 text-center">
                Where is the problem?
              </h1>
              <p className="text-rig-dim text-center mb-4 text-sm">
                Tap the area where you think the problem is. Multiple areas are fine. Use the back view or close-up if needed.
              </p>
              <div className="flex justify-center">
                <div className="w-full max-w-sm">
                  <InteractiveBody regions={regions} onChange={setRegions} />
                </div>
              </div>
              {regions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col items-center">
                  <button
                    onClick={handleContinueToQuestions}
                    className="px-10 py-5 bg-rig-accent text-rig-bg font-bold uppercase tracking-widest rounded-md glow-accent hover:bg-rig-accent/85 flex items-center gap-3 text-lg"
                  >
                    Continue <ArrowRight size={20} />
                  </button>
                  <p className="text-[10px] text-rig-dim mt-2 font-mono">
                    Loading {buildQuestionPool(compiledScenarios, regions).length} pre-compiled questions · 0 cloud calls
                  </p>
                </motion.div>
              )}
            </StageContainer>
          )}

          {stage === 'questions' && (
            <StageContainer key="questions">
              <QuestionView
                question={nextQ?.question}
                index={answeredOrder.length}
                total={MAX_QUESTIONS}
                onAnswer={handleAnswer}
                onBack={goBack}
                extraInfo={extraInfo}
                onExtraInfoChange={(v) => {
                  setExtraInfo(v);
                  addAuditEntry({ mode: 'incident', type: 'input', description: `Operator note added (${v.length} chars)` });
                }}
              />
            </StageContainer>
          )}

          {stage === 'compare' && (
            <StageContainer key="compare">
              <CompareConditions
                top={ranked.slice(0, 3).map((r) => ({ scenario: r.scenario, probability: r.probability }))}
                onChoose={handleCompareChoose}
                onBack={goBack}
              />
            </StageContainer>
          )}

          {stage === 'ultrasound' && (
            <StageContainer key="ultrasound">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-rig-text mb-2 text-center">
                One more check — use the ultrasound
              </h1>
              <p className="text-rig-dim text-center mb-4 text-sm max-w-xl mx-auto">
                Use the handheld ultrasound (the Butterfly device) to confirm.
              </p>
              <div className="max-w-3xl mx-auto">
                <GuidedUltrasound
                  onConfirm={handleUltrasoundConfirm}
                  onStepComplete={(idx, label) =>
                    addAuditEntry({ mode: 'incident', type: 'input', description: `Ultrasound step ${idx + 1}: ${label}` })
                  }
                />
              </div>
              <div className="mt-4 max-w-3xl mx-auto">
                <button onClick={goBack} className="text-xs uppercase tracking-widest text-rig-dim hover:text-rig-text flex items-center gap-1">
                  <ArrowLeft size={12} /> back
                </button>
              </div>
            </StageContainer>
          )}

          {stage === 'result' && topScenario && (
            <StageContainer key="result">
              <ResultView
                scenario={topScenario}
                probability={topProbability}
                regions={regions}
                onSeeTreatment={() => setStage('steps')}
                onConfirmAction={(act) => handleConfirmDecision(act)}
                onOverride={(act) => handleConfirmDecision(act, true)}
                onBack={goBack}
                rankedRest={ranked.slice(1, 4).map((r) => ({ s: r.scenario, p: r.probability }))}
              />
            </StageContainer>
          )}

          {stage === 'steps' && topScenario && (
            <StageContainer key="steps">
              <TreatmentSteps
                scenario={topScenario}
                manifest={inventoryManifest}
                onCitationLookup={onCitationLookup}
                onBack={() => setStage('result')}
                onComplete={() => {
                  addAuditEntry({
                    mode: 'incident',
                    type: 'decision',
                    description: 'Immediate treatment steps reviewed — moving to "When is help arriving?"',
                  });
                  setStage('when_help');
                }}
                onTreatmentFailure={(stepId, action) => {
                  addAuditEntry({
                    mode: 'incident',
                    type: 'decision',
                    description: `Treatment failure reported on step ${stepId} — operator chose: ${action}`,
                  });
                }}
                onEscalateEvacuation={() => {
                  addAuditEntry({
                    mode: 'incident',
                    type: 'decision',
                    description: 'Treatment failed — operator escalating to immediate evacuation (helicopter NOW)',
                  });
                  handleConfirmDecision('helicopter_now', true);
                }}
              />
            </StageContainer>
          )}

          {stage === 'when_help' && topScenario && (
            <StageContainer key="when_help">
              <WhenHelpArrives
                onBack={() => setStage('steps')}
                onSubmit={(hrs) => {
                  const effective = hrs === 'unknown' ? 24 : hrs;
                  setHelpInHours(effective);
                  addAuditEntry({
                    mode: 'incident',
                    type: 'input',
                    description: `Help arrival estimate: ${hrs === 'unknown' ? 'unknown (planning for 24h)' : `${hrs} hours`}`,
                  });
                  setStage('wait_plan');
                }}
              />
            </StageContainer>
          )}

          {stage === 'wait_plan' && topScenario && helpInHours !== null && (
            <StageContainer key="wait_plan">
              <WaitChecklist
                scenario={topScenario}
                helpInHours={helpInHours}
                startedAt={stageStartedAt}
                onBack={() => setStage('when_help')}
                onFinish={() => {
                  addAuditEntry({
                    mode: 'incident',
                    type: 'decision',
                    description: 'Waiting plan locked. Generating handoff.',
                  });
                  handleConfirmDecision(
                    topScenario.timeAction?.tier === 'tier4_onboard' ? 'treat_onboard' : 'helicopter_2h'
                  );
                }}
              />
            </StageContainer>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============ Subcomponents ============

function StageContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="pt-6 max-w-4xl mx-auto w-full"
    >
      {children}
    </motion.div>
  );
}

function stageLabel(s: Stage): string {
  switch (s) {
    case 'setup':
      return 'Step 1 — notify medic + confirm ETA';
    case 'body':
      return 'Step 2 — tap every painful spot';
    case 'questions':
      return 'Step 3 — yes / no questions';
    case 'compare':
      return 'Comparing top possibilities';
    case 'ultrasound':
      return 'Confirming with ultrasound';
    case 'result':
      return 'Likely cause + plan';
    case 'steps':
      return 'Immediate actions — one step at a time';
    case 'when_help':
      return 'When is help arriving?';
    case 'wait_plan':
      return 'While we wait for help';
  }
}

function ProgressBar({ stage, questionIdx, total }: { stage: Stage; questionIdx: number; total: number }) {
  let pct = 0;
  if (stage === 'setup') pct = 2;
  else if (stage === 'body') pct = 10;
  else if (stage === 'questions') pct = 22 + (questionIdx / total) * 20;
  else if (stage === 'compare') pct = 47;
  else if (stage === 'ultrasound') pct = 55;
  else if (stage === 'result') pct = 65;
  else if (stage === 'steps') pct = 80;
  else if (stage === 'when_help') pct = 90;
  else if (stage === 'wait_plan') pct = 100;
  return (
    <div className="px-6 pb-1 w-full">
      <div className="h-1.5 bg-rig-dim/20 rounded-full overflow-hidden">
        <motion.div className="h-full bg-rig-accent" animate={{ width: `${pct}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

function QuestionView({
  question,
  index,
  total,
  onAnswer,
  onBack,
  extraInfo,
  onExtraInfoChange,
}: {
  question: QuestionEntry | undefined;
  index: number;
  total: number;
  onAnswer: (a: Answer) => void;
  onBack: () => void;
  extraInfo: string;
  onExtraInfoChange: (v: string) => void;
}) {
  if (!question) {
    return (
      <div className="text-center text-rig-dim italic py-12">
        No questions available. Continue to the result.
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <div className="text-[11px] uppercase tracking-widest text-rig-dim font-mono mb-3">
        Question {index + 1} of {total}
      </div>
      <motion.h1
        key={question.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="text-2xl sm:text-3xl text-rig-text text-center mb-8 max-w-2xl leading-snug font-bold"
      >
        {question.text}
      </motion.h1>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
        <BigAnswer label="YES" tone="ok" onClick={() => onAnswer('yes')} icon={<CheckCircle size={28} />} />
        <BigAnswer label="NO" tone="critical" onClick={() => onAnswer('no')} icon={<AlertTriangle size={28} />} />
        <BigAnswer label="NOT SURE" tone="dim" onClick={() => onAnswer('skip')} icon={<HelpCircle size={28} />} />
      </div>

      {/* Extra info textarea */}
      <div className="w-full max-w-2xl mt-8 bg-rig-surface border border-rig-dim/30 rounded-md p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <FileText size={11} className="text-rig-accent" />
          <span className="text-[10px] uppercase tracking-widest text-rig-dim">
            Anything else you noticed?
          </span>
        </div>
        <textarea
          value={extraInfo}
          onChange={(e) => onExtraInfoChange(e.target.value)}
          placeholder="e.g. Apple Watch shows HR 112. They feel hot but I can't measure. They took ibuprofen 2h ago."
          rows={2}
          className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none resize-none"
        />
      </div>

      <button onClick={onBack} className="mt-6 px-4 py-2 text-xs uppercase tracking-widest text-rig-dim hover:text-rig-text flex items-center gap-1">
        <ArrowLeft size={12} /> back
      </button>
    </div>
  );
}

// === Setup stage — medic notification + ETA capture ===

const ETA_OPTIONS: Array<{ label: string; hours: number }> = [
  { label: 'Medic already here', hours: 0 },
  { label: '15–30 min', hours: 0.5 },
  { label: '1 hour', hours: 1 },
  { label: '2–3 hours', hours: 2.5 },
  { label: '4+ hours', hours: 5 },
  { label: 'Unknown / impossible', hours: 24 },
];

function SetupStage({
  capabilityProfile,
  medicNotified,
  upfrontEtaHours,
  evacConfirmed,
  onMedicNotified,
  onEtaChange,
  onEvacChange,
  onContinue,
}: {
  capabilityProfile?: CapabilityProfile | null;
  medicNotified: boolean;
  upfrontEtaHours: number;
  evacConfirmed: boolean;
  onMedicNotified: (v: boolean) => void;
  onEtaChange: (h: number) => void;
  onEvacChange: (v: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-[10px] uppercase tracking-widest text-rig-critical font-mono mb-2 flex items-center justify-center gap-2">
          <Bell size={11} className="animate-pulse" /> Incident Activated
        </div>
        <h1 className="text-3xl font-bold uppercase tracking-widest text-rig-text">Before we start</h1>
        <p className="text-sm text-rig-dim mt-1">Confirm notification and evacuation status first.</p>
      </div>

      {/* Medic notification */}
      <div className="bg-rig-surface border border-rig-dim/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={14} className="text-rig-critical" />
          <span className="text-[11px] uppercase tracking-widest text-rig-dim">Medic / Captain Notified?</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onMedicNotified(true)}
            className={clsx(
              'flex-1 py-3 rounded border-2 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2',
              medicNotified
                ? 'bg-rig-ok/20 border-rig-ok text-rig-ok'
                : 'bg-rig-surface border-rig-dim/40 text-rig-dim hover:border-rig-ok/50 hover:text-rig-ok'
            )}
          >
            <CheckCircle size={16} /> Yes — notified
          </button>
          <button
            onClick={() => onMedicNotified(false)}
            className={clsx(
              'flex-1 py-3 rounded border-2 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2',
              !medicNotified
                ? 'bg-rig-critical/20 border-rig-critical text-rig-critical'
                : 'bg-rig-surface border-rig-dim/40 text-rig-dim hover:border-rig-critical/50'
            )}
          >
            <AlertTriangle size={16} /> Not yet
          </button>
        </div>
        {!medicNotified && (
          <p className="text-[10px] text-rig-critical mt-2 flex items-center gap-1">
            <AlertTriangle size={9} /> Notify the captain or medic by radio before proceeding.
          </p>
        )}
      </div>

      {/* ETA picker */}
      <div className="bg-rig-surface border border-rig-dim/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-rig-accent" />
          <span className="text-[11px] uppercase tracking-widest text-rig-dim">Medic / Help ETA</span>
          {capabilityProfile && (
            <span className="ml-auto text-[9px] font-mono text-rig-dim">
              Profile: {capabilityProfile.expectedMedicEtaHours}h to {capabilityProfile.nearestEvac}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ETA_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => onEtaChange(opt.hours)}
              className={clsx(
                'py-2.5 px-3 rounded border text-xs font-bold uppercase tracking-wider text-center',
                upfrontEtaHours === opt.hours
                  ? 'bg-rig-accent/20 border-rig-accent text-rig-accent'
                  : 'bg-rig-bg border-rig-dim/30 text-rig-dim hover:border-rig-accent/50 hover:text-rig-text'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Evacuation capability */}
      <div className="bg-rig-surface border border-rig-dim/30 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Plane size={14} className="text-rig-accent" />
          <span className="text-[11px] uppercase tracking-widest text-rig-dim">Evacuation Available?</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onEvacChange(true)}
            className={clsx(
              'flex-1 py-3 rounded border-2 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2',
              evacConfirmed
                ? 'bg-rig-ok/20 border-rig-ok text-rig-ok'
                : 'bg-rig-surface border-rig-dim/40 text-rig-dim hover:border-rig-ok/50'
            )}
          >
            <Plane size={15} /> Helicopter / shore possible
          </button>
          <button
            onClick={() => onEvacChange(false)}
            className={clsx(
              'flex-1 py-3 rounded border-2 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2',
              !evacConfirmed
                ? 'bg-rig-critical/20 border-rig-critical text-rig-critical'
                : 'bg-rig-surface border-rig-dim/40 text-rig-dim hover:border-rig-critical/50'
            )}
          >
            <XCircle size={15} /> No evac — onboard only
          </button>
        </div>
        {capabilityProfile?.constraints && (
          <p className="text-[10px] text-rig-dim mt-2 flex items-center gap-1">
            <Radio size={9} /> {capabilityProfile.constraints}
          </p>
        )}
      </div>

      {/* Continue */}
      <button
        onClick={onContinue}
        className="w-full px-6 py-5 bg-rig-critical text-rig-text font-bold uppercase tracking-widest rounded-md hover:bg-rig-critical/85 flex items-center justify-center gap-3 text-lg glow-critical"
      >
        <AlertTriangle size={22} />
        Start Assessment
        <ArrowRight size={22} />
      </button>
      <p className="text-[10px] text-rig-dim text-center mt-2 font-mono">
        0 cloud calls · pre-compiled offline protocols
      </p>
    </div>
  );
}

function BigAnswer({ label, tone, onClick, icon }: { label: string; tone: 'ok' | 'critical' | 'dim'; onClick: () => void; icon: React.ReactNode }) {
  const palette = {
    ok: 'bg-rig-ok text-rig-bg hover:bg-rig-ok/85 border-rig-ok glow-ok',
    critical: 'bg-rig-critical text-rig-text hover:bg-rig-critical/85 border-rig-critical glow-critical',
    dim: 'bg-rig-surface text-rig-text hover:bg-rig-bg border-rig-dim/40',
  }[tone];
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 min-h-[120px] sm:min-h-[160px] py-6 px-4 rounded-lg border-2 text-xl font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-2',
        palette
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ResultView({
  scenario,
  probability,
  regions,
  onSeeTreatment,
  onConfirmAction,
  onOverride,
  onBack,
  rankedRest,
}: {
  scenario: Scenario;
  probability: number;
  regions: BodyRegion[];
  onSeeTreatment: () => void;
  onConfirmAction: (a: 'treat_onboard' | 'helicopter_now' | 'helicopter_2h' | 'shore_24h') => void;
  onOverride: (a: 'helicopter_now') => void;
  onBack: () => void;
  rankedRest: Array<{ s: Scenario; p: number }>;
}) {
  const ta = scenario.timeAction;
  const primaryAction =
    ta?.tier === 'tier1_immediate'
      ? 'helicopter_now'
      : ta?.tier === 'tier2_urgent'
      ? 'helicopter_2h'
      : ta?.tier === 'tier3_today'
      ? 'shore_24h'
      : 'treat_onboard';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-4">
        <div className="text-[11px] uppercase tracking-widest text-rig-dim font-mono mb-1 flex items-center justify-center gap-2">
          <Zap size={11} className="text-rig-ok" />
          Deterministic match · pre-compiled · 0 cloud calls
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-wider text-rig-text mt-2">
          {scenario.shortHeadline ?? scenario.condition}
        </h1>
        {scenario.layExplanation && (
          <p className="text-sm text-rig-text mt-2 max-w-2xl mx-auto leading-relaxed">{scenario.layExplanation}</p>
        )}
        <div className="text-xs text-rig-dim mt-2 font-mono">
          {Math.round(probability * 100)}% confidence · based on {regions.length} location{regions.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* TIER + time action */}
      {ta && <EmergencyTierBadge action={ta} />}

      {/* Big action button */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onSeeTreatment}
          className="flex-1 px-5 py-5 bg-rig-accent text-rig-bg font-bold uppercase tracking-widest rounded-md glow-accent hover:bg-rig-accent/85 flex items-center justify-center gap-2 text-base"
        >
          Show step-by-step <ArrowRight size={18} />
        </button>
        <button
          onClick={() => onConfirmAction(primaryAction)}
          className={clsx(
            'flex-1 px-5 py-5 rounded-md font-bold uppercase tracking-widest text-base flex items-center justify-center gap-2',
            primaryAction === 'treat_onboard'
              ? 'bg-rig-ok hover:bg-rig-ok/85 text-rig-bg'
              : 'bg-rig-critical hover:bg-rig-critical/85 text-rig-text'
          )}
        >
          <CheckCircle size={18} />
          Confirm {ta?.label ?? 'plan'}
        </button>
      </div>

      {/* Override + back */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onOverride('helicopter_now')}
          className="text-[11px] uppercase tracking-widest text-rig-critical hover:text-rig-critical/80 underline"
        >
          Captain override — escalate to HELI NOW
        </button>
        <button onClick={onBack} className="ml-auto text-[11px] uppercase tracking-widest text-rig-dim hover:text-rig-text flex items-center gap-1">
          <ArrowLeft size={11} /> back
        </button>
      </div>

      {/* Other possibilities */}
      {rankedRest.length > 0 && (
        <details className="mt-4 bg-rig-surface/40 border border-rig-dim/20 rounded p-3">
          <summary className="text-[11px] uppercase tracking-widest text-rig-dim cursor-pointer">
            See in detail — other possibilities
          </summary>
          <ul className="mt-2 space-y-1.5">
            {rankedRest.map((r) => (
              <li key={r.s.id} className="text-xs text-rig-text flex items-start gap-2">
                <span className="font-mono text-rig-accent w-12 shrink-0">{Math.round(r.p * 100)}%</span>
                <div className="flex-1 min-w-0">
                  <div>{r.s.condition}</div>
                  {r.s.layExplanation && <div className="text-[10px] text-rig-dim">{r.s.layExplanation}</div>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

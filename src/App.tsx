import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type {
  AppMode,
  ArchitectureCounters,
  AuditEntry,
  Case,
  InventoryPreset,
  Scenario,
} from './types';
import { getVesselForPreset } from './data/vessel';
import { getInventoryForPreset } from './data/equipment';
import { useEnvironment } from './hooks/useEnvironment';
import { useMotion } from './hooks/useMotion';
import { useSound } from './hooks/useSound';
import { useKeyboard } from './hooks/useKeyboard';
import { useGyro } from './hooks/useGyro';
import { StatusBar } from './components/StatusBar';
import { ArchitecturePanel } from './components/ArchitecturePanel';
import { EnvironmentControls } from './components/EnvironmentControls';
import { DeployMode } from './components/DeployMode';
import { IncidentMode } from './components/IncidentMode';
import { HandoffMode } from './components/HandoffMode';

const CASES_STORAGE_KEY = 'sentinel-cases';
const SAT_TARGET_KEY = 'sentinel-sat-target';
const OPERATOR_MODE_KEY = 'sentinel-operator-mode';
const SAT_WINDOW_INITIAL = 47 * 60 + 13; // 47:13
const SAT_WINDOW_NEXT = 1 * 3600 + 23 * 60; // 1:23:00

/**
 * Persistent satellite-window countdown: stores the wall-clock target in localStorage
 * so the timer survives page reloads. Real low-Earth-orbit sat passes are typically
 * 10-15 min apart; we use a longer demo cadence.
 */
function loadOrInitSatTarget(): number {
  try {
    const raw = localStorage.getItem(SAT_TARGET_KEY);
    if (raw) {
      const ts = parseInt(raw, 10);
      if (Number.isFinite(ts) && ts > Date.now() - 24 * 3600_000) {
        return ts;
      }
    }
  } catch {}
  const next = Date.now() + SAT_WINDOW_INITIAL * 1000;
  try { localStorage.setItem(SAT_TARGET_KEY, String(next)); } catch {}
  return next;
}

function rolloverSatTarget(): number {
  const next = Date.now() + SAT_WINDOW_NEXT * 1000;
  try { localStorage.setItem(SAT_TARGET_KEY, String(next)); } catch {}
  return next;
}

function makeCaseId(): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(Math.random() * 9) + 1;
  const now = new Date();
  return `CASE-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${letter}${num}`;
}

function loadCases(): Case[] {
  try {
    const raw = localStorage.getItem(CASES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Case[];
  } catch {
    return [];
  }
}

function persistCases(cases: Case[]) {
  try {
    localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(cases));
  } catch {
    // ignore
  }
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('deploy');
  const [inventoryPreset, setInventoryPreset] = useState<InventoryPreset>('offshore');
  const [compiledScenarios, setCompiledScenarios] = useState<Scenario[]>([]);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [cloudCalls, setCloudCalls] = useState(0);
  const [resolvedCases, setResolvedCases] = useState<Case[]>(() => loadCases());
  const [caseId, setCaseId] = useState<string>(() => makeCaseId());
  const [satTargetTs, setSatTargetTs] = useState<number>(() => loadOrInitSatTarget());
  const [satelliteCountdownSec, setSatelliteCountdownSec] = useState<number>(() =>
    Math.max(0, Math.round((loadOrInitSatTarget() - Date.now()) / 1000))
  );
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [fastForwardKey, setFastForwardKey] = useState(0);
  const [operatorMode, setOperatorMode] = useState<boolean>(() => {
    try { return localStorage.getItem(OPERATOR_MODE_KEY) === '1'; } catch { return false; }
  });

  const incidentRequestRef = useRef<number>(0);

  const vessel = useMemo(() => getVesselForPreset(inventoryPreset), [inventoryPreset]);
  const inventory = useMemo(() => getInventoryForPreset(inventoryPreset), [inventoryPreset]);

  const envApi = useEnvironment();
  const { env, toggleRoughSeas, toggleNightMode, toggleGloved, cycleOneHanded, setMotionLevel, stressTest } = envApi;
  const sound = useSound();

  useMotion(setMotionLevel);
  const gyro = useGyro();
  // If real gyro reports motion, propagate to env (auto-trip rough seas).
  useEffect(() => {
    if (gyro.motionLevel > 0) setMotionLevel(gyro.motionLevel);
  }, [gyro.motionLevel, setMotionLevel]);

  // Real-clock satellite countdown — persists across reloads
  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((satTargetTs - Date.now()) / 1000));
      if (remaining <= 0) {
        sound.playSatLink();
        const next = rolloverSatTarget();
        setSatTargetTs(next);
        setSatelliteCountdownSec(Math.round((next - Date.now()) / 1000));
      } else {
        setSatelliteCountdownSec(remaining);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [satTargetTs, sound]);

  // Persist operator-mode preference
  useEffect(() => {
    try { localStorage.setItem(OPERATOR_MODE_KEY, operatorMode ? '1' : '0'); } catch {}
  }, [operatorMode]);

  const addAuditEntry = useCallback(
    (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
      const full: AuditEntry = {
        ...entry,
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
      };
      setAuditLog((prev) => [...prev, full]);
    },
    []
  );

  const architecture: ArchitectureCounters = useMemo(
    () => ({
      protocolsCompiled: compiledScenarios.length,
      graphNodes:
        compiledScenarios.reduce((sum, s) => sum + s.treatment.length + s.diagnosticSteps.length, 0) +
        (compiledScenarios.length > 0 ? 1 + compiledScenarios.length : 0),
      runtimeAI: 0,
      cloudCalls,
      auditEntries: auditLog.length,
    }),
    [compiledScenarios, cloudCalls, auditLog.length]
  );

  const handleResetDeploy = useCallback(() => {
    setMode('deploy');
    setCurrentCase(null);
    setAuditLog([]);
    setCaseId(makeCaseId());
  }, []);

  const handleHardReset = useCallback(() => {
    setMode('deploy');
    setCompiledScenarios([]);
    setCurrentCase(null);
    setAuditLog([]);
    setCloudCalls(0);
    setCaseId(makeCaseId());
  }, []);

  const handleTogglePreset = useCallback(() => {
    setInventoryPreset((p) => (p === 'offshore' ? 'polar' : 'offshore'));
    handleHardReset();
  }, [handleHardReset]);

  const handleSelectPreset = useCallback(
    (p: InventoryPreset) => {
      if (p === inventoryPreset) return;
      handleHardReset();
      setInventoryPreset(p);
    },
    [inventoryPreset, handleHardReset]
  );

  const handleTriggerIncident = useCallback(() => {
    if (mode !== 'deploy' || compiledScenarios.length === 0) return;
    incidentRequestRef.current += 1;
    setMode('incident');
    sound.playAlert();
  }, [mode, compiledScenarios.length, sound]);

  const handleFastForwardHandoff = useCallback(() => {
    if (mode !== 'incident') return;
    setFastForwardKey((k) => k + 1);
  }, [mode]);

  const handleConfirmCase = useCallback(
    (resolvedCase: Case) => {
      setCurrentCase(resolvedCase);
      setMode('handoff');
      if (resolvedCase.recommendation?.decision === 'evacuate') sound.playAlert();
      else sound.playSuccess();
    },
    [sound]
  );

  const handleResolveAndReset = useCallback(() => {
    if (currentCase) {
      const resolved: Case = { ...currentCase, resolved: true };
      const updated = [...resolvedCases, resolved];
      setResolvedCases(updated);
      persistCases(updated);
    }
    handleResetDeploy();
  }, [currentCase, resolvedCases, handleResetDeploy]);

  useKeyboard({
    onResetDeploy: handleResetDeploy,
    onTriggerIncident: handleTriggerIncident,
    onFastForwardHandoff: handleFastForwardHandoff,
    onTogglePreset: handleTogglePreset,
    onToggleRoughSeas: toggleRoughSeas,
    onToggleNightMode: toggleNightMode,
    onToggleGloved: toggleGloved,
    onCycleOneHanded: cycleOneHanded,
    onStressTest: stressTest,
    onShowShortcuts: () => setShowShortcuts((s) => !s),
    onToggleMute: sound.toggleMute,
    onEscape: () => setShowShortcuts(false),
  });

  const rootClasses = clsx(
    'relative h-screen w-screen overflow-hidden text-rig-text bg-rig-bg scanlines',
    env.nightMode && 'night-theme',
    env.gloved && 'gloved'
  );

  return (
    <div className={rootClasses}>
      <div className={clsx('absolute inset-0 flex flex-col', env.roughSeas && 'rough-seas')}>
        <StatusBar
          vessel={vessel}
          caseId={caseId}
          satelliteCountdownSec={satelliteCountdownSec}
          mode={mode}
          operatorMode={operatorMode}
        />

        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-w-0 overflow-y-auto relative">
            {mode === 'deploy' && (
              <DeployMode
                key={inventoryPreset}
                vessel={vessel}
                inventory={inventory}
                preset={inventoryPreset}
                onPresetChange={handleSelectPreset}
                compiledScenarios={compiledScenarios}
                onCompiled={(scenarios, source) => {
                  setCompiledScenarios(scenarios);
                  setCloudCalls((c) => c + (source === 'llm' ? 1 : 0));
                  addAuditEntry({
                    mode: 'deploy',
                    type: 'llm_call',
                    description: `Protocol compilation (${source === 'llm' ? 'LLM' : 'fallback'}) — ${scenarios.length} scenarios`,
                    data: { scenarios: scenarios.map((s) => s.condition) },
                  });
                }}
                onTriggerIncident={handleTriggerIncident}
                addAuditEntry={addAuditEntry}
              />
            )}
            {mode === 'incident' && (
              <IncidentMode
                key={`${caseId}_${incidentRequestRef.current}`}
                caseId={caseId}
                vessel={vessel}
                compiledScenarios={compiledScenarios}
                hasThermometer={inventory.some((e) => e.id === 'ir_thermometer')}
                addAuditEntry={addAuditEntry}
                onConfirm={handleConfirmCase}
                fastForwardKey={fastForwardKey}
                oneHanded={env.oneHanded}
              />
            )}
            {mode === 'handoff' && currentCase && (
              <HandoffMode
                vessel={vessel}
                kase={currentCase}
                auditLog={auditLog}
                satelliteCountdownSec={satelliteCountdownSec}
                addAuditEntry={addAuditEntry}
                onCloudCall={() => setCloudCalls((c) => c + 1)}
                onReset={handleResolveAndReset}
              />
            )}
          </main>

          {!operatorMode && (
          <aside className="w-72 shrink-0 border-l border-rig-dim/20 bg-rig-panel flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ArchitecturePanel
                counters={architecture}
                scenarios={compiledScenarios}
                casesThisVoyage={resolvedCases.length}
                preset={inventoryPreset}
              />
            </div>
            <div className="shrink-0">
              <EnvironmentControls envApi={envApi} muted={sound.muted} onToggleMute={sound.toggleMute} />
            </div>
          </aside>
          )}
        </div>
      </div>

      {/* Operator/Demo dashboard toggle — fixed corner button */}
      <button
        onClick={() => setOperatorMode((m) => !m)}
        title={operatorMode ? 'Show YC demo dashboard (architecture panel, counters)' : 'Switch to operator view (hide demo chrome)'}
        className="fixed bottom-3 right-3 z-30 px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-md border border-rig-dim/40 bg-rig-bg/90 backdrop-blur hover:bg-rig-surface text-rig-text shadow-lg"
      >
        {operatorMode ? 'SHOW DEMO DASHBOARD' : 'OPERATOR VIEW'}
      </button>

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const items: Array<[string, string]> = [
    ['1', 'Reset to Deploy'],
    ['2', 'Trigger Incident'],
    ['3', 'Fast-forward to Handoff'],
    ['P', 'Toggle Offshore / Polar preset'],
    ['R', 'Toggle Rough Seas'],
    ['N', 'Toggle Night Vision'],
    ['G', 'Toggle Gloved Hands'],
    ['H', 'Cycle One-Handed (off → R → L)'],
    ['S', 'Stress Test (all envs)'],
    ['M', 'Mute / Unmute sounds'],
    ['?', 'Show this overlay'],
    ['Esc', 'Close overlay'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-rig-panel border border-rig-dim/40 rounded-md p-6 w-[480px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs tracking-widest uppercase text-rig-dim mb-4">Keyboard Shortcuts</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm">
          {items.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="inline-block min-w-[2.25rem] text-center px-2 py-0.5 border border-rig-dim/40 rounded text-rig-accent">
                {key}
              </span>
              <span className="text-rig-text">{label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-rig-surface border border-rig-dim/30 rounded text-xs uppercase tracking-widest hover:bg-rig-bg"
        >
          Close [Esc]
        </button>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type {
  AppMode,
  ArchitectureCounters,
  AuditEntry,
  CapabilityProfile,
  Case,
  InventoryPreset,
  Scenario,
} from './types';
import type { InventoryManifest } from './types/inventory';
import { loadManifest, saveManifest, addInventoryAudit, makeAuditId } from './lib/inventory/db';
import { getVesselForPreset } from './data/vessel';
import { getInventoryForPreset } from './data/equipment';
import { getFallbackScenarios } from './data/protocols';
import { loadCapabilityProfile, saveCapabilityProfile, defaultProfileForPreset } from './lib/capability';
import {
  loadVessels,
  saveVessel,
  getOrInitVessel,
  makeVesselId,
  VESSEL_ID_OFFSHORE,
  VESSEL_ID_POLAR,
  type VesselRecord,
} from './lib/vessels';
import { compileProtocols } from './lib/compileProtocols';
import { ModeSelector, type AppSessionMode } from './components/ModeSelector';
import { VesselPicker } from './components/VesselPicker';
import { CommandCenter } from './components/CommandCenter';
import { OnboardingWizard } from './components/OnboardingWizard';
import { OnboardingHome, type OnboardingAuditKind } from './components/OnboardingHome';
import { EquipmentAuditScreen } from './components/EquipmentAuditScreen';
import { MedicineAuditScreen } from './components/MedicineAuditScreen';
import { useEnvironment } from './hooks/useEnvironment';
import { useMotion } from './hooks/useMotion';
import { useSound } from './hooks/useSound';
import { useKeyboard } from './hooks/useKeyboard';
import { useGyro } from './hooks/useGyro';
import { useGyroStabilization } from './hooks/useGyroStabilization';
import { StabilizedContainer } from './components/StabilizedContainer';
import { StatusBar } from './components/StatusBar';
import { ArchitecturePanel } from './components/ArchitecturePanel';
import { EnvironmentControls } from './components/EnvironmentControls';
import { DeployMode } from './components/DeployMode';
import { IncidentMode } from './components/IncidentMode';
import { HandoffMode } from './components/HandoffMode';

const CASES_STORAGE_KEY = 'sentinel-cases';
const SAT_TARGET_KEY = 'sentinel-sat-target';
const OPERATOR_MODE_KEY = 'sentinel-operator-mode';
const SAT_WINDOW_INITIAL = 47 * 60 + 13;
const SAT_WINDOW_NEXT = 1 * 3600 + 23 * 60;

function loadOrInitSatTarget(): number {
  try {
    const raw = localStorage.getItem(SAT_TARGET_KEY);
    if (raw) {
      const ts = parseInt(raw, 10);
      if (Number.isFinite(ts) && ts > Date.now() - 24 * 3600_000) return ts;
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
  } catch { return []; }
}

function persistCases(cases: Case[]) {
  try { localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(cases)); } catch {}
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
  const [inventoryManifest, setInventoryManifest] = useState<InventoryManifest | null>(null);
  const [appSession, setAppSession] = useState<AppSessionMode | null>(null);
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [demoOffline, setDemoOffline] = useState(false);
  const [capabilityProfile, setCapabilityProfile] = useState<CapabilityProfile | null>(() => loadCapabilityProfile());
  const [showWizard, setShowWizard] = useState(false);
  /** In onboarding mode, which screen of the hub is showing. */
  const [onboardingView, setOnboardingView] = useState<'home' | 'equipment-audit' | 'medicine-audit'>('home');
  /** Vessel registry — persisted to localStorage. */
  const [vessels, setVessels] = useState<VesselRecord[]>(() => loadVessels());
  /** Which vessel is active in the current session. */
  const [activeVesselId, setActiveVesselId] = useState<string | null>(null);
  /** Show vessel picker before CommandCenter in demo/live. */
  const [showVesselPicker, setShowVesselPicker] = useState(false);
  /** Whether background protocol compilation is running. */
  const [compilingInBackground, setCompilingInBackground] = useState(false);

  const isDemo = appSession === 'demo';
  const isOnboarding = appSession === 'onboarding';

  const incidentRequestRef = useRef<number>(0);

  useEffect(() => {
    loadManifest().then((m) => { if (m) setInventoryManifest(m); }).catch(() => {});
  }, []);

  // Seed the registry with the two built-in vessels on first launch so they
  // always appear in VesselPicker even before the operator runs onboarding.
  useEffect(() => {
    const existing = loadVessels();
    const hasOffshore = existing.some((v) => v.id === VESSEL_ID_OFFSHORE);
    const hasPolar = existing.some((v) => v.id === VESSEL_ID_POLAR);
    if (!hasOffshore) saveVessel(getOrInitVessel('offshore', 'MV NORTHERN STAR'));
    if (!hasPolar) saveVessel(getOrInitVessel('polar', 'HALLEY VI'));
    setVessels(loadVessels());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Switch to a saved vessel: load its manifest + compiled protocols. */
  const handleVesselSelect = (id: string) => {
    const v = vessels.find((x) => x.id === id);
    if (!v) return;
    setActiveVesselId(id);
    handleSelectPreset(v.preset);
    if (v.capabilityProfile) {
      setCapabilityProfile(v.capabilityProfile);
      saveCapabilityProfile(v.capabilityProfile);
    }
    if (v.manifest) {
      setInventoryManifest(v.manifest);
      void saveManifest(v.manifest);
    }
    if (v.compiledScenarios && v.compiledScenarios.length > 0) {
      setCompiledScenarios(v.compiledScenarios);
    }
    setShowVesselPicker(false);
    setShowCommandCenter(true);
  };

  /** Create a new custom vessel and make it active. */
  const handleVesselCreate = (name: string, preset: InventoryPreset) => {
    const now = new Date().toISOString();
    const rec: VesselRecord = {
      id: makeVesselId(),
      name,
      preset,
      capabilityProfile: capabilityProfile,
      manifest: null,
      compiledScenarios: null,
      compiledAt: null,
      lastUpdated: now,
      createdAt: now,
    };
    saveVessel(rec);
    setVessels(loadVessels());
    setActiveVesselId(rec.id);
    handleSelectPreset(preset);
  };

  /** Persist a manifest to the active vessel record + trigger background compile. */
  const handleSaveVesselManifest = (manifest: InventoryManifest) => {
    setInventoryManifest(manifest);
    void saveManifest(manifest);
    if (!activeVesselId) return;
    const now = new Date().toISOString();
    const v = vessels.find((x) => x.id === activeVesselId);
    if (!v) return;
    const updated: VesselRecord = { ...v, manifest, lastUpdated: now };
    saveVessel(updated);
    setVessels(loadVessels());

    // Background protocol compilation — fires and forgets; result stored in registry
    if (!compilingInBackground) {
      setCompilingInBackground(true);
      void compileProtocols(vessel, inventory, capabilityProfile, v.preset)
        .then((result) => {
          setCompiledScenarios(result.scenarios);
          const withProtocols: VesselRecord = {
            ...updated,
            compiledScenarios: result.scenarios,
            compiledAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          };
          saveVessel(withProtocols);
          setVessels(loadVessels());
        })
        .finally(() => setCompilingInBackground(false));
    }
  };

  const vessel = useMemo(() => getVesselForPreset(inventoryPreset), [inventoryPreset]);
  const inventory = useMemo(() => getInventoryForPreset(inventoryPreset), [inventoryPreset]);

  const envApi = useEnvironment();
  const { env, toggleRoughSeas, toggleNightMode, toggleGloved, cycleOneHanded, setMotionLevel, stressTest } = envApi;
  const sound = useSound();

  useMotion(setMotionLevel);
  const gyro = useGyro();
  const stab = useGyroStabilization(true);
  useEffect(() => {
    if (gyro.motionLevel > 0) setMotionLevel(gyro.motionLevel);
  }, [gyro.motionLevel, setMotionLevel]);

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

  useEffect(() => {
    try { localStorage.setItem(OPERATOR_MODE_KEY, operatorMode ? '1' : '0'); } catch {}
  }, [operatorMode]);

  const handleManifestImported = useCallback((manifest: InventoryManifest) => {
    setInventoryManifest(manifest);
    void saveManifest(manifest);
    void addInventoryAudit({
      id: makeAuditId(),
      timestamp: new Date().toISOString(),
      action: 'import',
      source: manifest.importSource,
      description: `Inventory imported via ${manifest.importSource} — ${manifest.medications.length} medications, ${manifest.devices.length} devices`,
    });
  }, []);

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
    setShowCommandCenter(true);
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

  const triggerIncidentNow = useCallback(() => {
    // Ensure protocols are compiled (use fallback if not yet)
    if (compiledScenarios.length === 0) {
      const fb = getFallbackScenarios(inventoryPreset);
      setCompiledScenarios(fb);
      setCloudCalls(0);
    }
    incidentRequestRef.current += 1;
    setMode('incident');
    setShowCommandCenter(false);
    sound.playAlert();
  }, [compiledScenarios.length, inventoryPreset, sound]);

  const handleTriggerIncident = useCallback(() => {
    if (mode !== 'deploy' || compiledScenarios.length === 0) return;
    incidentRequestRef.current += 1;
    setMode('incident');
    setShowCommandCenter(false);
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

  // Full-screen mode picker before any session
  if (appSession === null) {
    return (
      <ModeSelector
        onSelect={(m) => {
          setAppSession(m);
          setMode('deploy');
          if (m === 'onboarding') {
            if (!capabilityProfile) setShowWizard(true);
            setShowCommandCenter(false);
          } else {
            // Demo/live: show vessel picker if any saved; otherwise seed defaults
            if (vessels.length > 0) {
              setShowVesselPicker(true);
              setShowCommandCenter(false);
            } else {
              if (!capabilityProfile) {
                const def = defaultProfileForPreset(inventoryPreset);
                setCapabilityProfile(def);
                saveCapabilityProfile(def);
              }
              setShowCommandCenter(true);
            }
          }
        }}
      />
    );
  }

  // Vessel picker — shown after mode select in demo/live when vessels exist
  if (showVesselPicker && appSession !== 'onboarding') {
    return (
      <VesselPicker
        vessels={vessels}
        sessionMode={appSession!}
        onSelect={(v) => handleVesselSelect(v.id)}
        onGoToOnboarding={() => {
          setShowVesselPicker(false);
          setAppSession('onboarding');
          if (!capabilityProfile) setShowWizard(true);
          setShowCommandCenter(false);
        }}
      />
    );
  }

  // Onboarding wizard (forced, or operator-triggered from anywhere)
  if (showWizard) {
    return (
      <OnboardingWizard
        initialPreset={inventoryPreset}
        initial={capabilityProfile}
        onComplete={(profile) => {
          setCapabilityProfile(profile);
          saveCapabilityProfile(profile);
          addAuditEntry({
            mode: 'deploy',
            type: 'input',
            description: `Capability profile saved — ${profile.siteType} · ${profile.region} · evac ${profile.evacPossible ? `${profile.expectedMedicEtaHours}h to ${profile.nearestEvac}` : 'NOT possible'} · comms ${profile.comms}`,
            data: profile,
          });
          setShowWizard(false);
          // In onboarding mode, return to the hub. Otherwise (e.g. operator
          // hit "Reconfigure" from CommandCenter in demo/live), go back to
          // CommandCenter.
          if (!isOnboarding) {
            setShowCommandCenter(true);
          }
        }}
        onCancel={capabilityProfile ? () => setShowWizard(false) : undefined}
      />
    );
  }

  // Onboarding hub
  if (isOnboarding && onboardingView === 'home' && !showCommandCenter && mode === 'deploy' && capabilityProfile) {
    return (
      <OnboardingHome
        profile={capabilityProfile}
        dataSource="live"
        vessels={vessels}
        activeVesselId={activeVesselId}
        equipmentCount={inventoryManifest?.devices.length ?? 0}
        medicineCount={inventoryManifest?.medications.length ?? 0}
        onVesselSelect={handleVesselSelect}
        onVesselCreate={handleVesselCreate}
        onEditProfile={() => setShowWizard(true)}
        onStartAudit={(kind: OnboardingAuditKind) => {
          setOnboardingView(kind === 'equipment' ? 'equipment-audit' : 'medicine-audit');
        }}
        onContinueToOperations={() => {
          // Update the active vessel's capabilityProfile before continuing
          if (activeVesselId) {
            const v = vessels.find((x) => x.id === activeVesselId);
            if (v && capabilityProfile) {
              saveVessel({ ...v, capabilityProfile, lastUpdated: new Date().toISOString() });
              setVessels(loadVessels());
            }
          }
          setShowCommandCenter(true);
        }}
      />
    );
  }

  // Equipment audit screen
  if (isOnboarding && onboardingView === 'equipment-audit' && capabilityProfile) {
    return (
      <EquipmentAuditScreen
        vesselName={vessel.name}
        currentManifest={inventoryManifest}
        onSaved={(manifest) => {
          handleSaveVesselManifest(manifest);
          addAuditEntry({
            mode: 'deploy',
            type: 'input',
            description: `Equipment audit saved — ${manifest.devices.length} devices`,
            data: { devices: manifest.devices.map((d) => d.name) },
          });
          setOnboardingView('home');
        }}
        onBack={() => setOnboardingView('home')}
      />
    );
  }

  // Medicine audit screen
  if (isOnboarding && onboardingView === 'medicine-audit' && capabilityProfile) {
    return (
      <MedicineAuditScreen
        preset={inventoryPreset}
        vesselName={vessel.name}
        currentManifest={inventoryManifest}
        onSaved={(manifest) => {
          handleSaveVesselManifest(manifest);
          addAuditEntry({
            mode: 'deploy',
            type: 'input',
            description: `Medicine audit saved — ${manifest.medications.length} items`,
            data: { medications: manifest.medications.map((m) => m.genericName) },
          });
          setOnboardingView('home');
        }}
        onBack={() => setOnboardingView('home')}
      />
    );
  }

  return (
    <div className={rootClasses}>
      <div className="absolute inset-0 flex flex-col">
        <StatusBar
          vessel={vessel}
          caseId={caseId}
          satelliteCountdownSec={satelliteCountdownSec}
          mode={mode}
          operatorMode={operatorMode}
          inventoryLoaded={inventoryManifest !== null}
          isDemo={isDemo}
          demoOffline={demoOffline}
          onToggleDemoOffline={() => setDemoOffline((d) => !d)}
        />

        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-w-0 overflow-y-auto relative">
            <StabilizedContainer
              compensationDeg={stab.compensationDeg}
              compensationY={stab.compensationY}
              gyroActive={stab.streaming}
              simulatedRoughSeas={env.roughSeas}
            >

            {/* Command center — post-mode landing screen */}
            {showCommandCenter && mode === 'deploy' && (
              <CommandCenter
                sessionMode={appSession}
                vessel={vessel}
                inventoryManifest={inventoryManifest}
                compiledProtocols={compiledScenarios.length}
                isOnline={navigator.onLine}
                demoOffline={demoOffline}
                capabilityProfile={capabilityProfile}
                onReconfigureProfile={() => setShowWizard(true)}
                onGoToAudit={() => setShowCommandCenter(false)}
                onEmergency={triggerIncidentNow}
              />
            )}

            {!showCommandCenter && mode === 'deploy' && (
              <DeployMode
                key={inventoryPreset}
                vessel={vessel}
                inventory={inventory}
                preset={inventoryPreset}
                sessionMode={appSession}
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
                inventoryManifest={inventoryManifest}
                onManifestImported={handleManifestImported}
                onBackToCommand={() => {
                  if (isOnboarding) {
                    setOnboardingView('home');
                  } else {
                    setShowCommandCenter(true);
                  }
                }}
                capabilityProfile={capabilityProfile}
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
                inventoryManifest={inventoryManifest}
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
            </StabilizedContainer>
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

      {/* Motion compensation status — only when sensors streaming or simulation active */}
      {(stab.streaming || env.roughSeas) && (
        <div className="fixed top-14 right-3 z-30 px-2.5 py-1.5 rounded-md border border-rig-accent/40 bg-rig-bg/90 backdrop-blur shadow-lg flex items-center gap-1.5">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-rig-accent pulse-dot" />
          </span>
          <span className="text-[9px] uppercase tracking-widest font-bold text-rig-accent">
            {stab.streaming ? 'Gyro Stabilized' : 'Motion Sim'}
          </span>
          {stab.streaming && (
            <span className="text-[9px] font-mono text-rig-dim">
              {stab.compensationDeg >= 0 ? '+' : ''}{stab.compensationDeg.toFixed(1)}°
            </span>
          )}
        </div>
      )}
      {stab.supported && stab.needsPermission && stab.permissionState !== 'granted' && (
        <button
          onClick={() => void stab.enable()}
          className="fixed top-14 right-3 z-30 px-2.5 py-1.5 rounded-md border border-rig-accent/50 bg-rig-bg/90 backdrop-blur shadow-lg text-[9px] uppercase tracking-widest font-bold text-rig-accent hover:bg-rig-accent/10"
        >
          Enable Motion Sensors
        </button>
      )}

      {/* Operator/Demo dashboard toggle */}
      <button
        onClick={() => setOperatorMode((m) => !m)}
        title={operatorMode ? 'Show demo dashboard' : 'Switch to operator view'}
        className="fixed bottom-3 right-3 z-30 px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-md border border-rig-dim/40 bg-rig-bg/90 backdrop-blur hover:bg-rig-surface text-rig-text shadow-lg"
      >
        {operatorMode ? 'SHOW DEMO DASHBOARD' : 'OPERATOR VIEW'}
      </button>

      {/* Change mode button */}
      <button
        onClick={() => { setAppSession(null); setShowCommandCenter(false); setDemoOffline(false); }}
        className="fixed bottom-3 left-3 z-30 px-3 py-2 text-[10px] uppercase tracking-widest rounded-md border border-rig-dim/30 bg-rig-bg/90 backdrop-blur hover:bg-rig-surface text-rig-dim hover:text-rig-text shadow-lg"
      >
        {isDemo ? '⬡ Training' : isOnboarding ? '⬡ Onboarding' : '⬡ Live'} · change
      </button>

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const items: Array<[string, string]> = [
    ['1', 'Reset to Command Center'],
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

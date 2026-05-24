import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Anchor,
  Bluetooth,
  CheckCircle,
  Pill,
  Radio,
  Snowflake,
  Stethoscope,
  Hourglass,
  AlertTriangle,
  Activity,
  XCircle,
} from 'lucide-react';
import type { AuditEntry, Equipment, InventoryPreset, Scenario, Vessel } from '../types';
import { callClaude } from '../lib/anthropic';
import { PROTOCOL_COMPILATION_PROMPT } from '../lib/prompts';
import { getFallbackScenarios } from '../data/protocols';
import { VALID_CITATION_IDS } from '../data/citations';
import { DecisionGraph } from './DecisionGraph';
import { useBluetoothScanner } from '../hooks/useBluetoothScanner';
import { useNfcReader } from '../hooks/useNfcReader';
import { useDevice } from '../hooks/useDevice';
import { WifiScanPanel } from './WifiScanPanel';

type Stage = 'idle' | 'scanning' | 'scanned' | 'compiling' | 'compiled';

type Props = {
  vessel: Vessel;
  inventory: Equipment[];
  preset: InventoryPreset;
  onPresetChange: (p: InventoryPreset) => void;
  compiledScenarios: Scenario[];
  onCompiled: (scenarios: Scenario[], source: 'llm' | 'fallback') => void;
  onTriggerIncident: () => void;
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
};

export function DeployMode({
  vessel,
  inventory,
  preset,
  onPresetChange,
  compiledScenarios,
  onCompiled,
  onTriggerIncident,
  addAuditEntry,
}: Props) {
  const [stage, setStage] = useState<Stage>(compiledScenarios.length > 0 ? 'compiled' : 'idle');
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const auditedScanRef = useRef(false);
  const auditedCompileRef = useRef(false);

  const device = useDevice();
  const bt = useBluetoothScanner();
  const nfc = useNfcReader();

  const devices = inventory.filter((e) => e.category === 'device');
  const drugs = inventory.filter((e) => e.category === 'drug');
  const totalCount = inventory.length;

  // Reset on preset change
  useEffect(() => {
    if (compiledScenarios.length === 0) {
      setStage('idle');
      setDiscoveredCount(0);
      setUsedFallback(false);
      setCompileError(null);
      auditedScanRef.current = false;
      auditedCompileRef.current = false;
    }
  }, [preset, compiledScenarios.length]);

  // Drive scanning stage animation
  useEffect(() => {
    if (stage !== 'scanning') return;
    setDiscoveredCount(0);
    const total = totalCount;
    const interval = setInterval(() => {
      setDiscoveredCount((c) => {
        const next = Math.min(total, c + Math.max(1, Math.floor(total / 24)));
        if (next >= total) {
          clearInterval(interval);
          setTimeout(() => setStage('scanned'), 350);
        }
        return next;
      });
    }, 110);
    return () => clearInterval(interval);
  }, [stage, totalCount]);

  // One-shot audit log for scan completion
  useEffect(() => {
    if (stage === 'scanned' && !auditedScanRef.current) {
      auditedScanRef.current = true;
      addAuditEntry({
        mode: 'deploy',
        type: 'input',
        description: `Inventory audit complete — ${devices.length} devices, ${drugs.length} drugs discovered`,
        data: { devices: devices.length, drugs: drugs.length },
      });
    }
  }, [stage, devices.length, drugs.length, addAuditEntry]);

  async function startCompile() {
    if (auditedCompileRef.current) return;
    auditedCompileRef.current = true;
    setStage('compiling');
    setCompileError(null);
    setUsedFallback(false);

    const payload = {
      vessel,
      inventory: inventory.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        dose: e.dose,
        unit: e.unit,
        capabilities: e.capabilities,
        quantityOnboard: e.quantityOnboard,
      })),
      validCitationIds: VALID_CITATION_IDS,
      maxScenarios: 8,
    };

    try {
      const result = await callClaude<{ scenarios: Scenario[] }>(PROTOCOL_COMPILATION_PROMPT, payload, 6144);
      if (!result?.scenarios || !Array.isArray(result.scenarios) || result.scenarios.length === 0) {
        throw new Error('LLM returned no scenarios');
      }
      // Sanitize citationIds against valid set
      const cleaned = result.scenarios.map((s) => ({
        ...s,
        citationIds: (s.citationIds ?? []).filter((id) => VALID_CITATION_IDS.includes(id)),
        treatment: s.treatment.map((t) => ({
          ...t,
          citationIds: (t.citationIds ?? []).filter((id) => VALID_CITATION_IDS.includes(id)),
        })),
      }));
      onCompiled(cleaned, 'llm');
      setStage('compiled');
    } catch (err) {
      const fallback = getFallbackScenarios(preset);
      setCompileError((err as Error).message);
      setUsedFallback(true);
      onCompiled(fallback, 'fallback');
      setStage('compiled');
    }
  }

  // === RENDER ===
  if (stage === 'idle') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Header preset={preset} vessel={vessel} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="md:col-span-2 bg-rig-surface border border-rig-dim/20 rounded-md p-5">
            <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2">Vessel Profile</div>
            <div className="font-bold text-lg tracking-wider">{vessel.name}</div>
            <div className="text-sm text-rig-dim mt-1">
              {vessel.type} · Flag {vessel.flag} · Crew {vessel.crew} · ETA shore {vessel.etaToShoreHours}h
            </div>
            <div className="text-xs text-rig-dim mt-1">Weather: {vessel.weatherCondition}</div>

            <div className="mt-4 text-[10px] uppercase tracking-widest text-rig-dim">What happens next</div>
            <div className="text-sm text-rig-text leading-relaxed">
              Sentinel uses your one-time satellite link at install to (1) auto-discover every medical device onboard
              over Bluetooth and the wired bus, and (2) read the signed RFID manifest in the medical chest to
              catalogue every drug, dose, and location. The AI then pre-compiles every possible emergency, symptom path,
              and treatment plan into a static graph stored locally. After that, you don't need internet ever again —
              all guidance runs from the on-device graph.
            </div>
          </div>

          <PresetSelector preset={preset} onPresetChange={onPresetChange} />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={() => setStage('scanning')}
            className="px-8 py-4 bg-rig-accent text-rig-bg font-bold uppercase tracking-widest rounded glow-accent hover:bg-rig-accent/85 flex items-center gap-3 text-base"
          >
            <Bluetooth size={18} /> Run Equipment Audit
          </button>
          <button
            onClick={() => {
              const fb = getFallbackScenarios(preset);
              onCompiled(fb, 'fallback');
              setStage('compiled');
              setTimeout(() => onTriggerIncident(), 80);
            }}
            className="text-[11px] uppercase tracking-widest text-rig-dim hover:text-rig-accent underline underline-offset-4"
          >
            DEMO — skip install, jump to incident flow
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'scanning' || stage === 'scanned') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Header preset={preset} vessel={vessel} />

        <div className="mt-4 flex items-center gap-4">
          <RadarPulse active={stage === 'scanning'} />
          <div>
            <div className="text-sm uppercase tracking-widest text-rig-dim">
              {stage === 'scanning' ? 'Bluetooth scan + RFID med-chest manifest…' : 'Discovery complete'}
            </div>
            <div className="text-3xl font-bold font-mono mt-1">
              {discoveredCount}
              <span className="text-rig-dim text-base"> / {totalCount}</span>
              <span className="text-rig-dim text-sm ml-2">items</span>
            </div>
          </div>
          {stage === 'scanned' && (
            <CheckCircle size={36} className="ml-auto text-rig-ok" />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <SourceSection
            title="Devices"
            sourceLabel="via Bluetooth + USB bonding"
            sourceDetail="Each medical device exposes a profile when paired. No camera, no manual entry — Sentinel reads model + serial directly from the device."
            icon={<Stethoscope size={14} />}
            indicatorIcon={<Bluetooth size={11} />}
            active={stage === 'scanning'}
            count={Math.min(discoveredCount, devices.length)}
            total={devices.length}
          >
            {/* REAL Web Bluetooth pairing */}
            <RealHardwarePanel
              supported={bt.supported}
              unsupportedNote={
                device.platform === 'iphone' || device.platform === 'ipad'
                  ? 'Web Bluetooth is blocked on iPhone / iPad (Apple does not allow browsers to use BLE). The simulated bonded-device list below is what would appear from the real bonded list on a supported device.'
                  : 'Your browser does not support Web Bluetooth. Use Chrome or Edge on desktop / Android.'
              }
              busy={bt.scanning}
              error={bt.error}
              onScan={() => {
                void bt.scan().then((p) => {
                  if (p) {
                    addAuditEntry({
                      mode: 'deploy',
                      type: 'input',
                      description: `Real BLE device paired: ${p.name} (id ${p.id.slice(0, 8)}…)`,
                    });
                  }
                });
              }}
              actionLabel={bt.paired.length > 0 ? 'Pair another device' : 'Pair real BLE device now'}
              paired={bt.paired.map((p) => ({
                id: p.id,
                line: `${p.name} ${p.connected ? '· connected' : '· paired'}`,
              }))}
              onClear={bt.clear}
            />
            <ul className="space-y-1.5 mt-2">
              {devices.map((d, i) => (
                <DiscoveryRow
                  key={d.id}
                  visible={i < discoveredCount}
                  primary={d.name}
                  secondary={d.capabilities?.join(' · ')}
                  qty={d.quantityOnboard}
                />
              ))}
            </ul>
          </SourceSection>

          <SourceSection
            title="Drugs & Consumables"
            sourceLabel="via signed RFID med-chest manifest"
            sourceDetail="Each drug bottle / drawer has an NFC/RFID tag installed at vessel commissioning. The manifest is signed by the operator — no manual logging required."
            icon={<Pill size={14} />}
            indicatorIcon={<Radio size={11} />}
            active={stage === 'scanning'}
            count={Math.max(0, discoveredCount - devices.length)}
            total={drugs.length}
          >
            {/* REAL Web NFC reader */}
            <RealHardwarePanel
              supported={nfc.supported}
              unsupportedNote={
                device.platform === 'iphone' || device.platform === 'ipad'
                  ? 'Web NFC is not available on iPhone / iPad — Apple does not expose NFC to browsers. On a fielded device, Sentinel reads the signed manifest from the chest natively. The simulated drawer list below is what would appear.'
                  : device.platform === 'android_phone' || device.platform === 'android_tablet'
                  ? 'Open this page in Chrome on Android to read real NFC tags.'
                  : 'Web NFC is Android-only. The simulated drawer list below is what would appear from the real signed manifest.'
              }
              busy={nfc.reading}
              error={nfc.error}
              onScan={() => void nfc.start()}
              actionLabel={nfc.reading ? 'Scanning for NFC tags…' : 'Read real NFC tag'}
              paired={nfc.tags.map((t) => ({
                id: t.serial,
                line: `Tag ${t.serial.slice(0, 10)} · ${t.records.join(', ') || 'no readable text'}`,
              }))}
              onClear={undefined}
            />
            <ul className="grid grid-cols-1 gap-1 text-xs mt-2">
              {drugs.map((d, i) => (
                <DiscoveryRow
                  key={d.id}
                  visible={i + devices.length < discoveredCount}
                  primary={`${d.name} ${d.dose ?? ''}`}
                  secondary={`${d.unit ?? ''}${d.location ? ` · ${d.location}` : ''}`}
                  qty={d.quantityOnboard}
                />
              ))}
            </ul>
          </SourceSection>
        </div>

        {/* WiFi / LAN scan — third real-hardware source */}
        <div className="mt-6">
          <WifiScanPanel
            onAudit={(msg) => addAuditEntry({ mode: 'deploy', type: 'input', description: msg })}
          />
        </div>

        {stage === 'scanned' && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={startCompile}
              className="px-8 py-4 bg-rig-accent text-rig-bg font-bold uppercase tracking-widest rounded glow-accent hover:bg-rig-accent/85 flex items-center gap-3 text-base"
            >
              <Radio size={18} /> Compile Operational Protocols
            </button>
          </div>
        )}
      </div>
    );
  }

  if (stage === 'compiling') {
    return (
      <div className="p-8 max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center">
        <Header preset={preset} vessel={vessel} />
        <div className="mt-12 flex flex-col items-center gap-4">
          <Hourglass size={48} className="text-rig-accent animate-spin" style={{ animationDuration: '2.5s' }} />
          <div className="text-lg uppercase tracking-widest text-rig-text">Compiling Decision Graph</div>
          <div className="text-sm text-rig-dim max-w-md leading-relaxed">
            Generating deterministic protocols against discovered inventory + vessel profile + environmental risks…
          </div>
          <CompileSubsteps />
        </div>
      </div>
    );
  }

  // stage === 'compiled'
  return (
    <div className="p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-2">
          <Header preset={preset} vessel={vessel} compact />
          {usedFallback && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-rig-critical/15 border border-rig-critical/40 rounded text-[10px] uppercase tracking-widest text-rig-critical">
              <AlertTriangle size={11} /> Compiled from local fallback (LLM unavailable)
            </div>
          )}
        </div>
        {compileError && (
          <div className="text-[10px] text-rig-dim font-mono mb-2 truncate" title={compileError}>
            {compileError}
          </div>
        )}

        <div className="bg-rig-surface/40 border border-rig-dim/20 rounded-md p-4 flex justify-center">
          <DecisionGraph scenarios={compiledScenarios} width={760} height={520} />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-rig-surface border border-rig-ok/30 rounded-md p-4 flex items-center gap-3 glow-ok">
            <Activity size={22} className="text-rig-ok" />
            <div>
              <div className="text-xs uppercase tracking-widest text-rig-ok">Ready — runs offline from here</div>
              <div className="text-sm text-rig-text">
                {compiledScenarios.length} emergencies pre-compiled · {compiledScenarios.reduce((s, x) => s + x.treatment.length, 0)} treatment steps · {compiledScenarios.reduce((s, x) => s + (x.regions?.length ?? 0), 0)} symptom-path edges · zero internet needed at runtime
              </div>
            </div>
          </div>
          <button
            onClick={onTriggerIncident}
            className="px-5 py-4 bg-rig-accent text-rig-bg font-bold uppercase tracking-widest rounded glow-accent hover:bg-rig-accent/85 flex items-center justify-center gap-2"
          >
            Simulate Incident (Flank Pain) →
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ preset, vessel, compact = false }: { preset: InventoryPreset; vessel: Vessel; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {preset === 'polar' ? (
        <Snowflake size={compact ? 18 : 22} className="text-rig-accent" />
      ) : (
        <Anchor size={compact ? 18 : 22} className="text-rig-accent" />
      )}
      <div>
        <div className={clsx('font-bold uppercase tracking-widest text-rig-text', compact ? 'text-base' : 'text-2xl')}>
          Sentinel — Deployment
        </div>
        {!compact && (
          <div className="text-xs text-rig-dim mt-1">
            Compile-time protocol generation for {vessel.name}.
          </div>
        )}
      </div>
    </div>
  );
}

function PresetSelector({
  preset,
  onPresetChange,
}: {
  preset: InventoryPreset;
  onPresetChange: (p: InventoryPreset) => void;
}) {
  return (
    <div className="bg-rig-surface border border-rig-dim/20 rounded-md p-4">
      <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2">Try Another Preset</div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onPresetChange('offshore')}
          className={clsx(
            'text-left px-3 py-2 rounded border text-xs flex items-center gap-2',
            preset === 'offshore' ? 'bg-rig-accent/15 border-rig-accent/40 text-rig-accent' : 'border-rig-dim/30 text-rig-text hover:bg-rig-bg/40'
          )}
        >
          <Anchor size={13} />
          <span>Offshore Supply Vessel</span>
        </button>
        <button
          onClick={() => onPresetChange('polar')}
          className={clsx(
            'text-left px-3 py-2 rounded border text-xs flex items-center gap-2',
            preset === 'polar' ? 'bg-rig-accent/15 border-rig-accent/40 text-rig-accent' : 'border-rig-dim/30 text-rig-text hover:bg-rig-bg/40'
          )}
        >
          <Snowflake size={13} />
          <span>Polar Research Station</span>
        </button>
      </div>
      <div className="mt-2 text-[10px] text-rig-dim leading-relaxed">
        Same compilation engine. Different inventory. Different protocols.
      </div>
    </div>
  );
}

function RealHardwarePanel({
  supported,
  unsupportedNote,
  busy,
  error,
  onScan,
  actionLabel,
  paired,
  onClear,
}: {
  supported: boolean;
  unsupportedNote: string;
  busy: boolean;
  error: string | null;
  onScan: () => void;
  actionLabel: string;
  paired: Array<{ id: string; line: string }>;
  onClear?: () => void;
}) {
  return (
    <div className="bg-rig-bg/40 border border-rig-dim/30 rounded p-2 mb-2">
      <div className="flex items-center gap-1.5 mb-1">
        {supported ? (
          <CheckCircle size={11} className="text-rig-ok" />
        ) : (
          <XCircle size={11} className="text-rig-dim" />
        )}
        <span className="text-[10px] uppercase tracking-widest text-rig-dim">
          {supported ? 'Real hardware available' : 'Real hardware not supported here'}
        </span>
      </div>
      {!supported && <p className="text-[10px] text-rig-dim leading-relaxed mb-1">{unsupportedNote}</p>}
      {supported && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={busy}
            onClick={onScan}
            className={clsx(
              'text-[11px] uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1',
              busy
                ? 'bg-rig-dim/30 border-rig-dim/40 text-rig-dim cursor-wait'
                : 'bg-rig-accent/15 border-rig-accent/40 text-rig-accent hover:bg-rig-accent/25'
            )}
          >
            {busy ? <Hourglass size={10} className="animate-spin" /> : <Radio size={10} />}
            {actionLabel}
          </button>
          {onClear && paired.length > 0 && (
            <button onClick={onClear} className="text-[10px] text-rig-dim hover:text-rig-text underline">
              clear
            </button>
          )}
        </div>
      )}
      {error && <div className="text-[10px] text-rig-critical mt-1 font-mono">{error}</div>}
      {paired.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[10px] font-mono text-rig-ok">
          {paired.map((p) => (
            <li key={p.id} className="flex items-center gap-1">
              <CheckCircle size={9} /> {p.line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RadarPulse({ active }: { active: boolean }) {
  return (
    <div className="relative w-20 h-20 shrink-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <Bluetooth size={26} className={clsx(active ? 'text-rig-accent' : 'text-rig-ok')} />
      </div>
      {active && (
        <>
          <div className="absolute inset-0 rounded-full border border-rig-accent radar-ping" />
          <div className="absolute inset-0 rounded-full border border-rig-accent radar-ping" style={{ animationDelay: '0.6s' }} />
          <div className="absolute inset-0 rounded-full border border-rig-accent radar-ping" style={{ animationDelay: '1.2s' }} />
        </>
      )}
    </div>
  );
}

function SourceSection({
  title,
  sourceLabel,
  sourceDetail,
  icon,
  indicatorIcon,
  active,
  count,
  total,
  children,
}: {
  title: string;
  sourceLabel: string;
  sourceDetail: string;
  icon: React.ReactNode;
  indicatorIcon: React.ReactNode;
  active: boolean;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-rig-surface/40 border border-rig-dim/20 rounded-md p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-rig-accent">{icon}</span>
        <span className="text-[10px] uppercase tracking-widest text-rig-dim">{title}</span>
        <span className="ml-auto text-[10px] font-mono text-rig-dim">
          {count}/{total}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-rig-accent font-mono mb-2">
        {active && (
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-rig-accent pulse-dot" />
          </span>
        )}
        <span className="text-rig-accent">{indicatorIcon}</span>
        <span>{sourceLabel}</span>
      </div>
      <div className="text-[10px] text-rig-dim leading-relaxed mb-2 italic">{sourceDetail}</div>
      <div className="max-h-[260px] overflow-y-auto pr-1 border-t border-rig-dim/20 pt-2">{children}</div>
    </div>
  );
}

function DiscoveryRow({
  visible,
  primary,
  secondary,
  qty,
}: {
  visible: boolean;
  primary: string;
  secondary?: string;
  qty?: number;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.li
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-2 text-xs"
        >
          <CheckCircle size={12} className="text-rig-ok mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-rig-text truncate">{primary}</div>
            {secondary && <div className="text-[10px] text-rig-dim truncate">{secondary}</div>}
          </div>
          {qty !== undefined && (
            <span className="text-[10px] font-mono text-rig-dim shrink-0">×{qty}</span>
          )}
        </motion.li>
      )}
    </AnimatePresence>
  );
}

function CompileSubsteps() {
  const steps = [
    'Mapping every possible emergency for this environment…',
    'Pre-loading every symptom path a non-clinician could see…',
    'Filtering protocols by drugs and devices actually onboard…',
    'Resolving evidence sources (BNF, MCA, ACEP, WHO)…',
    'Compiling decision graph for fully-offline runtime…',
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % steps.length), 1500);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <ul className="mt-4 text-[11px] text-rig-dim font-mono space-y-1 text-left max-w-md mx-auto">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={clsx('inline-block w-2 h-2 rounded-full', i <= idx ? 'bg-rig-accent' : 'bg-rig-dim/30')} />
          <span className={i <= idx ? 'text-rig-text' : 'text-rig-dim'}>{s}</span>
        </li>
      ))}
    </ul>
  );
}

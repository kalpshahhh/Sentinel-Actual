import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Activity,
  Scan,
  Heart,
  Wind,
  Scissors,
  Zap,
  Helicopter,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Battery,
  BatteryLow,
} from 'lucide-react';
import type { InventoryManifest, MedicalDevice } from '../types/inventory';
import { getAvailableMedications, getExpiredMedications, getLowStockMedications, getOperationalDevices } from '../lib/inventory/engine';

type Props = {
  manifest: InventoryManifest;
  lastSyncLabel?: string;
};

type ReadinessLevel = 'full' | 'degraded' | 'critical' | 'absent';

function getReadiness(ok: boolean, degraded?: boolean): ReadinessLevel {
  if (ok && !degraded) return 'full';
  if (ok && degraded) return 'degraded';
  return 'absent';
}

export function CapabilityDashboard({ manifest, lastSyncLabel }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const available = getAvailableMedications(manifest);
  const expired = getExpiredMedications(manifest);
  const lowStock = getLowStockMedications(manifest);
  const operational = getOperationalDevices(manifest);

  const cp = manifest.capabilityProfile;

  const hasO2 = cp.oxygen;
  const hasUltrasound = cp.ultrasound;
  const hasEcg = cp.ecg;
  const hasDefib = cp.defib;
  const hasAirway = cp.advanced_airway;
  const hasSuture = cp.suturing;
  const hasIV = cp.iv_access;
  const hasGlucose = cp.blood_glucose;

  // Medication-level checks
  const hasDrug = (pattern: string) =>
    available.some(
      (m) =>
        m.genericName.toLowerCase().includes(pattern.toLowerCase()) ||
        (m.brandName?.toLowerCase().includes(pattern.toLowerCase()) ?? false)
    );

  const hasAdrenaline = hasDrug('adrenaline') || hasDrug('epinephrine');
  const hasSalbutamol = hasDrug('salbutamol') || hasDrug('ventolin');
  const hasOpioid = hasDrug('morphine') || hasDrug('fentanyl') || hasDrug('ketamine');
  const hasAntibiotic = hasDrug('ceftriaxone') || hasDrug('ciprofloxacin') || hasDrug('amoxicillin');
  const hasTXA = hasDrug('tranexamic');

  const lowBatteryDevices = operational.filter(
    (d) => d.batteryLevel !== undefined && d.batteryLevel < 0.25
  );

  const toggle = (id: string) => setExpandedSection((s) => (s === id ? null : id));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-rig-text">
            Operational Capability Summary
          </h2>
          <div className="text-xs text-rig-dim mt-1 font-mono">
            {manifest.vesselName} · Inventory source: {manifest.importSource}
            {lastSyncLabel && <span> · {lastSyncLabel}</span>}
          </div>
        </div>
        <div className="text-right text-[10px] text-rig-dim font-mono">
          <div>{new Date(manifest.importedAt).toLocaleDateString()} {new Date(manifest.importedAt).toLocaleTimeString()}</div>
          <div className="text-rig-accent mt-0.5">OFFLINE READY</div>
        </div>
      </div>

      {/* Top stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatChip label="Medications available" value={available.length} tone="ok" />
        <StatChip label="Devices operational" value={operational.length} tone="ok" />
        <StatChip label="Expired meds" value={expired.length} tone={expired.length > 0 ? 'critical' : 'ok'} />
        <StatChip label="Low stock" value={lowStock.length} tone={lowStock.length > 0 ? 'warn' : 'ok'} />
      </div>

      {/* Capability sections */}
      <div className="space-y-2">

        <CapSection
          id="trauma"
          label="Trauma capability"
          icon={<Scissors size={14} />}
          readiness={getReadiness(hasIV && hasTXA && hasSuture, !hasTXA || !hasSuture)}
          expanded={expandedSection === 'trauma'}
          onToggle={() => toggle('trauma')}
        >
          <CapRow label="IV access" ok={hasIV} />
          <CapRow label="Tranexamic acid (haemorrhage control)" ok={hasTXA} />
          <CapRow label="Suturing capability" ok={hasSuture} />
          <CapRow label="Trauma splinting" ok={cp.trauma_splinting} />
          {hasTXA === false && (
            <CapWarning>No TXA — tourniquet + direct pressure only for major haemorrhage</CapWarning>
          )}
        </CapSection>

        <CapSection
          id="cardiac"
          label="Cardiac capability"
          icon={<Heart size={14} />}
          readiness={getReadiness(hasDefib && hasEcg && hasDrug('aspirin'), !hasDefib || !hasEcg)}
          expanded={expandedSection === 'cardiac'}
          onToggle={() => toggle('cardiac')}
        >
          <CapRow label="Defibrillator / AED" ok={hasDefib} />
          <CapRow label="12-lead ECG" ok={hasEcg} />
          <CapRow label="Aspirin (antiplatelet)" ok={hasDrug('aspirin')} />
          <CapRow label="GTN spray" ok={hasDrug('gtn') || hasDrug('glyceryl')} />
          {!hasDefib && (
            <CapWarning>No defibrillator — CPR only for cardiac arrest</CapWarning>
          )}
        </CapSection>

        <CapSection
          id="airway"
          label="Airway capability"
          icon={<Wind size={14} />}
          readiness={getReadiness(hasO2 && hasAirway, !hasSalbutamol)}
          expanded={expandedSection === 'airway'}
          onToggle={() => toggle('airway')}
        >
          <CapRow label="Oxygen supply" ok={hasO2} />
          <CapRow label="Advanced airway (LMA/ETT)" ok={hasAirway} />
          <CapRow label="Salbutamol (bronchodilator)" ok={hasSalbutamol} />
          <CapRow label="Nebuliser capability" ok={hasO2} />
          {!hasO2 && (
            <CapWarning critical>CRITICAL — No oxygen. Cannot support respiratory failure.</CapWarning>
          )}
          {!hasSalbutamol && (
            <CapWarning>No salbutamol — asthma attack cannot be pharmacologically treated</CapWarning>
          )}
        </CapSection>

        <CapSection
          id="imaging"
          label="Imaging capability"
          icon={<Scan size={14} />}
          readiness={getReadiness(hasUltrasound, false)}
          expanded={expandedSection === 'imaging'}
          onToggle={() => toggle('imaging')}
        >
          <CapRow label="Point-of-care ultrasound" ok={hasUltrasound} />
          <CapRow label="Blood glucose monitoring" ok={hasGlucose} />
          {!hasUltrasound && (
            <CapWarning>No ultrasound — guided assessment flow for kidney/cardiac conditions will be skipped</CapWarning>
          )}
        </CapSection>

        <CapSection
          id="allergy"
          label="Allergy / Anaphylaxis"
          icon={<Zap size={14} />}
          readiness={getReadiness(hasAdrenaline, !hasDrug('hydrocortisone'))}
          expanded={expandedSection === 'allergy'}
          onToggle={() => toggle('allergy')}
        >
          <CapRow label="Adrenaline (epinephrine)" ok={hasAdrenaline} />
          <CapRow label="Hydrocortisone" ok={hasDrug('hydrocortisone')} />
          {!hasAdrenaline && (
            <CapWarning critical>CRITICAL — No adrenaline. Anaphylaxis cannot be treated. Evacuate any suspected anaphylaxis immediately.</CapWarning>
          )}
        </CapSection>

        <CapSection
          id="infection"
          label="Infection / Sepsis"
          icon={<Activity size={14} />}
          readiness={getReadiness(hasAntibiotic, !hasDrug('ceftriaxone'))}
          expanded={expandedSection === 'infection'}
          onToggle={() => toggle('infection')}
        >
          <CapRow label="IV antibiotic (ceftriaxone)" ok={hasDrug('ceftriaxone')} />
          <CapRow label="Oral antibiotic (ciprofloxacin)" ok={hasDrug('ciprofloxacin')} />
          <CapRow label="Amoxicillin" ok={hasDrug('amoxicillin')} />
          <CapRow label="Strong opioid (pain / sedation)" ok={hasOpioid} />
          {!hasDrug('ceftriaxone') && hasAntibiotic && (
            <CapWarning>No IV antibiotic. Oral cover only — may be insufficient for sepsis.</CapWarning>
          )}
        </CapSection>

        <CapSection
          id="comms"
          label="Evacuation &amp; Communications"
          icon={<Helicopter size={14} />}
          readiness={getReadiness(cp.evacuation_heli || cp.evacuation_shore, !cp.telemedicine)}
          expanded={expandedSection === 'comms'}
          onToggle={() => toggle('comms')}
        >
          <CapRow label="Helicopter evacuation" ok={cp.evacuation_heli} />
          <CapRow label="Shore evacuation route" ok={cp.evacuation_shore} />
          <CapRow label="Satellite comms" ok={cp.satellite_comms} />
          <CapRow label="Telemedicine uplink" ok={cp.telemedicine} />
        </CapSection>
      </div>

      {/* Low battery devices */}
      {lowBatteryDevices.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 bg-rig-surface border border-yellow-500/30 rounded-md p-3"
        >
          <div className="flex items-center gap-1.5 text-yellow-400 text-[10px] uppercase tracking-widest mb-2">
            <BatteryLow size={12} /> Battery warnings
          </div>
          {lowBatteryDevices.map((d) => (
            <div key={d.id} className="flex items-center gap-2 text-xs text-rig-text py-1">
              <Battery size={11} className="text-yellow-400" />
              <span>{d.name}</span>
              <span className="font-mono text-yellow-400 ml-auto">
                {Math.round((d.batteryLevel ?? 0) * 100)}%
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Device list */}
      <details className="mt-4">
        <summary className="text-[10px] uppercase tracking-widest text-rig-dim cursor-pointer hover:text-rig-text mb-2">
          All devices ({manifest.devices.length})
        </summary>
        <ul className="mt-2 space-y-1">
          {manifest.devices.map((d) => (
            <DeviceRow key={d.id} device={d} />
          ))}
        </ul>
      </details>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const READINESS_STYLES: Record<ReadinessLevel, string> = {
  full: 'border-rig-ok/30 bg-rig-ok/5',
  degraded: 'border-yellow-500/30 bg-yellow-500/5',
  critical: 'border-rig-critical/40 bg-rig-critical/5',
  absent: 'border-rig-critical/40 bg-rig-critical/5',
};

const READINESS_DOT: Record<ReadinessLevel, string> = {
  full: 'bg-rig-ok',
  degraded: 'bg-yellow-400',
  critical: 'bg-rig-critical',
  absent: 'bg-rig-critical',
};

const READINESS_LABEL: Record<ReadinessLevel, string> = {
  full: 'FULL',
  degraded: 'DEGRADED',
  critical: 'LIMITED',
  absent: 'ABSENT',
};

function CapSection({
  label, icon, readiness, expanded, onToggle, children,
}: {
  id?: string;
  label: string;
  icon: React.ReactNode;
  readiness: ReadinessLevel;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('border rounded-md overflow-hidden', READINESS_STYLES[readiness])}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-black/10"
      >
        <span className="text-rig-dim">{icon}</span>
        <span className="text-sm text-rig-text font-medium flex-1">{label}</span>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono">
          <span className={clsx('w-2 h-2 rounded-full', READINESS_DOT[readiness])} />
          <span className={clsx(
            readiness === 'full' ? 'text-rig-ok' :
            readiness === 'degraded' ? 'text-yellow-400' :
            'text-rig-critical'
          )}>
            {READINESS_LABEL[readiness]}
          </span>
        </span>
        <ChevronDown size={12} className={clsx('text-rig-dim transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-3 space-y-1.5"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

function CapRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      {ok ? (
        <CheckCircle size={11} className="text-rig-ok shrink-0" />
      ) : (
        <AlertTriangle size={11} className="text-rig-critical shrink-0" />
      )}
      <span className={ok ? 'text-rig-text' : 'text-rig-dim'}>{label}</span>
    </div>
  );
}

function CapWarning({ children, critical }: { children: React.ReactNode; critical?: boolean }) {
  return (
    <div className={clsx(
      'mt-1 flex items-start gap-1.5 text-[10px] rounded px-2 py-1.5 border',
      critical
        ? 'text-rig-critical bg-rig-critical/10 border-rig-critical/30'
        : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    )}>
      <AlertTriangle size={9} className="mt-0.5 shrink-0" />
      {children}
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'critical' | 'warn' }) {
  return (
    <div className={clsx(
      'rounded p-2.5 border',
      tone === 'ok' ? 'bg-rig-ok/10 border-rig-ok/30' :
      tone === 'critical' ? 'bg-rig-critical/10 border-rig-critical/30' :
      'bg-yellow-500/10 border-yellow-500/30'
    )}>
      <div className="text-2xl font-bold font-mono text-rig-text">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-rig-dim mt-0.5">{label}</div>
    </div>
  );
}

function DeviceRow({ device }: { device: MedicalDevice }) {
  return (
    <li className="flex items-center gap-2 text-xs py-1 border-b border-rig-dim/10">
      {device.operational ? (
        <CheckCircle size={11} className="text-rig-ok shrink-0" />
      ) : (
        <AlertTriangle size={11} className="text-rig-critical shrink-0" />
      )}
      <span className="flex-1 text-rig-text truncate">{device.name}</span>
      {device.batteryLevel !== undefined && (
        <span className={clsx('font-mono text-[10px] shrink-0', device.batteryLevel < 0.25 ? 'text-rig-critical' : 'text-rig-dim')}>
          {Math.round(device.batteryLevel * 100)}%
        </span>
      )}
      <span className="text-[10px] text-rig-dim shrink-0 capitalize">{device.category}</span>
    </li>
  );
}

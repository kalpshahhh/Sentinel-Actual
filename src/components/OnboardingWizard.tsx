import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  Anchor,
  Snowflake,
  Fish,
  Factory,
  Building2,
  Backpack,
  Compass,
  MapPin,
  Radio,
  Phone,
  Signal,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Plane,
  XCircle,
  ClipboardList,
} from 'lucide-react';
import type { CapabilityProfile, CommsCapability, GeoRegion, SiteType } from '../types';
import { defaultProfileForPreset } from '../lib/capability';

type Props = {
  /** Used to seed sensible defaults if the operator skips fields. */
  initialPreset?: 'offshore' | 'polar';
  initial?: CapabilityProfile | null;
  onComplete: (profile: CapabilityProfile) => void;
  onCancel?: () => void;
};

type Step = 0 | 1 | 2 | 3 | 4;

export function OnboardingWizard({ initialPreset = 'offshore', initial, onComplete, onCancel }: Props) {
  const seed = initial ?? defaultProfileForPreset(initialPreset);
  const [step, setStep] = useState<Step>(0);
  const [siteType, setSiteType] = useState<SiteType>(seed.siteType);
  const [region, setRegion] = useState<GeoRegion>(seed.region);
  const [evacPossible, setEvacPossible] = useState<boolean>(seed.evacPossible);
  const [nearestEvac, setNearestEvac] = useState<string>(seed.nearestEvac);
  const [nearestEvacKm, setNearestEvacKm] = useState<number>(seed.nearestEvacKm);
  const [expectedMedicEtaHours, setExpectedMedicEtaHours] = useState<number>(seed.expectedMedicEtaHours);
  const [comms, setComms] = useState<CommsCapability>(seed.comms);
  const [constraints, setConstraints] = useState<string>(seed.constraints);

  const totalSteps = 5;
  const canNext = step < totalSteps - 1;
  const canBack = step > 0;

  const handleFinish = () => {
    const profile: CapabilityProfile = {
      siteType,
      region,
      evacPossible,
      nearestEvac: nearestEvac.trim() || 'Unknown',
      nearestEvacKm: Math.max(0, Math.round(nearestEvacKm)),
      expectedMedicEtaHours: Math.max(0, Math.round(expectedMedicEtaHours)),
      comms,
      constraints: constraints.trim(),
      savedAt: new Date().toISOString(),
    };
    onComplete(profile);
  };

  return (
    <div className="min-h-screen w-full bg-rig-bg text-rig-text flex flex-col">
      <div className="border-b border-rig-dim/20 px-6 py-4 flex items-center justify-between bg-rig-surface/40">
        <div className="flex items-center gap-3">
          <Compass size={20} className="text-rig-accent" />
          <div>
            <div className="text-xs uppercase tracking-widest text-rig-dim">Sentinel Onboarding</div>
            <div className="text-lg font-bold tracking-wider text-rig-text">Capability Profile</div>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-[10px] uppercase tracking-widest text-rig-dim hover:text-rig-text border border-rig-dim/30 rounded px-3 py-1.5 hover:border-rig-dim/60"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="px-6 pt-4">
        <div className="flex items-center gap-1.5 mb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={clsx(
                'flex-1 h-1 rounded-full transition-colors',
                i < step ? 'bg-rig-ok' : i === step ? 'bg-rig-accent' : 'bg-rig-dim/30'
              )}
            />
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-rig-dim font-mono mb-4">
          Step {step + 1} of {totalSteps}
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <Stage key="site" title="What kind of site is this?" subtitle="Sentinel uses this to weight emergencies you're more likely to see.">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <PickCard active={siteType === 'offshore_supply'} icon={<Anchor size={20} />} label="Offshore supply" onClick={() => setSiteType('offshore_supply')} />
                <PickCard active={siteType === 'fishing_vessel'} icon={<Fish size={20} />} label="Fishing vessel" onClick={() => setSiteType('fishing_vessel')} />
                <PickCard active={siteType === 'oil_rig'} icon={<Factory size={20} />} label="Oil / gas rig" onClick={() => setSiteType('oil_rig')} />
                <PickCard active={siteType === 'polar_research'} icon={<Snowflake size={20} />} label="Polar research" onClick={() => setSiteType('polar_research')} />
                <PickCard active={siteType === 'remote_clinic'} icon={<Building2 size={20} />} label="Remote clinic" onClick={() => setSiteType('remote_clinic')} />
                <PickCard active={siteType === 'expedition'} icon={<Backpack size={20} />} label="Expedition" onClick={() => setSiteType('expedition')} />
              </div>
            </Stage>
          )}

          {step === 1 && (
            <Stage key="region" title="Where are you operating?" subtitle="Coarse region — used to bias toward likely conditions (hypothermia in polar, heat illness in tropics, etc.).">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PickCard active={region === 'arctic_polar'} icon={<Snowflake size={20} />} label="Arctic / Polar" onClick={() => setRegion('arctic_polar')} />
                <PickCard active={region === 'north_sea_offshore'} icon={<Anchor size={20} />} label="North Sea / Offshore" onClick={() => setRegion('north_sea_offshore')} />
                <PickCard active={region === 'tropical'} icon={<MapPin size={20} />} label="Tropical" onClick={() => setRegion('tropical')} />
                <PickCard active={region === 'temperate_open_ocean'} icon={<MapPin size={20} />} label="Open ocean (temperate)" onClick={() => setRegion('temperate_open_ocean')} />
                <PickCard active={region === 'remote_continental'} icon={<MapPin size={20} />} label="Remote continental" onClick={() => setRegion('remote_continental')} />
              </div>
            </Stage>
          )}

          {step === 2 && (
            <Stage key="evac" title="Can you be evacuated from here?" subtitle="This is the single biggest input. It determines whether protocols favor stabilize-and-wait or extended onboard care.">
              <div className="grid grid-cols-2 gap-3 mb-5">
                <PickCard
                  active={evacPossible}
                  icon={<Plane size={20} />}
                  label="Yes — evacuation possible"
                  onClick={() => setEvacPossible(true)}
                />
                <PickCard
                  active={!evacPossible}
                  icon={<XCircle size={20} />}
                  label="No — must treat onboard"
                  onClick={() => setEvacPossible(false)}
                  tone="critical"
                />
              </div>

              {evacPossible && (
                <div className="bg-rig-surface/40 border border-rig-dim/20 rounded p-4 space-y-4">
                  <Field label="Nearest hospital / evac point">
                    <input
                      type="text"
                      value={nearestEvac}
                      onChange={(e) => setNearestEvac(e.target.value)}
                      placeholder="e.g. Aberdeen Royal Infirmary"
                      className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Distance (km)">
                      <input
                        type="number"
                        min={0}
                        value={nearestEvacKm}
                        onChange={(e) => setNearestEvacKm(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2 text-sm font-mono text-rig-text focus:border-rig-accent focus:outline-none"
                      />
                    </Field>
                    <Field label="Expected medic ETA (hours)">
                      <input
                        type="number"
                        min={0}
                        value={expectedMedicEtaHours}
                        onChange={(e) => setExpectedMedicEtaHours(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2 text-sm font-mono text-rig-text focus:border-rig-accent focus:outline-none"
                      />
                    </Field>
                  </div>
                </div>
              )}
              {!evacPossible && (
                <div className="bg-rig-critical/10 border border-rig-critical/40 rounded p-3 text-sm text-rig-critical">
                  Sentinel will compile protocols assuming you can hold the patient for days, not hours.
                  Extended-care checklists will be emphasized.
                </div>
              )}
            </Stage>
          )}

          {step === 3 && (
            <Stage key="comms" title="What comms do you have?" subtitle="If anything degrades, Sentinel needs to know what fallback you have.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PickCard active={comms === 'sat_phone'} icon={<Phone size={18} />} label="Satellite phone" sub="Always reachable" onClick={() => setComms('sat_phone')} />
                <PickCard active={comms === 'vhf_only'} icon={<Radio size={18} />} label="VHF radio only" sub="Line-of-sight only" onClick={() => setComms('vhf_only')} />
                <PickCard active={comms === 'cellular'} icon={<Signal size={18} />} label="Cellular" sub="Works near shore" onClick={() => setComms('cellular')} />
                <PickCard active={comms === 'none'} icon={<CircleDashed size={18} />} label="No comms" sub="Fully isolated" onClick={() => setComms('none')} tone="critical" />
              </div>
            </Stage>
          )}

          {step === 4 && (
            <Stage key="review" title="Review and confirm" subtitle="This profile is saved locally. Sentinel will use it to compile the right offline protocols for your environment.">
              <div className="bg-rig-surface/40 border border-rig-dim/20 rounded p-4 space-y-2 text-sm">
                <Row label="Site type" value={labelSite(siteType)} />
                <Row label="Region" value={labelRegion(region)} />
                <Row label="Evacuation" value={evacPossible ? `Yes — ${nearestEvac} (${nearestEvacKm} km, ETA ${expectedMedicEtaHours}h)` : 'No — onboard care only'} tone={evacPossible ? 'ok' : 'critical'} />
                <Row label="Comms" value={labelComms(comms)} tone={comms === 'none' ? 'critical' : 'ok'} />
              </div>
              <div className="mt-4">
                <Field label="Anything else medics should know? (optional)">
                  <textarea
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="e.g. No helideck — winch transfer only. Weather window closed Dec-Feb. Captain trained in BLS."
                    rows={3}
                    className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none resize-none"
                  />
                </Field>
              </div>
            </Stage>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <div className="border-t border-rig-dim/20 px-6 py-3 flex items-center justify-between bg-rig-surface/40">
        <button
          onClick={() => canBack && setStep((s) => (s - 1) as Step)}
          disabled={!canBack}
          className={clsx(
            'px-4 py-2 rounded border text-[11px] uppercase tracking-widest flex items-center gap-1.5',
            canBack
              ? 'border-rig-dim/40 text-rig-text hover:bg-rig-bg'
              : 'border-rig-dim/20 text-rig-dim/50 cursor-not-allowed'
          )}
        >
          <ChevronLeft size={13} /> Back
        </button>

        {step < totalSteps - 1 ? (
          <button
            onClick={() => canNext && setStep((s) => (s + 1) as Step)}
            className="px-6 py-2 rounded bg-rig-accent text-rig-bg font-bold uppercase tracking-widest text-xs flex items-center gap-1.5 hover:bg-rig-accent/85"
          >
            Next <ChevronRight size={13} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="px-6 py-2 rounded bg-rig-ok text-rig-bg font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-rig-ok/85"
          >
            <ClipboardList size={14} /> Save profile
          </button>
        )}
      </div>
    </div>
  );
}

function Stage({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-rig-text mb-1">{title}</h2>
      <p className="text-sm text-rig-dim mb-5">{subtitle}</p>
      {children}
    </motion.div>
  );
}

function PickCard({
  active,
  icon,
  label,
  sub,
  onClick,
  tone = 'accent',
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  tone?: 'accent' | 'critical';
}) {
  const activeClass = tone === 'critical'
    ? 'bg-rig-critical/15 border-rig-critical/60 text-rig-critical'
    : 'bg-rig-accent/15 border-rig-accent/60 text-rig-accent';
  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-4 rounded-md border text-left flex items-start gap-3 transition-colors',
        active ? activeClass : 'bg-rig-surface/40 border-rig-dim/30 text-rig-text hover:border-rig-dim/60'
      )}
    >
      <span className={clsx('shrink-0 mt-0.5', active ? '' : 'text-rig-dim')}>{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-bold">{label}</div>
        {sub && <div className="text-[11px] text-rig-dim mt-0.5">{sub}</div>}
      </div>
      {active && <CheckCircle size={14} className="ml-auto shrink-0 mt-0.5" />}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1">{label}</div>
      {children}
    </label>
  );
}

function Row({ label, value, tone = 'ok' }: { label: string; value: string; tone?: 'ok' | 'critical' }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-[10px] uppercase tracking-widest text-rig-dim">{label}</span>
      <span className={clsx('text-sm text-right', tone === 'critical' ? 'text-rig-critical' : 'text-rig-text')}>{value}</span>
    </div>
  );
}

function labelSite(s: SiteType): string {
  return ({
    offshore_supply: 'Offshore supply vessel',
    fishing_vessel: 'Fishing vessel',
    oil_rig: 'Oil / gas rig',
    polar_research: 'Polar research station',
    remote_clinic: 'Remote clinic',
    expedition: 'Expedition team',
  } as Record<SiteType, string>)[s];
}
function labelRegion(r: GeoRegion): string {
  return ({
    arctic_polar: 'Arctic / Polar',
    north_sea_offshore: 'North Sea / Offshore',
    tropical: 'Tropical',
    temperate_open_ocean: 'Open ocean (temperate)',
    remote_continental: 'Remote continental',
  } as Record<GeoRegion, string>)[r];
}
function labelComms(c: CommsCapability): string {
  return ({
    sat_phone: 'Satellite phone',
    vhf_only: 'VHF radio only',
    cellular: 'Cellular',
    none: 'No comms',
  } as Record<CommsCapability, string>)[c];
}

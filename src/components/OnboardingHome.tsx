import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  RefreshCw,
  Wind,
  Thermometer,
  Anchor,
  Compass,
  Bluetooth,
  Wifi,
  Pill,
  ScanBarcode,
  ChevronRight,
  Pencil,
  Plane,
  Radio,
  Phone,
  Signal,
  CircleDashed,
  XCircle,
  CheckCircle2,
  Activity,
  Ship,
  Snowflake,
  Plus,
  X,
  Cpu,
} from 'lucide-react';
import clsx from 'clsx';
import type { CapabilityProfile, InventoryPreset } from '../types';
import type { VesselRecord } from '../lib/vessels';
import { siteTypeLabel, regionLabel, commsLabel } from '../lib/capability';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  fetchLiveWeather,
  fakeWeatherForRegion,
  fakeCoordsForRegion,
  type WeatherReading,
} from '../lib/weather';

export type OnboardingAuditKind = 'equipment' | 'medicine';

type Props = {
  profile: CapabilityProfile;
  /** demo = fake data; live = real GPS + real weather fetch. */
  dataSource: 'demo' | 'live';
  vessels: VesselRecord[];
  activeVesselId: string | null;
  /** Returns counts so the home page can show progress against each audit. */
  equipmentCount?: number;
  medicineCount?: number;
  onVesselSelect: (id: string) => void;
  onVesselCreate: (name: string, preset: InventoryPreset) => void;
  onEditProfile: () => void;
  onStartAudit: (kind: OnboardingAuditKind) => void;
  onContinueToOperations: () => void;
};

const REFRESH_INTERVAL_MS = 5 * 60_000;

export function OnboardingHome({
  profile,
  dataSource,
  vessels,
  activeVesselId,
  equipmentCount = 0,
  medicineCount = 0,
  onVesselSelect,
  onVesselCreate,
  onEditProfile,
  onStartAudit,
  onContinueToOperations,
}: Props) {
  const [showNewVessel, setShowNewVessel] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPreset, setNewPreset] = useState<InventoryPreset>('offshore');
  const liveGeo = useGeolocation();
  const fakeCoords = fakeCoordsForRegion(profile.region);
  const lat = dataSource === 'live' ? liveGeo.lat : fakeCoords.lat;
  const lng = dataSource === 'live' ? liveGeo.lng : fakeCoords.lng;
  const gpsAccuracy = dataSource === 'live' ? liveGeo.accuracyMeters : null;

  const [weather, setWeather] = useState<WeatherReading>(() => fakeWeatherForRegion(profile.region));
  const [weatherLoading, setWeatherLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Live weather poll — only when in live mode and we have coords.
  useEffect(() => {
    if (dataSource !== 'live') {
      setWeather(fakeWeatherForRegion(profile.region));
      return;
    }
    if (lat === null || lng === null) return;

    let cancelled = false;
    const pull = async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setWeatherLoading(true);
      const w = await fetchLiveWeather(lat, lng, ctrl.signal);
      if (!cancelled) {
        setWeather(w);
        setWeatherLoading(false);
      }
    };
    void pull();
    const id = window.setInterval(pull, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      abortRef.current?.abort();
    };
  }, [dataSource, lat, lng, profile.region]);

  const handleRefreshWeather = async () => {
    if (dataSource === 'demo') {
      // re-randomize headline slightly so the operator sees the button work
      setWeather(fakeWeatherForRegion(profile.region));
      return;
    }
    if (lat === null || lng === null) {
      liveGeo.refresh();
      return;
    }
    setWeatherLoading(true);
    const w = await fetchLiveWeather(lat, lng);
    setWeather(w);
    setWeatherLoading(false);
  };

  const coordsLabel =
    lat !== null && lng !== null ? `${formatCoord(lat, 'lat')}  ·  ${formatCoord(lng, 'lng')}` : '—';

  const gpsBadge =
    dataSource === 'demo'
      ? 'SIMULATED GPS'
      : liveGeo.status === 'granted'
        ? `±${Math.round(gpsAccuracy ?? 0)}m`
        : liveGeo.status === 'pending'
          ? 'LOCATING…'
          : liveGeo.status === 'denied'
            ? 'GPS DENIED'
            : liveGeo.status === 'unsupported'
              ? 'GPS UNSUPPORTED'
              : 'GPS ERROR';

  return (
    <div className="min-h-screen w-full bg-rig-bg text-rig-text flex flex-col">
      {/* Header */}
      <div className="border-b border-rig-dim/20 px-6 py-4 flex items-center justify-between bg-rig-surface/40">
        <div className="flex items-center gap-3">
          <Compass size={20} className="text-rig-accent" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-rig-dim font-mono">
              Sentinel Onboarding {dataSource === 'demo' ? '· Simulated' : '· Live'}
            </div>
            <div className="text-lg font-bold tracking-wider text-rig-text">Vessel Setup</div>
          </div>
        </div>
        <button
          onClick={onContinueToOperations}
          disabled={equipmentCount === 0 && medicineCount === 0}
          className={clsx(
            'px-4 py-2 rounded text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5',
            equipmentCount > 0 || medicineCount > 0
              ? 'bg-rig-ok text-rig-bg hover:bg-rig-ok/85'
              : 'bg-rig-surface text-rig-dim border border-rig-dim/30 cursor-not-allowed'
          )}
          title={
            equipmentCount === 0 && medicineCount === 0
              ? 'Complete at least one audit to continue'
              : 'Enter operations command center'
          }
        >
          Continue <ChevronRight size={13} />
        </button>
      </div>

      <div className="flex-1 px-4 md:px-6 py-6 max-w-5xl w-full mx-auto">
        {/* VESSEL SELECTOR */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
            <Ship size={11} /> Vessel
          </div>

          {vessels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {vessels.map((v) => {
                const compiled = (v.compiledScenarios?.length ?? 0) > 0;
                return (
                  <VesselCard
                    key={v.id}
                    active={v.id === activeVesselId}
                    name={v.name}
                    type={`${v.preset === 'polar' ? 'Polar research' : 'Offshore supply'} · ${v.capabilityProfile?.region?.replace(/_/g, ' ') ?? 'region TBD'}`}
                    compiled={compiled}
                    icon={v.preset === 'polar' ? <Snowflake size={18} /> : <Ship size={18} />}
                    onClick={() => onVesselSelect(v.id)}
                  />
                );
              })}
            </div>
          )}

          {!showNewVessel ? (
            <button
              onClick={() => setShowNewVessel(true)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-rig-dim/40 hover:border-rig-accent/50 text-rig-dim hover:text-rig-accent transition-colors text-sm"
            >
              <Plus size={15} /> Add new vessel
            </button>
          ) : (
            <div className="bg-rig-surface/40 border border-rig-accent/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-rig-accent">New vessel</div>
                <button onClick={() => { setShowNewVessel(false); setNewName(''); }} className="text-rig-dim hover:text-rig-text">
                  <X size={14} />
                </button>
              </div>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Vessel name, e.g. MV Endeavour"
                className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2.5 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewPreset('offshore')}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors',
                    newPreset === 'offshore'
                      ? 'bg-rig-accent/15 border-rig-accent/50 text-rig-accent'
                      : 'border-rig-dim/30 text-rig-dim hover:border-rig-dim/60'
                  )}
                >
                  <Ship size={14} /> Offshore / Marine
                </button>
                <button
                  onClick={() => setNewPreset('polar')}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors',
                    newPreset === 'polar'
                      ? 'bg-rig-accent/15 border-rig-accent/50 text-rig-accent'
                      : 'border-rig-dim/30 text-rig-dim hover:border-rig-dim/60'
                  )}
                >
                  <Snowflake size={14} /> Polar / Remote
                </button>
              </div>
              <button
                disabled={!newName.trim()}
                onClick={() => {
                  if (!newName.trim()) return;
                  onVesselCreate(newName.trim(), newPreset);
                  setShowNewVessel(false);
                  setNewName('');
                }}
                className="w-full px-4 py-2 bg-rig-accent text-rig-bg rounded text-xs font-bold uppercase tracking-widest disabled:opacity-40 hover:bg-rig-accent/85"
              >
                Create vessel
              </button>
            </div>
          )}
        </motion.section>

        {/* LOCATION CARD */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rig-surface/40 border border-rig-dim/30 rounded-lg overflow-hidden mb-6"
        >
          <div className="px-4 md:px-5 py-3 border-b border-rig-dim/20 flex items-center justify-between bg-rig-surface/40">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-rig-accent" />
              <span className="text-[10px] uppercase tracking-widest text-rig-dim font-mono">
                Location &amp; Environment
              </span>
            </div>
            <button
              onClick={onEditProfile}
              className="text-[10px] uppercase tracking-widest text-rig-dim hover:text-rig-text border border-rig-dim/30 hover:border-rig-dim/60 rounded px-2.5 py-1 flex items-center gap-1.5"
            >
              <Pencil size={11} /> Edit profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rig-dim/15">
            {/* Position cell */}
            <div className="bg-rig-bg p-4 md:p-5">
              <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
                <Activity size={11} /> Position
                <span
                  className={clsx(
                    'ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider',
                    dataSource === 'demo'
                      ? 'bg-rig-accent/15 text-rig-accent'
                      : liveGeo.status === 'granted'
                        ? 'bg-rig-ok/15 text-rig-ok'
                        : 'bg-rig-critical/15 text-rig-critical'
                  )}
                >
                  {gpsBadge}
                </span>
              </div>
              <div className="text-base md:text-lg font-mono text-rig-text leading-tight mb-1">{coordsLabel}</div>
              <div className="text-xs text-rig-dim">{regionLabel(profile.region)}</div>
            </div>

            {/* Weather cell */}
            <div className="bg-rig-bg p-4 md:p-5">
              <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
                <Wind size={11} /> Weather
                <button
                  onClick={handleRefreshWeather}
                  className="ml-auto text-rig-dim hover:text-rig-text"
                  title="Refresh weather"
                >
                  <RefreshCw size={11} className={weatherLoading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="text-base md:text-lg font-mono text-rig-text leading-tight mb-1">
                {weather.headline}
              </div>
              <div className="text-xs text-rig-dim flex items-center gap-3">
                {weather.tempC !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Thermometer size={11} /> {Math.round(weather.tempC)}°C
                  </span>
                )}
                {weather.seaState !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Anchor size={11} /> sea {weather.seaState}/9
                  </span>
                )}
                <span className="ml-auto text-[10px] uppercase tracking-widest">
                  {weather.source === 'live' ? 'Open-Meteo' : weather.source === 'demo' ? 'Simulated' : 'Cached'}
                </span>
              </div>
            </div>

            {/* Site type cell */}
            <ProfileCell label="Site type" value={siteTypeLabel(profile.siteType)} />
            {/* Comms cell */}
            <ProfileCell
              label="Comms"
              value={commsLabel(profile.comms)}
              icon={commsIcon(profile.comms)}
              tone={profile.comms === 'none' ? 'critical' : 'ok'}
            />
            {/* Evac cell — spans full row */}
            <div className="bg-rig-bg p-4 md:p-5 md:col-span-2">
              <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
                <Plane size={11} /> Evacuation
              </div>
              {profile.evacPossible ? (
                <div className="text-sm text-rig-text">
                  <span className="font-bold">{profile.nearestEvac}</span>
                  <span className="text-rig-dim">
                    {' · '}
                    {profile.nearestEvacKm} km · ETA {profile.expectedMedicEtaHours}h
                  </span>
                </div>
              ) : (
                <div className="text-sm text-rig-critical inline-flex items-center gap-1.5">
                  <XCircle size={13} /> Onboard care only — no evac
                </div>
              )}
              {profile.constraints && (
                <div className="text-[11px] text-rig-dim mt-2 italic">"{profile.constraints}"</div>
              )}
            </div>
          </div>
        </motion.section>

        {/* AUDIT TILES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AuditTile
            tone="accent"
            icon={
              <div className="flex items-center gap-1">
                <Bluetooth size={28} />
                <Wifi size={22} className="opacity-70" />
              </div>
            }
            title="Equipment Audit"
            subtitle="Discover medical devices on this vessel"
            description="Scan Bluetooth devices in range, then sweep WiFi / LAN. Detected devices register against the capability graph."
            count={equipmentCount}
            countLabel="devices catalogued"
            onClick={() => onStartAudit('equipment')}
          />

          <AuditTile
            tone="ok"
            icon={
              <div className="flex items-center gap-1">
                <Pill size={28} />
                <ScanBarcode size={22} className="opacity-70" />
              </div>
            }
            title="Medicine Audit"
            subtitle="Catalog drugs in the medical chest"
            description="Scan medication barcodes one-by-one or upload a CSV manifest. Items unlock treatment options at incident time."
            count={medicineCount}
            countLabel="items catalogued"
            onClick={() => onStartAudit('medicine')}
          />
        </div>

        {/* Status strip */}
        <div className="mt-6 bg-rig-surface/40 border border-rig-dim/20 rounded px-4 py-3 flex items-center gap-4 text-[11px] text-rig-dim font-mono">
          <CheckCircle2 size={14} className="text-rig-ok" />
          <span>
            Capability profile <span className="text-rig-text">saved</span>
          </span>
          <span className="mx-2 text-rig-dim/40">|</span>
          <span>
            Equipment <span className={equipmentCount > 0 ? 'text-rig-ok' : 'text-rig-dim'}>{equipmentCount}</span>
          </span>
          <span className="mx-2 text-rig-dim/40">|</span>
          <span>
            Medicine <span className={medicineCount > 0 ? 'text-rig-ok' : 'text-rig-dim'}>{medicineCount}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ProfileCell({
  label,
  value,
  icon,
  tone = 'ok',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'ok' | 'critical';
}) {
  return (
    <div className="bg-rig-bg p-4 md:p-5">
      <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className={clsx('text-sm', tone === 'critical' ? 'text-rig-critical' : 'text-rig-text')}>{value}</div>
    </div>
  );
}

function commsIcon(c: CapabilityProfile['comms']): React.ReactNode {
  const size = 11;
  switch (c) {
    case 'sat_phone':
      return <Phone size={size} />;
    case 'vhf_only':
      return <Radio size={size} />;
    case 'cellular':
      return <Signal size={size} />;
    case 'none':
      return <CircleDashed size={size} />;
  }
}

function AuditTile({
  tone,
  icon,
  title,
  subtitle,
  description,
  count,
  countLabel,
  onClick,
}: {
  tone: 'accent' | 'ok';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  count: number;
  countLabel: string;
  onClick: () => void;
}) {
  const toneClasses =
    tone === 'accent'
      ? {
          border: 'border-rig-accent/40 hover:border-rig-accent',
          glow: 'hover:shadow-[0_0_0_1px_rgb(var(--rig-accent)/0.4)]',
          icon: 'text-rig-accent',
          chip: 'bg-rig-accent/15 text-rig-accent',
        }
      : {
          border: 'border-rig-ok/40 hover:border-rig-ok',
          glow: 'hover:shadow-[0_0_0_1px_rgb(var(--rig-ok)/0.4)]',
          icon: 'text-rig-ok',
          chip: 'bg-rig-ok/15 text-rig-ok',
        };

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={clsx(
        'group relative w-full text-left bg-rig-surface/40 border rounded-lg p-5 md:p-6 transition-all',
        toneClasses.border,
        toneClasses.glow
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={toneClasses.icon}>{icon}</div>
        <span className={clsx('text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded', toneClasses.chip)}>
          {count > 0 ? `${count} ${countLabel}` : 'Not started'}
        </span>
      </div>
      <div className="text-xl md:text-2xl font-bold uppercase tracking-wide mb-1 text-rig-text">{title}</div>
      <div className="text-xs uppercase tracking-widest text-rig-dim mb-3">{subtitle}</div>
      <p className="text-sm text-rig-dim leading-relaxed">{description}</p>
      <div className="absolute bottom-4 right-4 text-rig-dim group-hover:text-rig-text transition-colors">
        <ChevronRight size={18} />
      </div>
    </motion.button>
  );
}

function formatCoord(v: number, kind: 'lat' | 'lng'): string {
  const hemi = kind === 'lat' ? (v >= 0 ? 'N' : 'S') : v >= 0 ? 'E' : 'W';
  return `${Math.abs(v).toFixed(4)}°${hemi}`;
}

function VesselCard({
  active,
  name,
  type,
  compiled,
  icon,
  onClick,
}: {
  active: boolean;
  name: string;
  type: string;
  compiled?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-4 rounded-lg border flex items-center gap-3 transition-all',
        active
          ? 'bg-rig-accent/15 border-rig-accent/60 shadow-[0_0_0_1px_rgb(var(--rig-accent)/0.3)]'
          : 'bg-rig-surface/40 border-rig-dim/30 hover:border-rig-dim/60'
      )}
    >
      <span className={clsx('shrink-0', active ? 'text-rig-accent' : 'text-rig-dim')}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={clsx('text-sm font-bold tracking-wide', active ? 'text-rig-accent' : 'text-rig-text')}>{name}</div>
        <div className="text-xs text-rig-dim truncate capitalize">{type}</div>
        {compiled && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-rig-ok">
            <Cpu size={9} /> Protocols ready
          </div>
        )}
      </div>
      {active && <CheckCircle2 size={16} className="text-rig-accent shrink-0" />}
    </button>
  );
}

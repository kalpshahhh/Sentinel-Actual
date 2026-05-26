import { motion } from 'framer-motion';
import { MapPin, Battery, BatteryCharging, Wifi, WifiOff, Package, Siren, ClipboardList, Wind, AlertTriangle, Compass, Plane, XCircle, Radio } from 'lucide-react';
import clsx from 'clsx';
import type { CapabilityProfile, Vessel } from '../types';
import type { InventoryManifest } from '../types/inventory';
import type { AppSessionMode } from './ModeSelector';
import { useGeolocation } from '../hooks/useGeolocation';
import { useBattery } from '../hooks/useBattery';
import { useWeather } from '../hooks/useWeather';
import { siteTypeLabel, regionLabel, commsLabel } from '../lib/capability';

const DEMO_LAT = 56.234;
const DEMO_LNG = 3.456;

type Props = {
  sessionMode: AppSessionMode;
  vessel: Vessel;
  inventoryManifest: InventoryManifest | null;
  compiledProtocols: number;
  isOnline: boolean;
  demoOffline?: boolean;
  capabilityProfile?: CapabilityProfile | null;
  onReconfigureProfile?: () => void;
  onGoToAudit: () => void;
  onEmergency: () => void;
};

function fmtCoord(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr} ${lngStr}`;
}

export function CommandCenter({
  sessionMode, vessel, inventoryManifest, compiledProtocols, isOnline, demoOffline = false,
  capabilityProfile, onReconfigureProfile,
  onGoToAudit, onEmergency,
}: Props) {
  const isDemo = sessionMode === 'demo';
  const isLive = sessionMode === 'live';

  const geo = useGeolocation();
  const battery = useBattery();

  const resolvedLat = isDemo ? DEMO_LAT : (geo.status === 'granted' && geo.lat !== null ? geo.lat : vessel.lat);
  const resolvedLng = isDemo ? DEMO_LNG : (geo.status === 'granted' && geo.lng !== null ? geo.lng : vessel.lng);
  const weather = useWeather(resolvedLat, resolvedLng);

  const effectiveOnline = isDemo ? !demoOffline : isOnline;

  // GPS
  const gpsOk = isDemo ? true : (geo.status === 'granted' && geo.lat !== null);
  const coordText: string = isDemo
    ? `${fmtCoord(DEMO_LAT, DEMO_LNG)} (sim)`
    : gpsOk
      ? fmtCoord(geo.lat!, geo.lng!)
      : geo.status === 'pending'
        ? 'Acquiring…'
        : `${fmtCoord(vessel.lat, vessel.lng)} (no GPS)`;

  // Battery
  const battPct = isDemo ? 85 : (battery.supported && battery.level !== null ? Math.round(battery.level * 100) : null);
  const charging = isDemo ? false : battery.charging === true;

  const modeBadge = {
    live: { label: 'LIVE', color: 'text-rig-critical border-rig-critical/50 bg-rig-critical/10' },
    demo: { label: 'DEMO', color: 'text-rig-accent border-rig-accent/50 bg-rig-accent/10' },
    onboarding: { label: 'SETUP', color: 'text-rig-ok border-rig-ok/50 bg-rig-ok/10' },
  }[sessionMode];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <span className={clsx('text-[10px] uppercase tracking-widest border rounded px-2 py-0.5 font-bold', modeBadge.color)}>
            {modeBadge.label}
          </span>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest text-rig-text">{vessel.name}</h1>
            <div className="text-xs text-rig-dim uppercase tracking-wider">
              {vessel.type} · Flag {vessel.flag} · {vessel.crew} crew · Shore {vessel.etaToShoreHours}h away
            </div>
          </div>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusCard
            label="Location"
            value={coordText}
            icon={<MapPin size={14} />}
            tone={gpsOk ? 'ok' : 'dim'}
            sub={isDemo ? 'Simulated' : (gpsOk ? 'GPS lock' : 'No GPS')}
          />
          <StatusCard
            label="Weather"
            value={weather ? `${weather.tempC}°C · ${weather.condition}` : vessel.weatherCondition}
            icon={<Wind size={14} />}
            tone="dim"
            sub={weather ? `${weather.windKph} km/h wind` : 'Vessel record'}
          />
          <StatusCard
            label="Battery"
            value={battPct !== null ? `${battPct}%` : (battery.supported ? 'Reading…' : 'Unavailable')}
            icon={charging ? <BatteryCharging size={14} /> : <Battery size={14} />}
            tone={battPct !== null && battPct < 20 ? 'critical' : battPct !== null ? 'ok' : 'dim'}
            sub={charging ? 'Charging' : isDemo ? 'Simulated' : (battery.supported ? 'Real battery' : 'API unsupported')}
          />
          <StatusCard
            label="Network"
            value={effectiveOnline ? 'Online' : 'Offline'}
            icon={effectiveOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            tone={effectiveOnline ? 'ok' : 'dim'}
            sub={effectiveOnline ? 'Connected' : 'No connection'}
          />
        </div>

        {/* Capability profile */}
        {capabilityProfile && (
          <div className="bg-rig-surface border border-rig-dim/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass size={13} className="text-rig-accent" />
                <span className="text-[10px] uppercase tracking-widest text-rig-dim">Capability profile</span>
              </div>
              {onReconfigureProfile && (
                <button
                  onClick={onReconfigureProfile}
                  className="text-[10px] uppercase tracking-widest text-rig-dim hover:text-rig-accent border border-rig-dim/30 rounded px-2 py-1 hover:border-rig-accent/50"
                >
                  Reconfigure
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ProfileCell icon={<Compass size={13} />} label="Site" value={siteTypeLabel(capabilityProfile.siteType)} sub={regionLabel(capabilityProfile.region)} />
              <ProfileCell
                icon={capabilityProfile.evacPossible ? <Plane size={13} /> : <XCircle size={13} />}
                label="Evacuation"
                value={capabilityProfile.evacPossible ? `${capabilityProfile.expectedMedicEtaHours}h to ${capabilityProfile.nearestEvac}` : 'Not possible'}
                sub={capabilityProfile.evacPossible ? `${capabilityProfile.nearestEvacKm} km` : 'Onboard care only'}
                tone={capabilityProfile.evacPossible ? 'ok' : 'critical'}
              />
              <ProfileCell
                icon={<Radio size={13} />}
                label="Comms"
                value={commsLabel(capabilityProfile.comms)}
                tone={capabilityProfile.comms === 'none' ? 'critical' : 'ok'}
              />
              <ProfileCell
                icon={<AlertTriangle size={13} />}
                label="Notes"
                value={capabilityProfile.constraints || '—'}
                sub={capabilityProfile.constraints ? '' : 'No constraints recorded'}
              />
            </div>
          </div>
        )}

        {/* Medical readiness */}
        <div className="bg-rig-surface border border-rig-dim/20 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-3">Medical Readiness</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ReadinessItem
              icon={<Package size={15} />}
              label="Inventory"
              value={inventoryManifest ? `${inventoryManifest.medications.length} meds · ${inventoryManifest.devices.length} devices` : 'Not loaded'}
              ok={inventoryManifest !== null}
            />
            <ReadinessItem
              icon={<ClipboardList size={15} />}
              label="Protocols"
              value={compiledProtocols > 0 ? `${compiledProtocols} emergencies compiled` : 'Not compiled'}
              ok={compiledProtocols > 0}
            />
            <ReadinessItem
              icon={effectiveOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
              label="Offline ready"
              value={compiledProtocols > 0 ? 'Yes — works fully offline' : 'Run audit to enable'}
              ok={compiledProtocols > 0}
            />
          </div>
        </div>

        {/* Live mode data warning */}
        {isLive && !battery.supported && (
          <div className="flex items-start gap-2 p-3 bg-rig-critical/10 border border-rig-critical/30 rounded text-xs text-rig-critical">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            Battery status unavailable — Battery Status API is not supported on this browser (Safari). Use Chrome or Edge for full sensor access.
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <button
            onClick={onGoToAudit}
            className="flex flex-col items-center justify-center gap-2 px-6 py-5 bg-rig-surface border border-rig-accent/40 rounded-xl text-rig-accent hover:bg-rig-accent/10 hover:border-rig-accent transition-colors group"
          >
            <ClipboardList size={28} className="group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="font-bold uppercase tracking-widest text-sm">Equipment Audit</div>
              <div className="text-[10px] text-rig-dim mt-0.5">Scan inventory · compile protocols</div>
            </div>
          </button>

          <button
            onClick={onEmergency}
            className="flex flex-col items-center justify-center gap-2 px-6 py-5 bg-rig-critical/15 border-2 border-rig-critical/70 rounded-xl text-rig-critical hover:bg-rig-critical/25 hover:border-rig-critical transition-colors group glow-critical"
          >
            <Siren size={28} className="group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="font-bold uppercase tracking-widest text-base">EMERGENCY</div>
              <div className="text-[10px] text-rig-critical/70 mt-0.5">Start incident response now</div>
            </div>
          </button>
        </div>

        {compiledProtocols === 0 && (
          <p className="text-[10px] uppercase tracking-widest text-rig-dim text-center -mt-1">
            Emergency will use built-in fallback protocols if audit has not been run
          </p>
        )}
      </div>
    </motion.div>
  );
}

function StatusCard({
  label, value, icon, tone, sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'ok' | 'critical' | 'dim';
  sub?: string;
}) {
  const toneCol = {
    ok: 'text-rig-ok',
    critical: 'text-rig-critical',
    dim: 'text-rig-dim',
  }[tone];

  return (
    <div className="bg-rig-bg border border-rig-dim/20 rounded-lg p-3">
      <div className={clsx('flex items-center gap-1.5 mb-1.5', toneCol)}>
        {icon}
        <span className="text-[9px] uppercase tracking-widest font-bold">{label}</span>
      </div>
      <div className="text-xs font-mono text-rig-text leading-snug">{value}</div>
      {sub && <div className="text-[9px] text-rig-dim mt-0.5">{sub}</div>}
    </div>
  );
}

function ProfileCell({
  icon, label, value, sub, tone = 'ok',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'critical';
}) {
  const toneCol = tone === 'critical' ? 'text-rig-critical' : 'text-rig-accent';
  return (
    <div className="bg-rig-bg border border-rig-dim/20 rounded p-3">
      <div className={clsx('flex items-center gap-1.5 mb-1.5', toneCol)}>
        {icon}
        <span className="text-[9px] uppercase tracking-widest font-bold">{label}</span>
      </div>
      <div className="text-xs text-rig-text leading-snug line-clamp-2">{value}</div>
      {sub && <div className="text-[10px] text-rig-dim mt-0.5 line-clamp-1">{sub}</div>}
    </div>
  );
}

function ReadinessItem({
  icon, label, value, ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={clsx('mt-0.5 shrink-0', ok ? 'text-rig-ok' : 'text-rig-dim')}>{icon}</span>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-rig-dim">{label}</div>
        <div className={clsx('text-xs mt-0.5', ok ? 'text-rig-text' : 'text-rig-dim')}>{value}</div>
      </div>
    </div>
  );
}

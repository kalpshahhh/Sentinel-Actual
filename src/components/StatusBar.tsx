import { useEffect, useState } from 'react';
import { Battery, BatteryCharging, Wifi, WifiOff, MapPin } from 'lucide-react';
import clsx from 'clsx';
import type { AppMode, Vessel } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { useBattery } from '../hooks/useBattery';
import { useDevice } from '../hooks/useDevice';

type Props = {
  vessel: Vessel;
  caseId: string;
  satelliteCountdownSec: number;
  mode: AppMode;
  /** Operator view hides demo-only chrome. */
  operatorMode: boolean;
};

function fmtCoord(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr} ${lngStr}`;
}

function fmtCountdown(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function StatusBar({ vessel, caseId, satelliteCountdownSec, mode, operatorMode }: Props) {
  const [now, setNow] = useState(new Date());
  const geo = useGeolocation();
  const battery = useBattery();
  const device = useDevice();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toTimeString().slice(0, 8);
  const isIncident = mode === 'incident';

  // Prefer real GPS over hardcoded vessel coords
  const usingRealGps = geo.status === 'granted' && geo.lat !== null && geo.lng !== null;
  const coordText = usingRealGps
    ? fmtCoord(geo.lat!, geo.lng!)
    : geo.status === 'pending'
    ? 'Locating…'
    : geo.status === 'denied'
    ? `${fmtCoord(vessel.lat, vessel.lng)} (sim)`
    : geo.status === 'unsupported'
    ? `${fmtCoord(vessel.lat, vessel.lng)} (no GPS)`
    : `${fmtCoord(vessel.lat, vessel.lng)} (sim)`;

  // Battery
  const battPct = battery.supported && battery.level !== null ? Math.round(battery.level * 100) : null;
  const charging = battery.charging === true;

  return (
    <div
      className={clsx(
        'relative z-10 h-12 shrink-0 bg-rig-surface border-b border-rig-dim/20 px-4 flex items-center justify-between',
        isIncident && 'border-b-rig-accent/60'
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col leading-tight">
          <span className="uppercase tracking-widest text-sm text-rig-text font-bold">{vessel.name}</span>
          <span className="text-[10px] uppercase tracking-wider text-rig-dim">
            {operatorMode ? device.label : `${vessel.type} · ${device.label}`}
          </span>
        </div>
      </div>

      {/* Center */}
      <div className="flex items-center gap-4 text-xs font-mono text-rig-dim">
        <div className="flex items-center gap-1">
          <MapPin size={11} className={usingRealGps ? 'text-rig-ok' : 'text-rig-dim'} />
          <span className={usingRealGps ? 'text-rig-text' : 'text-rig-dim'} title={usingRealGps ? `Live GPS · accuracy ±${Math.round(geo.accuracyMeters ?? 0)}m` : 'Simulated coords'}>
            {coordText}
          </span>
        </div>
        {!operatorMode && (
          <>
            <span className="text-rig-dim">|</span>
            <span>{vessel.weatherCondition}</span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-rig-ok">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-rig-ok pulse-dot" />
          </span>
          {navigator.onLine ? <Wifi size={12} className="text-rig-ok" /> : <WifiOff size={12} className="text-rig-ok" />}
          <span className="uppercase tracking-widest">{navigator.onLine ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        <span className="text-rig-dim">|</span>
        <div className="flex items-center gap-1 text-rig-text">
          <Wifi size={12} className="text-rig-dim" />
          <span className="text-rig-dim">SAT</span>
          <span className="text-rig-accent">{fmtCountdown(satelliteCountdownSec)}</span>
        </div>
        <span className="text-rig-dim">|</span>
        <div className="flex items-center gap-1" title={battery.supported ? 'Real device battery' : 'Battery API not supported in this browser'}>
          {charging ? (
            <BatteryCharging size={14} className="text-rig-ok" />
          ) : (
            <Battery size={14} className={battPct !== null && battPct < 20 ? 'text-rig-critical' : 'text-rig-ok'} />
          )}
          <span className={battPct !== null && battPct < 20 ? 'text-rig-critical' : 'text-rig-text'}>
            {battPct !== null ? `${battPct}%` : '—'}
          </span>
        </div>
        {!operatorMode && (
          <>
            <span className="text-rig-dim">|</span>
            <span className="text-rig-text">{caseId}</span>
          </>
        )}
        <span className="text-rig-dim">|</span>
        <span className="text-rig-text">{timeStr}</span>
      </div>
    </div>
  );
}

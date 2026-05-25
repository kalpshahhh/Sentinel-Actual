import { useEffect, useState } from 'react';
import { Battery, BatteryCharging, Wifi, WifiOff, MapPin, FlaskConical, Wind } from 'lucide-react';
import clsx from 'clsx';
import type { AppMode, Vessel } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { useBattery } from '../hooks/useBattery';
import { useDevice } from '../hooks/useDevice';
import { useWeather } from '../hooks/useWeather';

// Fixed training coordinates — North Sea platform
const DEMO_LAT = 56.234;
const DEMO_LNG = 3.456;
const DEMO_BATTERY = 85;

type Props = {
  vessel: Vessel;
  caseId: string;
  satelliteCountdownSec: number; // kept for HandoffMode compat — not shown in statusbar
  mode: AppMode;
  operatorMode: boolean;
  inventoryLoaded?: boolean;
  isDemo?: boolean;
  demoOffline?: boolean;
  onToggleDemoOffline?: () => void;
};

function fmtCoord(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr} ${lngStr}`;
}

export function StatusBar({
  vessel, caseId, mode, operatorMode,
  inventoryLoaded, isDemo = false, demoOffline = false, onToggleDemoOffline,
}: Props) {
  const [now, setNow] = useState(new Date());
  const geo = useGeolocation();
  const battery = useBattery();
  const device = useDevice();

  // Resolve coords for weather fetch
  const resolvedLat = isDemo ? DEMO_LAT : (geo.status === 'granted' && geo.lat !== null ? geo.lat : vessel.lat);
  const resolvedLng = isDemo ? DEMO_LNG : (geo.status === 'granted' && geo.lng !== null ? geo.lng : vessel.lng);
  const weather = useWeather(resolvedLat, resolvedLng);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toTimeString().slice(0, 8);
  const isIncident = mode === 'incident';

  // GPS display
  let coordText: string;
  if (isDemo) {
    coordText = `${fmtCoord(DEMO_LAT, DEMO_LNG)} (sim)`;
  } else {
    const usingRealGps = geo.status === 'granted' && geo.lat !== null && geo.lng !== null;
    coordText = usingRealGps
      ? fmtCoord(geo.lat!, geo.lng!)
      : geo.status === 'pending'
      ? 'Locating…'
      : `${fmtCoord(vessel.lat, vessel.lng)} (sim)`;
  }

  // Battery
  const battPct = isDemo ? DEMO_BATTERY : (battery.supported && battery.level !== null ? Math.round(battery.level * 100) : null);
  const charging = isDemo ? false : battery.charging === true;

  // Online status
  const effectiveOnline = isDemo ? !demoOffline : navigator.onLine;

  // Weather display — use real data when available, else vessel preset
  const weatherText = weather
    ? `${weather.condition} · ${weather.tempC}°C`
    : vessel.weatherCondition;

  return (
    <div
      className={clsx(
        'relative z-10 h-12 shrink-0 bg-rig-surface border-b border-rig-dim/20 px-3 flex items-center justify-between gap-2',
        isIncident && 'border-b-rig-accent/60',
        isDemo && 'border-b-rig-accent/40'
      )}
    >
      {/* Left — vessel name + mode badge */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="uppercase tracking-widest text-sm text-rig-text font-bold truncate max-w-[120px]">{vessel.name}</span>
            {isDemo && (
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-rig-accent border border-rig-accent/40 rounded px-1.5 py-0.5 font-bold shrink-0">
                <FlaskConical size={8} /> SIM
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-rig-dim truncate">
            {operatorMode ? device.label : `${vessel.type} · ${device.label}`}
          </span>
        </div>
      </div>

      {/* Center — GPS + weather */}
      <div className="flex items-center gap-3 text-xs font-mono text-rig-dim flex-1 min-w-0 justify-center">
        <div className="flex items-center gap-1 min-w-0">
          <MapPin size={11} className={isDemo ? 'text-rig-dim shrink-0' : (geo.status === 'granted' ? 'text-rig-ok shrink-0' : 'text-rig-dim shrink-0')} />
          <span className="truncate">{coordText}</span>
        </div>
        {!operatorMode && weather && (
          <>
            <span className="text-rig-dim/50">·</span>
            <div className="flex items-center gap-1 shrink-0">
              <Wind size={10} className="text-rig-dim" />
              <span className="truncate">{weatherText}</span>
            </div>
          </>
        )}
        {!operatorMode && !weather && (
          <>
            <span className="text-rig-dim/50">·</span>
            <span className="shrink-0">{vessel.weatherCondition}</span>
          </>
        )}
      </div>

      {/* Right — connection + battery + time */}
      <div className="flex items-center gap-2.5 text-xs font-mono shrink-0">
        {/* Online / offline indicator */}
        <div className="flex items-center gap-1.5" style={{ color: effectiveOnline ? 'var(--rig-ok)' : 'var(--rig-dim)' }}>
          <span className="relative inline-flex h-2 w-2">
            <span className={clsx('absolute inset-0 rounded-full', effectiveOnline ? 'bg-rig-ok pulse-dot' : 'bg-rig-dim')} />
          </span>
          {effectiveOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="uppercase tracking-widest text-[10px]">{effectiveOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        {/* Demo offline toggle */}
        {isDemo && onToggleDemoOffline && (
          <button
            onClick={onToggleDemoOffline}
            className="text-[9px] uppercase tracking-widest border border-rig-dim/40 rounded px-1.5 py-0.5 text-rig-dim hover:text-rig-accent hover:border-rig-accent/40"
          >
            {demoOffline ? 'go online' : 'sim offline'}
          </button>
        )}

        {inventoryLoaded && (
          <>
            <span className="text-rig-dim/40">|</span>
            <span className="text-[10px] uppercase tracking-widest text-rig-accent font-bold">OFFLINE READY</span>
          </>
        )}

        <span className="text-rig-dim/40">|</span>
        <div className="flex items-center gap-1" title={isDemo ? 'Simulated battery' : (battery.supported ? 'Real device battery' : 'Battery API not supported on this browser')}>
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
            <span className="text-rig-dim/40">|</span>
            <span className="text-rig-text">{caseId}</span>
          </>
        )}
        <span className="text-rig-dim/40">|</span>
        <span className="text-rig-text">{timeStr}</span>
      </div>
    </div>
  );
}

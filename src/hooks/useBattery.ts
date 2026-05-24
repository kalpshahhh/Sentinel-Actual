import { useEffect, useState } from 'react';

export type BatteryState = {
  supported: boolean;
  /** 0-1 charge fraction; null when not supported. */
  level: number | null;
  charging: boolean | null;
  chargingTimeSec: number | null;
  dischargingTimeSec: number | null;
};

type BatteryManager = EventTarget & {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
};

type NavWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManager>;
};

/**
 * Reads the real device battery level via the Battery Status API.
 * Works on Chrome, Edge, Opera, Firefox (Android). NOT on Safari (Apple removed it
 * citing fingerprinting concerns). Returns supported=false there.
 */
export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    supported: false,
    level: null,
    charging: null,
    chargingTimeSec: null,
    dischargingTimeSec: null,
  });

  useEffect(() => {
    const nav = navigator as NavWithBattery;
    if (typeof nav.getBattery !== 'function') {
      setState((s) => ({ ...s, supported: false }));
      return;
    }
    let battery: BatteryManager | null = null;
    let cancelled = false;
    const update = () => {
      if (!battery) return;
      setState({
        supported: true,
        level: battery.level,
        charging: battery.charging,
        chargingTimeSec: battery.chargingTime === Infinity ? null : battery.chargingTime,
        dischargingTimeSec: battery.dischargingTime === Infinity ? null : battery.dischargingTime,
      });
    };
    void nav.getBattery!().then((b) => {
      if (cancelled) return;
      battery = b;
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
      b.addEventListener('chargingtimechange', update);
      b.addEventListener('dischargingtimechange', update);
    });
    return () => {
      cancelled = true;
      if (battery) {
        battery.removeEventListener('levelchange', update);
        battery.removeEventListener('chargingchange', update);
        battery.removeEventListener('chargingtimechange', update);
        battery.removeEventListener('dischargingtimechange', update);
      }
    };
  }, []);

  return state;
}

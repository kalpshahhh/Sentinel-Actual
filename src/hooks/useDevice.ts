import { useMemo } from 'react';

export type Platform =
  | 'iphone'
  | 'ipad'
  | 'android_phone'
  | 'android_tablet'
  | 'mac'
  | 'windows'
  | 'linux'
  | 'unknown';

export type DeviceInfo = {
  platform: Platform;
  /** Friendly name for the UI. */
  label: string;
  /** Touch screen detected. */
  hasTouch: boolean;
  /** Web Bluetooth API supported (Chrome/Edge desktop + Android Chrome — NOT Safari/iOS). */
  hasWebBluetooth: boolean;
  /** Web NFC API supported (Chrome Android only). */
  hasWebNfc: boolean;
  /** DeviceMotion API present (gyroscope/accelerometer). iOS Safari requires explicit permission. */
  hasDeviceMotion: boolean;
  /** Geolocation API present. */
  hasGeolocation: boolean;
  /** Battery Status API present (Chrome/Edge — NOT Safari). */
  hasBatteryAPI: boolean;
  /** Whether iOS Safari needs explicit permission for DeviceMotion. */
  motionNeedsPermission: boolean;
};

declare global {
  interface Navigator {
    bluetooth?: unknown;
  }
}

type WithNDEFReader = typeof globalThis & { NDEFReader?: unknown };

export function useDevice(): DeviceInfo {
  return useMemo(() => detect(), []);
}

function detect(): DeviceInfo {
  if (typeof navigator === 'undefined') {
    return {
      platform: 'unknown',
      label: 'Unknown',
      hasTouch: false,
      hasWebBluetooth: false,
      hasWebNfc: false,
      hasDeviceMotion: false,
      hasGeolocation: false,
      hasBatteryAPI: false,
      motionNeedsPermission: false,
    };
  }
  const ua = navigator.userAgent;
  const platform: Platform = (() => {
    if (/iPad/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return 'ipad';
    if (/iPhone|iPod/.test(ua)) return 'iphone';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'android_phone' : 'android_tablet';
    if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
    if (/Windows/.test(ua)) return 'windows';
    if (/Linux/.test(ua)) return 'linux';
    return 'unknown';
  })();
  const label: Record<Platform, string> = {
    iphone: 'iPhone',
    ipad: 'iPad',
    android_phone: 'Android phone',
    android_tablet: 'Android tablet',
    mac: 'Mac',
    windows: 'Windows PC',
    linux: 'Linux PC',
    unknown: 'Unknown device',
  };

  const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const hasWebBluetooth = typeof navigator.bluetooth !== 'undefined';
  const hasWebNfc = typeof (globalThis as WithNDEFReader).NDEFReader !== 'undefined';
  const hasDeviceMotion = typeof DeviceMotionEvent !== 'undefined';
  const hasGeolocation = typeof navigator.geolocation !== 'undefined';
  const hasBatteryAPI = typeof (navigator as { getBattery?: () => unknown }).getBattery === 'function';
  const motionNeedsPermission =
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function';

  return {
    platform,
    label: label[platform],
    hasTouch,
    hasWebBluetooth,
    hasWebNfc,
    hasDeviceMotion,
    hasGeolocation,
    hasBatteryAPI,
    motionNeedsPermission,
  };
}

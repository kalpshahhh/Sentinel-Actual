import { useCallback, useEffect, useState } from 'react';

export type GyroState = {
  /** Whether DeviceMotion / DeviceOrientation is available at all. */
  supported: boolean;
  /** iOS Safari requires explicit user gesture to enable. */
  needsPermission: boolean;
  permissionState: 'unknown' | 'granted' | 'denied';
  /** Pitch in degrees (front-back tilt). */
  pitch: number;
  /** Roll in degrees (side-to-side tilt). */
  roll: number;
  /** Magnitude of motion 0-10 — used by App.tsx to auto-trip rough seas. */
  motionLevel: number;
};

type IOSDeviceMotionEvent = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};
type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/**
 * Wraps DeviceMotion + DeviceOrientation. iOS Safari requires .requestPermission()
 * to be called from a user gesture. Android Chrome / desktop need no permission.
 */
export function useGyro() {
  const supported =
    typeof window !== 'undefined' &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceMotionEvent !== 'undefined';

  const needsPermission =
    supported &&
    (typeof (DeviceOrientationEvent as IOSDeviceOrientationEvent).requestPermission === 'function' ||
      typeof (DeviceMotionEvent as IOSDeviceMotionEvent).requestPermission === 'function');

  const [state, setState] = useState<GyroState>({
    supported,
    needsPermission,
    permissionState: 'unknown',
    pitch: 0,
    roll: 0,
    motionLevel: 0,
  });

  const enable = useCallback(async () => {
    if (!supported) return false;
    try {
      if (typeof (DeviceOrientationEvent as IOSDeviceOrientationEvent).requestPermission === 'function') {
        const res = await (DeviceOrientationEvent as IOSDeviceOrientationEvent).requestPermission!();
        const granted = res === 'granted';
        setState((s) => ({ ...s, permissionState: granted ? 'granted' : 'denied' }));
        if (!granted) return false;
      }
      if (typeof (DeviceMotionEvent as IOSDeviceMotionEvent).requestPermission === 'function') {
        const res = await (DeviceMotionEvent as IOSDeviceMotionEvent).requestPermission!();
        const granted = res === 'granted';
        setState((s) => ({ ...s, permissionState: granted ? 'granted' : 'denied' }));
        if (!granted) return false;
      }
      setState((s) => ({ ...s, permissionState: 'granted' }));
      return true;
    } catch {
      setState((s) => ({ ...s, permissionState: 'denied' }));
      return false;
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    // Non-iOS browsers just start listening. iOS waits for enable().
    if (needsPermission && state.permissionState !== 'granted') return;

    const handleOrient = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0; // front-back -180..180
      const gamma = e.gamma ?? 0; // left-right -90..90
      setState((s) => ({ ...s, pitch: clampAngle(beta), roll: clampAngle(gamma) }));
    };
    const handleMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      const deviation = Math.abs(mag - 9.8);
      const level = Math.min(10, Math.round(deviation * 1.5));
      setState((s) => ({ ...s, motionLevel: level }));
    };

    window.addEventListener('deviceorientation', handleOrient);
    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('deviceorientation', handleOrient);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [supported, needsPermission, state.permissionState]);

  return { ...state, enable };
}

function clampAngle(a: number): number {
  return Math.max(-90, Math.min(90, a));
}

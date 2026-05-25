import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Real-device motion-compensation engine.
 *
 * Reads DeviceOrientation gamma/beta, applies low-pass smoothing, clamps to a
 * safe operational range, and returns inverse-rotation transforms for the
 * operational UI layer.
 *
 * Critical implementation notes:
 *   1. Event-driven only. There is NO requestAnimationFrame loop — on desktop
 *      Chrome, DeviceOrientationEvent is defined but never fires, and a
 *      60 fps setState loop would re-render the whole app and starve
 *      Framer Motion animations (this was the cause of the post-click blank
 *      screen in Chrome localhost).
 *   2. We only attach listeners on devices that actually have motion sensors
 *      (touch input or known mobile UA). Desktops skip out entirely.
 *   3. state updates are skipped if the smoothed values haven't changed
 *      meaningfully — avoids React re-renders that cost more than they're
 *      worth.
 *   4. A single setInterval detects "stream stalled" (no events for >2s) and
 *      flips streaming back to false so the MOTION COMP indicator goes away
 *      when the operator stops moving.
 */

export type GyroStabilizationState = {
  supported: boolean;
  needsPermission: boolean;
  permissionState: 'unknown' | 'granted' | 'denied';
  active: boolean;
  smoothedRoll: number;
  smoothedPitch: number;
  compensationDeg: number;
  compensationY: number;
  motionLevel: number;
  streaming: boolean;
};

type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};
type IOSDeviceMotionEvent = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

const MAX_ROTATE_DEG = 8;
const MAX_TRANSLATE_PX = 6;
const SMOOTHING_ALPHA = 0.18;
const DEAD_ZONE_DEG = 1.2;
const STREAM_TIMEOUT_MS = 2000;

function isLikelyMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if ('ontouchstart' in window) return true;
  if ((navigator.maxTouchPoints ?? 0) > 0) return true;
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent ?? '')) return true;
  return false;
}

function clampRange(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function useGyroStabilization(enabled: boolean = true) {
  // Real "supported" is BOTH the API existing AND the device being plausibly
  // capable of providing data. A desktop with DeviceOrientationEvent defined
  // but no sensors is effectively unsupported.
  const apiPresent =
    typeof window !== 'undefined' &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceMotionEvent !== 'undefined';

  const supported = apiPresent && isLikelyMobile();

  const needsPermission =
    supported &&
    (typeof (DeviceOrientationEvent as IOSDeviceOrientationEvent).requestPermission === 'function' ||
      typeof (DeviceMotionEvent as IOSDeviceMotionEvent).requestPermission === 'function');

  const [state, setState] = useState<GyroStabilizationState>({
    supported,
    needsPermission,
    permissionState: 'unknown',
    active: false,
    smoothedRoll: 0,
    smoothedPitch: 0,
    compensationDeg: 0,
    compensationY: 0,
    motionLevel: 0,
    streaming: false,
  });

  const smoothedRef = useRef({ roll: 0, pitch: 0, motion: 0 });
  const lastEventRef = useRef<number>(0);

  const enable = useCallback(async () => {
    if (!supported) return false;
    try {
      const orientCtor = DeviceOrientationEvent as IOSDeviceOrientationEvent;
      const motionCtor = DeviceMotionEvent as IOSDeviceMotionEvent;
      if (typeof orientCtor.requestPermission === 'function') {
        const res = await orientCtor.requestPermission!();
        if (res !== 'granted') {
          setState((s) => ({ ...s, permissionState: 'denied' }));
          return false;
        }
      }
      if (typeof motionCtor.requestPermission === 'function') {
        const res = await motionCtor.requestPermission!();
        if (res !== 'granted') {
          setState((s) => ({ ...s, permissionState: 'denied' }));
          return false;
        }
      }
      setState((s) => ({ ...s, permissionState: 'granted' }));
      return true;
    } catch {
      setState((s) => ({ ...s, permissionState: 'denied' }));
      return false;
    }
  }, [supported]);

  useEffect(() => {
    if (!supported || !enabled) return;
    if (needsPermission && state.permissionState !== 'granted') return;

    const handleOrient = (e: DeviceOrientationEvent) => {
      const rawRoll = clampRange(e.gamma ?? 0, -45, 45);
      const rawPitch = clampRange(e.beta ?? 0, -45, 45);

      smoothedRef.current.roll += SMOOTHING_ALPHA * (rawRoll - smoothedRef.current.roll);
      smoothedRef.current.pitch += SMOOTHING_ALPHA * (rawPitch - smoothedRef.current.pitch);
      lastEventRef.current = Date.now();

      const r = smoothedRef.current.roll;
      const p = smoothedRef.current.pitch;
      const usableRoll = Math.abs(r) < DEAD_ZONE_DEG ? 0 : r;
      const usablePitch = Math.abs(p) < DEAD_ZONE_DEG ? 0 : p;
      const compDeg = clampRange(-usableRoll * 0.5, -MAX_ROTATE_DEG, MAX_ROTATE_DEG);
      const compY = clampRange(-usablePitch * 0.15, -MAX_TRANSLATE_PX, MAX_TRANSLATE_PX);

      setState((s) => {
        // Skip a render if compensation values haven't changed meaningfully.
        if (
          s.streaming &&
          Math.abs(s.compensationDeg - compDeg) < 0.08 &&
          Math.abs(s.compensationY - compY) < 0.08
        ) {
          return s;
        }
        return {
          ...s,
          smoothedRoll: usableRoll,
          smoothedPitch: usablePitch,
          compensationDeg: compDeg,
          compensationY: compY,
          streaming: true,
          active: true,
        };
      });
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      const dev = Math.abs(mag - 9.8);
      smoothedRef.current.motion += 0.25 * (Math.min(10, dev * 1.5) - smoothedRef.current.motion);
      lastEventRef.current = Date.now();
    };

    // Stream-stall watchdog — flip streaming=false if no events for 2s.
    const watchdog = window.setInterval(() => {
      if (lastEventRef.current === 0) return;
      if (Date.now() - lastEventRef.current > STREAM_TIMEOUT_MS) {
        setState((s) => (s.streaming ? { ...s, streaming: false, active: false } : s));
      }
    }, 1000);

    window.addEventListener('deviceorientation', handleOrient);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('deviceorientation', handleOrient);
      window.removeEventListener('devicemotion', handleMotion);
      window.clearInterval(watchdog);
    };
  }, [supported, enabled, needsPermission, state.permissionState]);

  return { ...state, enable };
}

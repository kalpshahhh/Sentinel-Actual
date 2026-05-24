import { useEffect } from 'react';

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export function useMotion(onMotionLevel: (level: number) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof DeviceMotionEvent === 'undefined') return;

    const eventCtor = DeviceMotionEvent as DeviceMotionEventWithPermission;

    let cancelled = false;
    let attached = false;

    function handler(e: DeviceMotionEvent) {
      if (cancelled) return;
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const magnitude = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      // Magnitude ~9.8 baseline at rest. Map deviation to 0-10.
      const deviation = Math.abs(magnitude - 9.8);
      const level = Math.min(10, Math.round(deviation * 1.5));
      onMotionLevel(level);
    }

    async function init() {
      try {
        if (typeof eventCtor.requestPermission === 'function') {
          // iOS 13+ requires permission, but we can't prompt silently. Skip silently.
          return;
        }
        window.addEventListener('devicemotion', handler);
        attached = true;
      } catch {
        // No device motion available — fall back to manual toggle
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (attached) window.removeEventListener('devicemotion', handler);
    };
  }, [onMotionLevel]);
}

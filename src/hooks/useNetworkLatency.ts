import { useEffect, useRef, useState } from 'react';

/**
 * Best-effort latency / operational-remoteness ping.
 *
 * This is NOT geographic distance — it's signal-quality awareness for
 * remote-environment ops. We HEAD a tiny CORS-friendly endpoint and time the round trip.
 * If the device is offline, we report it. If pings are slow, we classify
 * the link as remote / very-remote, which informs the operator how reliable
 * any cloud-assisted operation (telemed sync, handoff push) will feel.
 *
 * We use Cloudflare's edge as the probe target — it has a global Anycast
 * network so the latency reflects the LOCAL link quality more than the
 * distance to a specific server. Safe CORS, no auth.
 */

export type LatencyClass = 'near' | 'remote' | 'very_remote' | 'offline' | 'unknown';

export type NetworkLatencyState = {
  latencyMs: number | null;
  classification: LatencyClass;
  online: boolean;
  lastChecked: Date | null;
  /** True while a probe is in flight. */
  probing: boolean;
};

const PROBE_URL = 'https://www.cloudflare.com/cdn-cgi/trace';
const PROBE_INTERVAL_MS = 30_000;
const TIMEOUT_MS = 6_000;

function classify(ms: number | null, online: boolean): LatencyClass {
  if (!online) return 'offline';
  if (ms === null) return 'unknown';
  if (ms < 150) return 'near';
  if (ms < 600) return 'remote';
  return 'very_remote';
}

export function useNetworkLatency(enabled: boolean = true) {
  const [state, setState] = useState<NetworkLatencyState>(() => ({
    latencyMs: null,
    classification: navigator.onLine ? 'unknown' : 'offline',
    online: navigator.onLine,
    lastChecked: null,
    probing: false,
  }));

  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    cancelledRef.current = false;

    const handleOnline = () => setState((s) => ({ ...s, online: true, classification: classify(s.latencyMs, true) }));
    const handleOffline = () => setState((s) => ({ ...s, online: false, classification: 'offline' }));

    async function probe() {
      if (cancelledRef.current) return;
      if (!navigator.onLine) {
        setState((s) => ({ ...s, online: false, classification: 'offline', probing: false, lastChecked: new Date() }));
        return;
      }
      setState((s) => ({ ...s, probing: true }));
      const start = performance.now();
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        await fetch(`${PROBE_URL}?_=${start}`, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-store',
          signal: ctrl.signal,
        });
        const ms = Math.round(performance.now() - start);
        if (cancelledRef.current) return;
        setState({
          latencyMs: ms,
          classification: classify(ms, true),
          online: true,
          lastChecked: new Date(),
          probing: false,
        });
      } catch {
        if (cancelledRef.current) return;
        setState((s) => ({
          ...s,
          latencyMs: null,
          classification: navigator.onLine ? 'very_remote' : 'offline',
          probing: false,
          lastChecked: new Date(),
        }));
      } finally {
        window.clearTimeout(timer);
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void probe();
    const interval = window.setInterval(() => void probe(), PROBE_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(interval);
    };
  }, [enabled]);

  return state;
}

export function latencyLabel(c: LatencyClass): string {
  switch (c) {
    case 'near':
      return 'LINK STRONG';
    case 'remote':
      return 'LINK REMOTE';
    case 'very_remote':
      return 'LINK DEGRADED';
    case 'offline':
      return 'OFFLINE';
    case 'unknown':
      return 'CHECKING…';
  }
}

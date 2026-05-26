import { useCallback, useEffect, useState } from 'react';

export type NetworkInfo = {
  /** Real network class (wifi/cellular/etc) from the Network Information API. */
  effectiveType: string | null;
  downlinkMbps: number | null;
  rttMs: number | null;
  type: string | null;
  online: boolean;
};

export type LocalIpResult = {
  /** Best-effort local IP from WebRTC ICE. Often returned as an mDNS placeholder ("xxx.local") on Chrome. */
  address: string | null;
  /** Whether the returned string is a real IPv4, an mDNS placeholder, or unknown. */
  kind: 'ipv4' | 'ipv6' | 'mdns' | 'unknown' | null;
  error: string | null;
};

export type ProbeResult = {
  ip: string;
  reachable: boolean;
  /** How long the probe took (timed out at 1500ms). */
  ms: number | null;
  /** Whatever the probe returned, if anything. Often empty because CORS blocks reads. */
  bodyPreview: string | null;
  note: string;
};

/**
 * Real-but-limited LAN inspection.
 *
 * What it CAN do:
 *   - Read your own local IP via WebRTC ICE (may be mDNS-obfuscated on Chrome).
 *   - Read Network Information API: type, downlink, RTT.
 *   - Attempt a CORS-bounded fetch against a list of known device IPs you (or
 *     the install-time manifest) provide.
 *
 * What it CANNOT do, because no browser exposes it:
 *   - Enumerate other devices on the LAN.
 *   - Port-scan.
 *   - Read responses from arbitrary servers that don't send CORS headers.
 *
 * For real LAN device discovery, a Sentinel install would ship as a native
 * shell (Capacitor / Electron / Tauri) with an OS-level mDNS / ARP scanner.
 */
export function useNetworkScan() {
  const [info, setInfo] = useState<NetworkInfo>({
    effectiveType: null,
    downlinkMbps: null,
    rttMs: null,
    type: null,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const [localIp, setLocalIp] = useState<LocalIpResult>({ address: null, kind: null, error: null });
  const [probing, setProbing] = useState(false);
  const [probes, setProbes] = useState<ProbeResult[]>([]);

  // === Network Information API ===
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const conn = (navigator as Navigator & { connection?: NetConn }).connection;
    const update = () => {
      if (conn) {
        setInfo({
          effectiveType: conn.effectiveType ?? null,
          downlinkMbps: conn.downlink ?? null,
          rttMs: conn.rtt ?? null,
          type: conn.type ?? null,
          online: navigator.onLine,
        });
      } else {
        setInfo((s) => ({ ...s, online: navigator.onLine }));
      }
    };
    update();
    conn?.addEventListener?.('change', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      conn?.removeEventListener?.('change', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // === WebRTC local IP discovery ===
  const findLocalIp = useCallback(async () => {
    if (typeof RTCPeerConnection === 'undefined') {
      setLocalIp({ address: null, kind: null, error: 'WebRTC not supported in this browser' });
      return;
    }
    setLocalIp({ address: null, kind: null, error: null });
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('probe');
      const candidates: string[] = [];
      pc.addEventListener('icecandidate', (e) => {
        const c = e.candidate?.candidate;
        if (c) candidates.push(c);
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        const done = () => resolve();
        setTimeout(done, 1500);
        pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') done();
        });
      });
      pc.close();

      // Parse candidates for IP-looking tokens.
      const ipRe = /([0-9a-zA-Z._-]+\.local|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-fA-F0-9:]{4,})/g;
      let best: { addr: string; kind: LocalIpResult['kind'] } | null = null;
      for (const cand of candidates) {
        // Skip relayed
        if (cand.includes('typ host') === false) continue;
        const tokens = cand.match(ipRe) ?? [];
        for (const tok of tokens) {
          if (tok.endsWith('.local')) {
            if (!best) best = { addr: tok, kind: 'mdns' };
          } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(tok)) {
            // skip 0.0.0.0 / loopback
            if (tok.startsWith('0.') || tok.startsWith('127.')) continue;
            best = { addr: tok, kind: 'ipv4' };
            break;
          } else if (tok.includes(':') && tok.length > 4 && !best) {
            best = { addr: tok, kind: 'ipv6' };
          }
        }
        if (best?.kind === 'ipv4') break;
      }

      if (best) {
        setLocalIp({ address: best.addr, kind: best.kind, error: null });
      } else {
        setLocalIp({ address: null, kind: null, error: 'No host ICE candidates returned' });
      }
    } catch (err) {
      setLocalIp({ address: null, kind: null, error: (err as Error).message });
    }
  }, []);

  // Auto-run once at mount
  useEffect(() => {
    void findLocalIp();
  }, [findLocalIp]);

  // === IP probing ===
  const probeIps = useCallback(async (ips: string[]) => {
    setProbing(true);
    const results: ProbeResult[] = [];
    await Promise.all(
      ips.map(async (raw) => {
        const ip = raw.trim();
        if (!ip) return;
        const url = ip.startsWith('http') ? ip : `http://${ip}/`;
        const start = performance.now();
        let res: ProbeResult;
        try {
          const ac = new AbortController();
          const to = setTimeout(() => ac.abort(), 1500);
          // Use no-cors so we don't get a CORS error on probe — but we won't be
          // able to read the response. We just verify the network reached *something*.
          const r = await fetch(url, { signal: ac.signal, mode: 'no-cors', cache: 'no-store' });
          clearTimeout(to);
          const elapsed = Math.round(performance.now() - start);
          res = {
            ip,
            reachable: true,
            ms: elapsed,
            bodyPreview: null,
            note: r.type === 'opaque' ? 'responded (opaque — CORS hides body)' : 'responded',
          };
          // Best effort: if it's CORS-friendly, try a real read.
          try {
            const r2 = await fetch(url, { mode: 'cors', cache: 'no-store' });
            const text = (await r2.text()).slice(0, 240);
            res.bodyPreview = text || null;
            res.note = 'responded with CORS-readable body';
          } catch {
            /* ignore — keep opaque */
          }
        } catch (err) {
          const elapsed = Math.round(performance.now() - start);
          const msg = (err as Error).message;
          res = {
            ip,
            reachable: false,
            ms: elapsed,
            bodyPreview: null,
            note: msg.includes('aborted') ? 'timeout (1500ms)' : msg.includes('Failed to fetch') ? 'unreachable / blocked' : msg,
          };
        }
        results.push(res);
      })
    );
    setProbes((prev) => [...prev, ...results]);
    setProbing(false);
    return results;
  }, []);

  const clearProbes = useCallback(() => setProbes([]), []);

  return {
    info,
    localIp,
    probing,
    probes,
    findLocalIp,
    probeIps,
    clearProbes,
  };
}

type NetConn = EventTarget & {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  type?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Wifi, AlertTriangle, CheckCircle, Radio, Hourglass, XCircle } from 'lucide-react';
import { useNetworkScan, type ProbeResult } from '../hooks/useNetworkScan';

type Props = {
  /** Logged so probes show in the audit timeline. */
  onAudit?: (msg: string) => void;
};

/**
 * "Scan WiFi network" panel. Reads what the browser actually exposes (your own IP,
 * network type, downlink), and lets the operator type known device IPs to probe.
 * Honest about why it can't do more.
 */
export function WifiScanPanel({ onAudit }: Props) {
  const scan = useNetworkScan();
  const [ipInput, setIpInput] = useState('');
  const [showProbe, setShowProbe] = useState(false);

  const runProbe = async () => {
    const ips = ipInput
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ips.length === 0) return;
    onAudit?.(`WiFi probe started: ${ips.join(', ')}`);
    const res = await scan.probeIps(ips);
    const reachable = res.filter((r) => r.reachable).length;
    onAudit?.(`WiFi probe finished: ${reachable}/${res.length} reachable`);
  };

  const linkLabel =
    scan.info.effectiveType ?? (scan.info.type ?? (scan.info.online ? 'unknown' : 'offline'));

  return (
    <div className="bg-rig-bg/40 border border-rig-dim/30 rounded p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Wifi size={12} className="text-rig-accent" />
        <span className="text-[10px] uppercase tracking-widest text-rig-dim">WiFi / Network scan</span>
      </div>

      {/* Honest sandbox notice */}
      <div className="bg-rig-critical/10 border border-rig-critical/30 rounded p-2 mb-3">
        <div className="flex items-start gap-1.5 text-[10px] text-rig-critical font-mono">
          <AlertTriangle size={11} className="mt-[1px] shrink-0" />
          <div className="leading-relaxed">
            <strong>Browser sandbox limit:</strong> no browser lets a web page enumerate other devices on the LAN, scan ports, or read peer info — Chrome, Safari, and Firefox all block it for security. Below is what's actually possible from the browser. A deployed Sentinel ships as a native shell (Capacitor / Electron) for full mDNS / ARP scanning.
          </div>
        </div>
      </div>

      {/* Real network info */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <DataRow label="Link state" value={scan.info.online ? 'online' : 'offline'} tone={scan.info.online ? 'ok' : 'critical'} />
        <DataRow label="Link type" value={linkLabel ?? '—'} tone="ok" />
        <DataRow label="Downlink" value={scan.info.downlinkMbps ? `${scan.info.downlinkMbps.toFixed(1)} Mbps` : '—'} tone={scan.info.downlinkMbps ? 'ok' : 'dim'} />
        <DataRow label="RTT" value={scan.info.rttMs ? `${scan.info.rttMs} ms` : '—'} tone={scan.info.rttMs ? 'ok' : 'dim'} />
        <DataRow
          label="Your local IP"
          value={scan.localIp.address ?? (scan.localIp.error ? 'error' : '—')}
          tone={scan.localIp.address ? 'ok' : 'dim'}
          hint={scan.localIp.kind === 'mdns' ? 'mDNS placeholder (Chrome obfuscates the real IP for privacy)' : scan.localIp.kind === 'ipv4' ? 'real IPv4 from WebRTC ICE' : scan.localIp.error ?? undefined}
        />
        <DataRow label="WebRTC" value={typeof RTCPeerConnection !== 'undefined' ? 'supported' : 'no'} tone="ok" />
      </div>

      <button
        onClick={() => void scan.findLocalIp()}
        className="mt-2 text-[10px] text-rig-dim hover:text-rig-text underline underline-offset-2"
      >
        re-detect local IP
      </button>

      {/* Known-IP probe */}
      <div className="mt-3 border-t border-rig-dim/20 pt-3">
        <button
          onClick={() => setShowProbe((v) => !v)}
          className="text-[11px] uppercase tracking-widest text-rig-accent hover:text-rig-accent/80 flex items-center gap-1"
        >
          <Radio size={11} /> {showProbe ? 'Hide' : 'Show'} known-IP probe
        </button>

        <AnimatePresence>
          {showProbe && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <p className="text-[10px] text-rig-dim leading-relaxed mt-2">
                Type IPs (or full URLs) the install-time manifest knows about — e.g. medical devices that expose their own HTTP endpoint. Sentinel will fetch each with a 1.5s timeout. We can detect reachability either way; we can only read response bodies from devices that send proper CORS headers (most don't).
              </p>
              <textarea
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="192.168.1.50&#10;192.168.1.51&#10;http://lifepak15.local/status"
                rows={3}
                className="w-full mt-2 bg-rig-bg border border-rig-dim/30 rounded p-2 text-[11px] text-rig-text font-mono placeholder:text-rig-dim/60 focus:border-rig-accent focus:outline-none resize-none"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => void runProbe()}
                  disabled={scan.probing || !ipInput.trim()}
                  className={clsx(
                    'text-[11px] uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1',
                    scan.probing
                      ? 'bg-rig-dim/30 border-rig-dim/40 text-rig-dim cursor-wait'
                      : 'bg-rig-accent/15 border-rig-accent/40 text-rig-accent hover:bg-rig-accent/25'
                  )}
                >
                  {scan.probing ? <Hourglass size={10} className="animate-spin" /> : <Radio size={10} />}
                  {scan.probing ? 'Probing…' : 'Probe these IPs'}
                </button>
                {scan.probes.length > 0 && (
                  <button onClick={scan.clearProbes} className="text-[10px] text-rig-dim hover:text-rig-text underline">
                    clear results
                  </button>
                )}
              </div>

              {scan.probes.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {scan.probes.map((p, i) => (
                    <ProbeRow key={`${p.ip}_${i}`} probe={p} />
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'dim' | 'critical';
  hint?: string;
}) {
  const color = tone === 'critical' ? 'text-rig-critical' : tone === 'dim' ? 'text-rig-dim' : 'text-rig-ok';
  return (
    <div className="bg-rig-surface/40 border border-rig-dim/20 rounded px-2 py-1" title={hint}>
      <div className="text-[9px] uppercase tracking-wider text-rig-dim">{label}</div>
      <div className={clsx('text-xs font-mono truncate', color)}>{value}</div>
    </div>
  );
}

function ProbeRow({ probe }: { probe: ProbeResult }) {
  return (
    <li className="bg-rig-surface/50 border border-rig-dim/20 rounded px-2 py-1 text-[11px] font-mono">
      <div className="flex items-center gap-2">
        {probe.reachable ? (
          <CheckCircle size={11} className="text-rig-ok shrink-0" />
        ) : (
          <XCircle size={11} className="text-rig-critical shrink-0" />
        )}
        <span className="text-rig-text">{probe.ip}</span>
        {probe.ms !== null && <span className="text-rig-dim ml-auto">{probe.ms}ms</span>}
      </div>
      <div className="text-[10px] text-rig-dim mt-0.5 pl-5 italic">{probe.note}</div>
      {probe.bodyPreview && (
        <pre className="text-[10px] text-rig-ok mt-1 pl-5 overflow-x-auto whitespace-pre-wrap break-words">
          {probe.bodyPreview}
        </pre>
      )}
    </li>
  );
}

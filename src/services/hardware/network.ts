/**
 * Network scan service — wraps the LAN inspection hook.
 *
 * BROWSER-SAFE: WebRTC ICE local IP discovery, Network Information API,
 * CORS-bounded fetch probes to known IPs.
 *
 * EDGE AGENT (future): Full mDNS/ARP sweep, port scanning, device
 * fingerprinting (LIFEPAK, Butterfly, Masimo) would run on a local
 * Node/Rust process. The browser cannot open raw sockets.
 */
export { useNetworkScan } from '../../hooks/useNetworkScan';
export type { NetworkInfo, LocalIpResult, ProbeResult } from '../../hooks/useNetworkScan';

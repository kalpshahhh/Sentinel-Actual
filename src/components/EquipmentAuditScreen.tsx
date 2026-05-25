import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bluetooth,
  BluetoothOff,
  Wifi,
  Plus,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Trash2,
  Server,
  HeartPulse,
  Monitor,
  Wind,
  Stethoscope,
  Zap,
  Tag,
  Save,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import type { DeviceCategory, MedicalDevice, ConnectivityType, InventoryManifest } from '../types/inventory';
import { useNetworkScan } from '../hooks/useNetworkScan';

type Tab = 'bluetooth' | 'network' | 'manual';

type DiscoveredBtDevice = {
  btId: string;
  name: string;
  category: DeviceCategory;
  capabilities: string[];
  confirmed: boolean;
};

type ProbeDevice = {
  ip: string;
  hostname: string;
  reachable: boolean;
  ms: number | null;
  category: DeviceCategory;
  confirmed: boolean;
};

type ManualEntry = {
  name: string;
  category: DeviceCategory;
  location: string;
  notes: string;
};

const CATEGORY_OPTIONS: { value: DeviceCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'monitoring', label: 'Monitoring', icon: <HeartPulse size={14} /> },
  { value: 'imaging', label: 'Imaging', icon: <Monitor size={14} /> },
  { value: 'airway', label: 'Airway', icon: <Wind size={14} /> },
  { value: 'diagnostic', label: 'Diagnostic', icon: <Stethoscope size={14} /> },
  { value: 'cardiac', label: 'Cardiac', icon: <Zap size={14} /> },
  { value: 'trauma', label: 'Trauma', icon: <Tag size={14} /> },
  { value: 'oxygen', label: 'Oxygen', icon: <Wind size={14} /> },
];

const CAP_MAP: Record<DeviceCategory, string[]> = {
  monitoring: ['blood_pressure', 'spo2', 'pulse'],
  imaging: ['ultrasound'],
  airway: ['advanced_airway'],
  cardiac: ['ecg', 'defib'],
  diagnostic: ['blood_glucose'],
  trauma: ['trauma_splinting'],
  oxygen: ['oxygen'],
};

type Props = {
  vesselName: string;
  currentManifest: InventoryManifest | null;
  onSaved: (manifest: InventoryManifest) => void;
  onBack: () => void;
};

export function EquipmentAuditScreen({ vesselName, currentManifest, onSaved, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('bluetooth');
  const [btAvailable, setBtAvailable] = useState(false);
  const [btDiscovering, setBtDiscovering] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);
  const [btDevices, setBtDevices] = useState<DiscoveredBtDevice[]>([]);
  const [probeDevices, setProbeDevices] = useState<ProbeDevice[]>([]);
  const [probeInput, setProbeInput] = useState('');
  const [probing, setProbing] = useState(false);
  const [manual, setManual] = useState<ManualEntry>({ name: '', category: 'monitoring', location: '', notes: '' });

  const scan = useNetworkScan();

  useEffect(() => {
    setBtAvailable('bluetooth' in navigator && !!(navigator as any).bluetooth);
  }, []);

  // Seed from existing manifest
  useEffect(() => {
    if (!currentManifest) return;
    const existing = currentManifest.devices.map((d) => ({
      btId: d.id,
      name: d.name,
      category: d.category,
      capabilities: d.capabilities,
      confirmed: true,
    }));
    setBtDevices(existing);
  }, [currentManifest]);

  const discoverBluetooth = useCallback(async () => {
    if (!btAvailable) return;
    setBtDiscovering(true);
    setBtError(null);
    try {
      const bt = (navigator as any).bluetooth;
      const device = await bt.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'battery_service',
          'device_information',
          'health_thermometer',
          'heart_rate',
          'blood_pressure',
          'pulse_oximeter',
        ],
      });
      const name = (device.name as string | undefined) ?? 'Unnamed device';
      setBtDevices((prev) => {
        if (prev.some((d) => d.btId === device.id)) return prev;
        const guessed = guessCategory(name);
        return [
          ...prev,
          {
            btId: device.id as string,
            name,
            category: guessed,
            capabilities: CAP_MAP[guessed] ?? [],
            confirmed: false,
          },
        ];
      });
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (!msg.includes('cancelled') && !msg.includes('cancel') && !msg.includes('chooser')) {
        setBtError(msg || 'Bluetooth discovery failed');
      }
    } finally {
      setBtDiscovering(false);
    }
  }, [btAvailable]);

  const handleProbeIp = async () => {
    const raw = probeInput.trim();
    if (!raw) return;
    setProbing(true);
    const results = await scan.probeIps([raw]);
    const r = results[0];
    if (r) {
      setProbeDevices((prev) => {
        if (prev.some((d) => d.ip === raw)) {
          return prev.map((d) =>
            d.ip === raw ? { ...d, reachable: r.reachable, ms: r.ms } : d
          );
        }
        return [
          ...prev,
          {
            ip: raw,
            hostname: raw,
            reachable: r.reachable,
            ms: r.ms,
            category: 'monitoring' as DeviceCategory,
            confirmed: false,
          },
        ];
      });
    }
    setProbeInput('');
    setProbing(false);
  };

  const addManualDevice = () => {
    if (!manual.name.trim()) return;
    const id = `manual_${Date.now()}`;
    setBtDevices((prev) => [
      ...prev,
      {
        btId: id,
        name: manual.name.trim(),
        category: manual.category,
        capabilities: CAP_MAP[manual.category] ?? [],
        confirmed: false,
      },
    ]);
    setManual({ name: '', category: 'monitoring', location: '', notes: '' });
  };

  const toggleConfirm = (id: string) => {
    setBtDevices((prev) => prev.map((d) => (d.btId === id ? { ...d, confirmed: !d.confirmed } : d)));
  };

  const toggleProbeConfirm = (ip: string) => {
    setProbeDevices((prev) => prev.map((d) => (d.ip === ip ? { ...d, confirmed: !d.confirmed } : d)));
  };

  const removeDevice = (id: string) => {
    setBtDevices((prev) => prev.filter((d) => d.btId !== id));
  };

  const allConfirmed = [
    ...btDevices.filter((d) => d.confirmed),
    ...probeDevices.filter((d) => d.confirmed),
  ];

  const handleSave = () => {
    const devices: MedicalDevice[] = [
      ...btDevices.filter((d) => d.confirmed).map((d, i) => ({
        id: d.btId || `bt_${i}`,
        name: d.name,
        category: d.category,
        connectivityType: 'bluetooth' as ConnectivityType,
        operational: true,
        capabilities: d.capabilities,
      })),
      ...probeDevices.filter((d) => d.confirmed).map((d, i) => ({
        id: `net_${d.ip.replace(/[^a-z0-9]/gi, '_')}_${i}`,
        name: d.hostname,
        category: d.category,
        connectivityType: 'wifi' as ConnectivityType,
        operational: d.reachable,
        capabilities: CAP_MAP[d.category] ?? [],
      })),
    ];

    // Derive capability flags from device list
    const hasCap = (cap: string) => devices.some((d) => d.capabilities.includes(cap));
    const capProfile = {
      ultrasound: hasCap('ultrasound'),
      ecg: hasCap('ecg'),
      defib: hasCap('defib'),
      oxygen: hasCap('oxygen'),
      advanced_airway: hasCap('advanced_airway'),
      iv_access: true,
      blood_glucose: hasCap('blood_glucose'),
      trauma_splinting: hasCap('trauma_splinting'),
      suturing: true,
      evacuation_heli: currentManifest?.capabilityProfile.evacuation_heli ?? true,
      evacuation_shore: currentManifest?.capabilityProfile.evacuation_shore ?? true,
      satellite_comms: currentManifest?.capabilityProfile.satellite_comms ?? true,
      telemedicine: currentManifest?.capabilityProfile.telemedicine ?? true,
    };

    const manifest: InventoryManifest = {
      vesselId: currentManifest?.vesselId ?? `vessel-${Date.now()}`,
      vesselName,
      preset: currentManifest?.preset ?? 'custom',
      importedAt: new Date().toISOString(),
      importSource: 'manual',
      medications: currentManifest?.medications ?? [],
      devices,
      capabilityProfile: capProfile,
    };

    onSaved(manifest);
  };

  return (
    <div className="min-h-screen bg-rig-bg text-rig-text flex flex-col">
      {/* Header */}
      <div className="border-b border-rig-dim/20 px-6 py-4 flex items-center gap-4 bg-rig-surface/40">
        <button
          onClick={onBack}
          className="text-rig-dim hover:text-rig-text flex items-center gap-1.5 text-[11px] uppercase tracking-widest border border-rig-dim/30 hover:border-rig-dim/60 rounded px-3 py-1.5"
        >
          <ChevronLeft size={13} /> Back
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-rig-dim font-mono">Onboarding · {vesselName}</div>
          <div className="text-lg font-bold tracking-wider">Equipment Audit</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {allConfirmed.length > 0 && (
            <span className="text-[11px] bg-rig-accent/15 text-rig-accent border border-rig-accent/30 rounded px-2 py-1 font-mono">
              {allConfirmed.length} confirmed
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={allConfirmed.length === 0}
            className={clsx(
              'px-4 py-2 rounded text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5',
              allConfirmed.length > 0
                ? 'bg-rig-ok text-rig-bg hover:bg-rig-ok/85'
                : 'bg-rig-surface text-rig-dim border border-rig-dim/30 cursor-not-allowed'
            )}
          >
            <Save size={13} /> Save {allConfirmed.length > 0 ? allConfirmed.length : ''} devices
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-rig-dim/20 bg-rig-surface/30 px-6 flex gap-0">
        {(['bluetooth', 'network', 'manual'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-3 text-[11px] uppercase tracking-widest border-b-2 transition-colors',
              tab === t
                ? 'border-rig-accent text-rig-accent'
                : 'border-transparent text-rig-dim hover:text-rig-text'
            )}
          >
            {t === 'bluetooth' ? (
              <span className="flex items-center gap-1.5">
                <Bluetooth size={12} /> Bluetooth
                {btDevices.filter((d) => d.confirmed).length > 0 && (
                  <span className="bg-rig-accent/20 text-rig-accent rounded-full px-1.5 text-[9px]">
                    {btDevices.filter((d) => d.confirmed).length}
                  </span>
                )}
              </span>
            ) : t === 'network' ? (
              <span className="flex items-center gap-1.5">
                <Wifi size={12} /> WiFi / LAN
                {probeDevices.filter((d) => d.confirmed).length > 0 && (
                  <span className="bg-rig-accent/20 text-rig-accent rounded-full px-1.5 text-[9px]">
                    {probeDevices.filter((d) => d.confirmed).length}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Plus size={12} /> Manual add
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-6">
        <AnimatePresence mode="wait">
          {tab === 'bluetooth' && (
            <motion.div key="bt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {!btAvailable ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <BluetoothOff size={48} className="text-rig-critical/60" />
                  <div className="text-center">
                    <div className="text-sm text-rig-critical font-bold mb-1">Bluetooth not available</div>
                    <div className="text-xs text-rig-dim max-w-sm">
                      Web Bluetooth requires Chrome on desktop or Android. Make sure you're on <strong>localhost</strong> or <strong>HTTPS</strong>. Enable the API under <code>chrome://flags</code> if blocked.
                    </div>
                  </div>
                  <button
                    onClick={() => setBtAvailable('bluetooth' in navigator && !!(navigator as any).bluetooth)}
                    className="text-[11px] uppercase tracking-widest text-rig-accent border border-rig-accent/40 rounded px-3 py-1.5 hover:bg-rig-accent/10"
                  >
                    <RefreshCw size={11} className="inline mr-1.5" /> Re-check
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-rig-text font-bold mb-0.5">Discover Bluetooth devices</div>
                      <div className="text-xs text-rig-dim">
                        Chrome opens a device picker each time. Select a device to add it to the list.
                      </div>
                    </div>
                    <button
                      onClick={() => void discoverBluetooth()}
                      disabled={btDiscovering}
                      className={clsx(
                        'px-4 py-2.5 rounded border text-[11px] uppercase tracking-widest font-bold flex items-center gap-2 shrink-0',
                        btDiscovering
                          ? 'border-rig-dim/30 text-rig-dim cursor-wait'
                          : 'bg-rig-accent/15 border-rig-accent/50 text-rig-accent hover:bg-rig-accent/25'
                      )}
                    >
                      {btDiscovering ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Bluetooth size={13} />
                      )}
                      {btDiscovering ? 'Scanning…' : 'Discover device'}
                    </button>
                  </div>

                  {btError && (
                    <div className="flex items-start gap-2 bg-rig-critical/10 border border-rig-critical/30 rounded p-3 text-xs text-rig-critical">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      {btError}
                    </div>
                  )}

                  {btDevices.length === 0 ? (
                    <div className="border border-dashed border-rig-dim/30 rounded-lg py-12 flex flex-col items-center gap-3 text-rig-dim">
                      <Bluetooth size={36} className="opacity-30" />
                      <div className="text-xs uppercase tracking-widest">No devices discovered yet</div>
                      <div className="text-[11px] max-w-xs text-center">
                        Click "Discover device" — Chrome will scan for nearby Bluetooth devices. Press repeatedly to add multiple.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {btDevices.map((d) => (
                        <DeviceRow
                          key={d.btId}
                          name={d.name}
                          category={d.category}
                          confirmed={d.confirmed}
                          badge="Bluetooth"
                          onCategoryChange={(cat) =>
                            setBtDevices((prev) =>
                              prev.map((x) => (x.btId === d.btId ? { ...x, category: cat, capabilities: CAP_MAP[cat] ?? [] } : x))
                            )
                          }
                          onToggleConfirm={() => toggleConfirm(d.btId)}
                          onRemove={() => removeDevice(d.btId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'network' && (
            <motion.div key="net" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="space-y-4">
                {/* Network status */}
                <div className="bg-rig-surface/40 border border-rig-dim/20 rounded-lg p-4">
                  <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-3">Network status</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <NetCell label="State" value={scan.info.online ? 'Online' : 'Offline'} ok={scan.info.online} />
                    <NetCell label="Type" value={scan.info.effectiveType ?? scan.info.type ?? '—'} ok={scan.info.online} />
                    <NetCell label="Downlink" value={scan.info.downlinkMbps ? `${scan.info.downlinkMbps.toFixed(1)} Mbps` : '—'} ok={!!scan.info.downlinkMbps} />
                    <NetCell label="RTT" value={scan.info.rttMs ? `${scan.info.rttMs} ms` : '—'} ok={!!scan.info.rttMs} />
                  </div>
                </div>

                {/* IP probe */}
                <div>
                  <div className="text-sm text-rig-text font-bold mb-1">Probe a device by IP or hostname</div>
                  <div className="text-xs text-rig-dim mb-3">
                    Enter the IP address or hostname of a known medical device on the vessel's network.
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={probeInput}
                      onChange={(e) => setProbeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleProbeIp()}
                      placeholder="192.168.1.50 or monitor.local"
                      className="flex-1 bg-rig-bg border border-rig-dim/30 rounded p-2.5 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => void handleProbeIp()}
                      disabled={probing || !probeInput.trim()}
                      className={clsx(
                        'px-4 py-2 rounded text-[11px] uppercase tracking-widest font-bold flex items-center gap-2 shrink-0',
                        probing || !probeInput.trim()
                          ? 'border border-rig-dim/30 text-rig-dim cursor-not-allowed'
                          : 'bg-rig-accent/15 border border-rig-accent/50 text-rig-accent hover:bg-rig-accent/25'
                      )}
                    >
                      {probing ? <Loader2 size={12} className="animate-spin" /> : <Server size={12} />}
                      Probe
                    </button>
                  </div>
                </div>

                {probeDevices.length === 0 ? (
                  <div className="border border-dashed border-rig-dim/30 rounded-lg py-10 flex flex-col items-center gap-2 text-rig-dim">
                    <Wifi size={32} className="opacity-30" />
                    <div className="text-xs uppercase tracking-widest">No devices probed yet</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {probeDevices.map((d) => (
                      <DeviceRow
                        key={d.ip}
                        name={d.hostname}
                        category={d.category}
                        confirmed={d.confirmed}
                        badge={d.reachable ? `${d.ms ?? '?'}ms` : 'Unreachable'}
                        badgeTone={d.reachable ? 'ok' : 'critical'}
                        onCategoryChange={(cat) =>
                          setProbeDevices((prev) => prev.map((x) => (x.ip === d.ip ? { ...x, category: cat } : x)))
                        }
                        onToggleConfirm={() => toggleProbeConfirm(d.ip)}
                        onRemove={() => setProbeDevices((prev) => prev.filter((x) => x.ip !== d.ip))}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'manual' && (
            <motion.div key="manual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="max-w-lg mx-auto space-y-4">
                <div>
                  <div className="text-sm text-rig-text font-bold mb-1">Add device manually</div>
                  <div className="text-xs text-rig-dim">
                    For devices not discoverable via Bluetooth or network (fixed oxygen units, splint kits, AED, etc.).
                  </div>
                </div>

                <label className="block">
                  <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1.5">Device name *</div>
                  <input
                    value={manual.name}
                    onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                    placeholder="e.g. Lifepak 15, Portable O2 kit, Fracture splints"
                    className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2.5 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none"
                  />
                </label>

                <label className="block">
                  <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1.5">Category</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CATEGORY_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => setManual((m) => ({ ...m, category: o.value }))}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded border text-xs text-left transition-colors',
                          manual.category === o.value
                            ? 'bg-rig-accent/15 border-rig-accent/50 text-rig-accent'
                            : 'border-rig-dim/30 text-rig-dim hover:border-rig-dim/60 hover:text-rig-text'
                        )}
                      >
                        {o.icon} {o.label}
                      </button>
                    ))}
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1.5">Location</div>
                    <input
                      value={manual.location}
                      onChange={(e) => setManual((m) => ({ ...m, location: e.target.value }))}
                      placeholder="e.g. Medical bay, Deck 2"
                      className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2.5 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1.5">Notes</div>
                    <input
                      value={manual.notes}
                      onChange={(e) => setManual((m) => ({ ...m, notes: e.target.value }))}
                      placeholder="Condition, last calibration, etc."
                      className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2.5 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none"
                    />
                  </label>
                </div>

                <button
                  onClick={addManualDevice}
                  disabled={!manual.name.trim()}
                  className={clsx(
                    'w-full px-4 py-3 rounded text-[12px] uppercase tracking-widest font-bold flex items-center justify-center gap-2',
                    manual.name.trim()
                      ? 'bg-rig-accent/15 border border-rig-accent/50 text-rig-accent hover:bg-rig-accent/25'
                      : 'border border-rig-dim/30 text-rig-dim cursor-not-allowed'
                  )}
                >
                  <Plus size={14} /> Add to list
                </button>

                <div className="text-xs text-rig-dim">Device will appear in the Bluetooth tab — confirm it there before saving.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmed summary strip */}
      {allConfirmed.length > 0 && (
        <div className="border-t border-rig-dim/20 bg-rig-surface/40 px-6 py-3 flex items-center gap-3 text-xs text-rig-dim font-mono">
          <CheckCircle2 size={14} className="text-rig-ok shrink-0" />
          <span className="text-rig-text font-bold">{allConfirmed.length} device{allConfirmed.length !== 1 ? 's' : ''} confirmed:</span>
          <span className="truncate">
            {allConfirmed.map((d) => ('btId' in d ? (d as DiscoveredBtDevice).name : (d as ProbeDevice).hostname)).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}

function DeviceRow({
  name,
  category,
  confirmed,
  badge,
  badgeTone = 'accent',
  onCategoryChange,
  onToggleConfirm,
  onRemove,
}: {
  name: string;
  category: DeviceCategory;
  confirmed: boolean;
  badge: string;
  badgeTone?: 'accent' | 'ok' | 'critical';
  onCategoryChange: (c: DeviceCategory) => void;
  onToggleConfirm: () => void;
  onRemove: () => void;
}) {
  const [showCatPicker, setShowCatPicker] = useState(false);

  const badgeColor =
    badgeTone === 'ok'
      ? 'bg-rig-ok/15 text-rig-ok border-rig-ok/30'
      : badgeTone === 'critical'
        ? 'bg-rig-critical/15 text-rig-critical border-rig-critical/30'
        : 'bg-rig-accent/15 text-rig-accent border-rig-accent/30';

  return (
    <div
      className={clsx(
        'bg-rig-surface/40 border rounded-lg p-3 transition-colors',
        confirmed ? 'border-rig-ok/40' : 'border-rig-dim/30'
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleConfirm}
          className={clsx(
            'shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            confirmed ? 'bg-rig-ok border-rig-ok text-rig-bg' : 'border-rig-dim/50 hover:border-rig-accent'
          )}
        >
          {confirmed && <CheckCircle2 size={12} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-rig-text truncate">{name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase tracking-wider', badgeColor)}>
              {badge}
            </span>
            <button
              onClick={() => setShowCatPicker((v) => !v)}
              className="text-[10px] uppercase tracking-widest text-rig-dim hover:text-rig-accent underline underline-offset-2"
            >
              {CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category}
            </button>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-rig-dim hover:text-rig-critical p-1 rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <AnimatePresence>
        {showCatPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 pt-2 border-t border-rig-dim/20">
              {CATEGORY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { onCategoryChange(o.value); setShowCatPicker(false); }}
                  className={clsx(
                    'flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] border transition-colors',
                    category === o.value
                      ? 'bg-rig-accent/15 border-rig-accent/40 text-rig-accent'
                      : 'border-rig-dim/20 text-rig-dim hover:text-rig-text hover:border-rig-dim/50'
                  )}
                >
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NetCell({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="bg-rig-bg border border-rig-dim/20 rounded p-2">
      <div className="text-[9px] uppercase tracking-wider text-rig-dim">{label}</div>
      <div className={clsx('text-xs font-mono mt-0.5', ok ? 'text-rig-ok' : 'text-rig-dim')}>{value}</div>
    </div>
  );
}

function guessCategory(name: string): DeviceCategory {
  const n = name.toLowerCase();
  if (/ecg|monitor|lifepak|zoll|cardiac|defib|aed/.test(n)) return 'cardiac';
  if (/ultrasound|echo|sono/.test(n)) return 'imaging';
  if (/oxy|pulse|spo2|satur/.test(n)) return 'monitoring';
  if (/airway|intub|laryn|bvm/.test(n)) return 'airway';
  if (/oxygen|o2|cylinder|concentrator/.test(n)) return 'oxygen';
  if (/splint|trauma|fracture|traction/.test(n)) return 'trauma';
  if (/glucose|sugar|diabetic|glucometer/.test(n)) return 'diagnostic';
  return 'monitoring';
}

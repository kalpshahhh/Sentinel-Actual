import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Camera,
  CheckCircle,
  AlertTriangle,
  Package,
  Pill,
  Stethoscope,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import clsx from 'clsx';
import type { InventoryManifest, MedBarcodeLookup } from '../types/inventory';
import type { InventoryPreset } from '../types';
import { parseJsonManifest, parseCsvMedications } from '../lib/inventory/parser';
import { getInventorySummary } from '../lib/inventory/engine';
import { BarcodeScanner } from './BarcodeScanner';
import offshoreDemo from '../data/inventory/offshore-demo.json';
import polarDemo from '../data/inventory/polar-demo.json';

type ImportMethod = 'demo' | 'json' | 'csv' | 'barcode';

type Props = {
  preset: InventoryPreset;
  vesselName: string;
  onImported: (manifest: InventoryManifest) => void;
  currentManifest: InventoryManifest | null;
  onCancel?: () => void;
};

export function InventoryImport({ preset, vesselName, onImported, currentManifest, onCancel }: Props) {
  const [method, setMethod] = useState<ImportMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedItems, setScannedItems] = useState<MedBarcodeLookup[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDemo = useCallback(() => {
    setLoading(true);
    setError(null);
    setMethod('demo');
    setTimeout(() => {
      const raw = preset === 'polar' ? polarDemo : offshoreDemo;
      const result = parseJsonManifest(raw, vesselName);
      if (result.ok) {
        onImported({ ...result.manifest, importedAt: new Date().toISOString() });
      } else {
        setError(result.error);
      }
      setLoading(false);
    }, 900); // brief loading animation
  }, [preset, vesselName, onImported]);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      const text = await file.text();
      let result;
      if (file.name.endsWith('.csv')) {
        result = parseCsvMedications(text, vesselName);
        setMethod('csv');
      } else {
        try {
          result = parseJsonManifest(JSON.parse(text), vesselName);
        } catch {
          result = { ok: false as const, error: 'File is not valid JSON' };
        }
        setMethod('json');
      }
      if (result.ok) {
        onImported(result.manifest);
      } else {
        setError(result.error);
      }
      setLoading(false);
    },
    [vesselName, onImported]
  );

  const handleBarcodeScan = useCallback(
    (item: MedBarcodeLookup) => {
      setScannedItems((prev) => {
        const existing = prev.find((p) => p.barcode === item.barcode);
        if (existing) return prev;
        return [...prev, item];
      });
    },
    []
  );

  const commitScannedItems = useCallback(() => {
    if (scannedItems.length === 0) return;
    const manifest: InventoryManifest = {
      vesselId: `vessel-${Date.now()}`,
      vesselName,
      preset: 'custom',
      importedAt: new Date().toISOString(),
      importSource: 'barcode',
      medications: scannedItems.map((item, i) => ({
        id: `scan_${item.barcode}_${i}`,
        genericName: item.genericName,
        brandName: item.brandName,
        dosage: item.dosage,
        unit: item.unit,
        quantity: 1,
        route: ['oral'],
        tags: item.tags,
        location: 'Scanned — location not recorded',
      })),
      devices: [],
      capabilityProfile: {
        ultrasound: false, ecg: false, defib: false, oxygen: false,
        advanced_airway: false, iv_access: false, blood_glucose: false,
        trauma_splinting: false, suturing: false, evacuation_heli: true,
        evacuation_shore: true, satellite_comms: true, telemedicine: true,
      },
    };
    onImported(manifest);
  }, [scannedItems, vesselName, onImported]);

  const summary = currentManifest ? getInventorySummary(currentManifest) : null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-rig-text">
            Medical Inventory Import
          </h2>
          <p className="text-sm text-rig-dim mt-1">
            Load your vessel's medical inventory to enable adaptive treatment guidance.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs uppercase tracking-widest text-rig-dim hover:text-rig-text border border-rig-dim/30 rounded px-3 py-1.5 hover:border-rig-dim/60 shrink-0 ml-4"
          >
            ← Back
          </button>
        )}
      </div>

      {/* Already imported — show summary */}
      {summary && currentManifest && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-rig-surface border border-rig-ok/30 rounded-md p-4 glow-ok"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-rig-ok" />
            <span className="text-xs uppercase tracking-widest text-rig-ok">
              Inventory loaded — {currentManifest.vesselName}
            </span>
            <span className="ml-auto text-[10px] text-rig-dim font-mono">
              {new Date(currentManifest.importedAt).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard icon={<Pill size={14} />} label="Medications" value={summary.availableMedications} sub={`of ${summary.totalMedications} total`} tone="ok" />
            <SummaryCard icon={<Stethoscope size={14} />} label="Devices" value={summary.operationalDevices} sub={`of ${summary.totalDevices} total`} tone="ok" />
            {summary.expiredCount > 0 && (
              <SummaryCard icon={<Clock size={14} />} label="Expired" value={summary.expiredCount} sub="need replacement" tone="critical" />
            )}
            {summary.criticalWarnings.length > 0 && (
              <SummaryCard icon={<ShieldAlert size={14} />} label="Warnings" value={summary.criticalWarnings.length} sub="critical gaps" tone="critical" />
            )}
          </div>

          {summary.criticalWarnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {summary.criticalWarnings.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-[11px] text-rig-critical">
                  <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setMethod(null)}
            className="mt-3 text-[11px] uppercase tracking-widest text-rig-dim hover:text-rig-accent underline"
          >
            Re-import inventory
          </button>
        </motion.div>
      )}

      {/* Import options */}
      {!summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <MethodCard
            icon={<Package size={20} />}
            title="Demo Preset"
            description={`Load the ${preset} vessel demo inventory`}
            onClick={handleDemo}
            loading={loading && method === 'demo'}
            recommended
          />
          <MethodCard
            icon={<FileText size={20} />}
            title="Upload File"
            description="Import JSON manifest or CSV medication list"
            onClick={() => fileRef.current?.click()}
            loading={loading && (method === 'json' || method === 'csv')}
          />
          <MethodCard
            icon={<Camera size={20} />}
            title="Scan Barcodes"
            description="Use camera to scan individual medications"
            onClick={() => { setMethod('barcode'); setShowScanner(true); }}
          />
        </div>
      )}

      {/* Re-import options (compact) */}
      {summary && !method && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <CompactMethod label="Load demo preset" onClick={handleDemo} loading={loading && method === 'demo'} />
          <CompactMethod label="Upload file (JSON/CSV)" onClick={() => fileRef.current?.click()} loading={false} />
          <CompactMethod label="Scan barcodes" onClick={() => { setMethod('barcode'); setShowScanner(true); }} loading={false} />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
      />

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-rig-critical/10 border border-rig-critical/40 rounded text-xs text-rig-critical flex items-start gap-2"
        >
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Barcode scan session */}
      <AnimatePresence>
        {method === 'barcode' && !showScanner && scannedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-rig-surface border border-rig-dim/20 rounded-md p-4"
          >
            <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2">
              Scanned items ({scannedItems.length})
            </div>
            <ul className="space-y-1 mb-4">
              {scannedItems.map((item) => (
                <li key={item.barcode} className="flex items-center gap-2 text-xs">
                  <CheckCircle size={11} className="text-rig-ok" />
                  <span className="text-rig-text">{item.genericName}</span>
                  <span className="text-rig-dim">{item.dosage}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => setShowScanner(true)}
                className="px-4 py-2 border border-rig-dim/40 rounded text-xs text-rig-dim hover:text-rig-text"
              >
                Scan more
              </button>
              <button
                onClick={commitScannedItems}
                className="flex-1 px-4 py-2 bg-rig-accent text-rig-bg rounded text-xs font-bold uppercase tracking-widest"
              >
                Confirm {scannedItems.length} items
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV format hint */}
      <details className="mt-6">
        <summary className="text-[10px] uppercase tracking-widest text-rig-dim cursor-pointer hover:text-rig-text">
          CSV format reference
        </summary>
        <pre className="mt-2 text-[10px] font-mono text-rig-dim bg-rig-bg rounded p-3 overflow-x-auto">
{`name,dosage,unit,quantity,expiry,location
Paracetamol,500 mg,tablet,100,2027-06-01,Drawer 2
Ibuprofen,400 mg,tablet,60,2027-03-01,Drawer 2
Ceftriaxone,1 g,vial,10,2027-01-01,Drawer 6`}
        </pre>
      </details>

      {/* Scanner modal */}
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onFound={(item) => { handleBarcodeScan(item); setShowScanner(false); }}
            onClose={() => {
              setShowScanner(false);
              // If nothing was scanned, reset so user sees the options again cleanly
              if (scannedItems.length === 0) setMethod(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MethodCard({
  icon, title, description, onClick, loading, recommended,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  recommended?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={clsx(
        'relative text-left p-4 rounded-md border flex flex-col gap-2 transition-colors',
        recommended
          ? 'bg-rig-accent/10 border-rig-accent/40 hover:bg-rig-accent/15'
          : 'bg-rig-surface border-rig-dim/20 hover:bg-rig-bg/40',
        loading && 'opacity-60 cursor-wait'
      )}
    >
      {recommended && (
        <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest text-rig-accent border border-rig-accent/40 rounded px-1.5 py-0.5">
          Recommended
        </span>
      )}
      <span className="text-rig-accent">{icon}</span>
      <span className="text-sm font-bold text-rig-text uppercase tracking-wider">{title}</span>
      <span className="text-[11px] text-rig-dim leading-relaxed">{description}</span>
      {loading && (
        <span className="flex items-center gap-1 text-[10px] text-rig-accent">
          <Upload size={10} className="animate-bounce" /> Loading…
        </span>
      )}
    </button>
  );
}

function CompactMethod({ label, onClick, loading }: { label: string; onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-2 border border-rig-dim/30 rounded text-[11px] text-rig-dim hover:text-rig-accent hover:border-rig-accent/40 uppercase tracking-widest"
    >
      {loading ? 'Loading…' : label}
    </button>
  );
}

function SummaryCard({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  tone: 'ok' | 'critical';
}) {
  return (
    <div
      className={clsx(
        'rounded p-2.5 border',
        tone === 'ok'
          ? 'bg-rig-ok/10 border-rig-ok/30'
          : 'bg-rig-critical/10 border-rig-critical/30'
      )}
    >
      <div className={clsx('flex items-center gap-1.5 mb-1', tone === 'ok' ? 'text-rig-ok' : 'text-rig-critical')}>
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono text-rig-text">{value}</div>
      <div className="text-[9px] text-rig-dim">{sub}</div>
    </div>
  );
}

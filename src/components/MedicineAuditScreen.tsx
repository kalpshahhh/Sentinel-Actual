import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Camera,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Save,
  Upload,
  ScanBarcode,
  Plus,
  Lock,
  MapPin,
} from 'lucide-react';
import clsx from 'clsx';
import type { InventoryManifest, Medication, MedBarcodeLookup } from '../types/inventory';
import type { InventoryPreset } from '../types';
import { parseCsvMedications } from '../lib/inventory/parser';
import { BarcodeScanner } from './BarcodeScanner';

type Method = 'csv' | 'barcode' | null;

type Props = {
  preset: InventoryPreset;
  vesselName: string;
  currentManifest: InventoryManifest | null;
  onSaved: (manifest: InventoryManifest) => void;
  onBack: () => void;
};

export function MedicineAuditScreen({ preset, vesselName, currentManifest, onSaved, onBack }: Props) {
  const [method, setMethod] = useState<Method>(null);
  const [medications, setMedications] = useState<Medication[]>(() => currentManifest?.medications ?? []);
  const [showScanner, setShowScanner] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Medication[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvConfirmed, setCsvConfirmed] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCsvFile = useCallback(async (file: File) => {
    setCsvError(null);
    setCsvPreview([]);
    setCsvConfirmed(false);
    setCsvFileName(file.name);
    const text = await file.text();
    const result = parseCsvMedications(text, vesselName);
    if (result.ok) {
      setCsvPreview(result.manifest.medications);
      setMethod('csv');
    } else {
      setCsvError(result.error);
    }
  }, [vesselName]);

  const confirmCsv = () => {
    setMedications((prev) => {
      const merged = [...prev];
      for (const m of csvPreview) {
        if (!merged.some((x) => x.genericName.toLowerCase() === m.genericName.toLowerCase())) {
          merged.push(m);
        }
      }
      return merged;
    });
    setCsvPreview([]);
    setCsvConfirmed(true);
    setCsvFileName(null);
    setMethod(null);
  };

  const handleBarcodeScan = useCallback((item: MedBarcodeLookup) => {
    setMedications((prev) => {
      if (prev.some((p) => p.id === `scan_${item.barcode}`)) return prev;
      const med: Medication = {
        id: `scan_${item.barcode}`,
        genericName: item.genericName,
        brandName: item.brandName,
        dosage: item.dosage,
        unit: item.unit,
        quantity: 1,
        route: ['oral'],
        tags: item.tags,
        location: 'Scanned — location not set',
      };
      return [...prev, med];
    });
    setShowScanner(false);
  }, []);

  const removeMed = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, quantity: Math.max(0, qty) } : m)));
  };

  const updateLocation = (id: string, loc: string) => {
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, location: loc } : m)));
  };

  const handleSave = () => {
    const manifest: InventoryManifest = {
      vesselId: currentManifest?.vesselId ?? `vessel-${Date.now()}`,
      vesselName,
      preset: currentManifest?.preset ?? (preset === 'polar' ? 'polar' : 'offshore'),
      importedAt: new Date().toISOString(),
      importSource: method === 'csv' ? 'csv' : 'barcode',
      medications,
      devices: currentManifest?.devices ?? [],
      capabilityProfile: currentManifest?.capabilityProfile ?? {
        ultrasound: false, ecg: false, defib: false, oxygen: false,
        advanced_airway: false, iv_access: true, blood_glucose: false,
        trauma_splinting: false, suturing: true, evacuation_heli: true,
        evacuation_shore: true, satellite_comms: true, telemedicine: true,
      },
    };
    onSaved(manifest);
  };

  const drugCount = medications.length;
  const expiredCount = medications.filter((m) => {
    if (!m.expirationDate) return false;
    return new Date(m.expirationDate) < new Date();
  }).length;

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
          <div className="text-lg font-bold tracking-wider">Medicine Audit</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {drugCount > 0 && (
            <span className="text-[11px] bg-rig-ok/15 text-rig-ok border border-rig-ok/30 rounded px-2 py-1 font-mono">
              {drugCount} item{drugCount !== 1 ? 's' : ''}
              {expiredCount > 0 && ` · ${expiredCount} expired`}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={drugCount === 0}
            className={clsx(
              'px-4 py-2 rounded text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5',
              drugCount > 0
                ? 'bg-rig-ok text-rig-bg hover:bg-rig-ok/85'
                : 'bg-rig-surface text-rig-dim border border-rig-dim/30 cursor-not-allowed'
            )}
          >
            <Save size={13} /> Save inventory
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Method selector — only show if no CSV in progress */}
        {method !== 'csv' && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-3">Add medications</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MethodTile
                icon={<FileText size={24} />}
                title="Upload CSV"
                subtitle="Import a spreadsheet of the medical chest"
                description="Format: name, dosage, unit, quantity, expiry, location"
                onClick={() => fileRef.current?.click()}
              />
              <MethodTile
                icon={<ScanBarcode size={24} />}
                title="Scan Barcodes"
                subtitle="Scan each medication package with camera"
                description="Works offline — EAN-13, Code128, QR supported"
                onClick={() => { setMethod('barcode'); setShowScanner(true); }}
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCsvFile(f);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {/* CSV preview */}
        <AnimatePresence>
          {method === 'csv' && csvPreview.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-rig-surface/40 border border-rig-dim/20 rounded-lg overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-rig-dim/20 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-rig-text">{csvFileName}</div>
                  <div className="text-xs text-rig-dim">{csvPreview.length} medications found</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setMethod(null); setCsvPreview([]); setCsvFileName(null); }}
                    className="text-[11px] text-rig-dim hover:text-rig-text border border-rig-dim/30 rounded px-3 py-1.5 uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCsv}
                    className="text-[11px] bg-rig-ok text-rig-bg font-bold rounded px-3 py-1.5 uppercase tracking-widest flex items-center gap-1.5 hover:bg-rig-ok/85"
                  >
                    <CheckCircle2 size={12} /> Add {csvPreview.length} items
                  </button>
                </div>
              </div>
              <div className="divide-y divide-rig-dim/10 max-h-64 overflow-y-auto">
                {csvPreview.map((m) => (
                  <div key={m.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-rig-text">{m.genericName}</span>
                      {m.brandName && <span className="text-rig-dim text-xs ml-1.5">({m.brandName})</span>}
                    </div>
                    <span className="text-rig-accent font-mono text-xs shrink-0">{m.dosage} {m.unit}</span>
                    <span className="text-rig-dim font-mono text-xs shrink-0">×{m.quantity}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {csvError && (
          <div className="flex items-start gap-2 bg-rig-critical/10 border border-rig-critical/30 rounded p-3 text-xs text-rig-critical">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-bold mb-1">CSV parse error</div>
              {csvError}
            </div>
          </div>
        )}

        {csvConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-rig-ok/10 border border-rig-ok/30 rounded px-4 py-2 text-xs text-rig-ok"
          >
            <CheckCircle2 size={13} /> CSV imported — items added to list below.
          </motion.div>
        )}

        {/* CSV format reference */}
        <details className="text-xs">
          <summary className="text-[10px] uppercase tracking-widest text-rig-dim cursor-pointer hover:text-rig-text select-none">
            CSV format reference
          </summary>
          <pre className="mt-2 text-[10px] font-mono text-rig-dim bg-rig-surface/40 border border-rig-dim/20 rounded p-3 overflow-x-auto">
{`name,dosage,unit,quantity,expiry,location
Paracetamol,500 mg,tablet,100,2027-06-01,Drawer 2
Morphine 10mg/ml,10 mg/ml,ampoule,10,2026-12-01,Locked cabinet
Ceftriaxone,1 g,vial,10,2027-01-01,Drawer 6
0.9% Sodium Chloride,500 ml,bag,20,2028-03-01,Shelf A`}
          </pre>
        </details>

        {/* Current inventory list */}
        {medications.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-widest text-rig-dim">
                Inventory ({medications.length} items
                {expiredCount > 0 && <span className="text-rig-critical"> · {expiredCount} expired</span>})
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="text-[10px] uppercase tracking-widest text-rig-accent hover:text-rig-accent/80 flex items-center gap-1"
              >
                <Camera size={11} /> Scan more
              </button>
            </div>
            <div className="space-y-1.5">
              {medications.map((m, idx) => {
                const expired = m.expirationDate ? new Date(m.expirationDate) < new Date() : false;
                const isEditing = editingIdx === idx;
                return (
                  <div
                    key={m.id}
                    className={clsx(
                      'bg-rig-surface/40 border rounded-lg transition-colors',
                      expired ? 'border-rig-critical/40' : 'border-rig-dim/20',
                      isEditing && 'border-rig-accent/40'
                    )}
                  >
                    <div
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                      onClick={() => setEditingIdx(isEditing ? null : idx)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-rig-text">{m.genericName}</span>
                          {m.locked && <Lock size={11} className="text-rig-critical shrink-0" />}
                          {expired && (
                            <span className="text-[9px] uppercase tracking-wider bg-rig-critical/15 text-rig-critical px-1.5 py-0.5 rounded border border-rig-critical/30">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-rig-dim">
                          <span className="font-mono">{m.dosage} {m.unit}</span>
                          {m.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {m.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-mono text-rig-text">×{m.quantity}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeMed(m.id); }}
                          className="text-rig-dim hover:text-rig-critical p-1 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isEditing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pt-0 border-t border-rig-dim/10 grid grid-cols-2 gap-3">
                            <label className="block">
                              <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1">Quantity</div>
                              <input
                                type="number"
                                min={0}
                                value={m.quantity}
                                onChange={(e) => updateQty(m.id, parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2 text-sm font-mono text-rig-text focus:border-rig-accent focus:outline-none"
                              />
                            </label>
                            <label className="block">
                              <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1">Location</div>
                              <input
                                value={m.location ?? ''}
                                onChange={(e) => updateLocation(m.id, e.target.value)}
                                placeholder="e.g. Drawer 2, Locked cabinet"
                                className="w-full bg-rig-bg border border-rig-dim/30 rounded p-2 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none"
                              />
                            </label>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {medications.length === 0 && method === null && (
          <div className="border border-dashed border-rig-dim/30 rounded-lg py-14 flex flex-col items-center gap-3 text-rig-dim">
            <Plus size={36} className="opacity-30" />
            <div className="text-xs uppercase tracking-widest">No medications catalogued yet</div>
            <div className="text-[11px] max-w-xs text-center">
              Upload a CSV from your medical chest inventory sheet, or scan medication barcodes one by one.
            </div>
          </div>
        )}
      </div>

      {/* Barcode scanner modal */}
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onFound={(item) => handleBarcodeScan(item)}
            onClose={() => {
              setShowScanner(false);
              if (medications.length === 0) setMethod(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MethodTile({
  icon,
  title,
  subtitle,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="group w-full text-left bg-rig-surface/40 border border-rig-dim/30 hover:border-rig-ok/50 rounded-lg p-5 transition-all"
    >
      <div className="text-rig-ok mb-3">{icon}</div>
      <div className="text-lg font-bold uppercase tracking-wide text-rig-text mb-0.5">{title}</div>
      <div className="text-xs uppercase tracking-widest text-rig-dim mb-2">{subtitle}</div>
      <p className="text-xs text-rig-dim leading-relaxed">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-widest text-rig-ok opacity-0 group-hover:opacity-100 transition-opacity">
        <Upload size={11} /> Select
      </div>
    </motion.button>
  );
}

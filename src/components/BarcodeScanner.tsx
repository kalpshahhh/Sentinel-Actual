import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CheckCircle, X, AlertTriangle, Search } from 'lucide-react';
import clsx from 'clsx';
import { lookupBarcodeFuzzy } from '../data/inventory/offline-med-lookup';
import type { MedBarcodeLookup } from '../types/inventory';

type ScanState = 'idle' | 'requesting' | 'scanning' | 'found' | 'unknown' | 'error';

type Props = {
  onFound: (item: MedBarcodeLookup, manualLabel?: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onFound, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<import('@zxing/browser').BrowserMultiFormatReader | null>(null);
  const [state, setState] = useState<ScanState>('idle');
  const [found, setFound] = useState<MedBarcodeLookup | null>(null);
  const [rawCode, setRawCode] = useState<string>('');
  const [manualName, setManualName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const stopScanner = useCallback(() => {
    activeRef.current = false;
    readerRef.current?.reset();
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    setState('requesting');
    setError(null);
    activeRef.current = true;

    try {
      // Dynamically import to avoid bloating the main bundle
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Request camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });

      if (!activeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState('scanning');

      // Continuous decode loop
      const decode = async () => {
        if (!activeRef.current || !videoRef.current) return;
        try {
          const result = await reader.decodeOnceFromVideoElement(videoRef.current);
          if (!activeRef.current) return;

          const code = result.getText();
          setRawCode(code);
          const hit = lookupBarcodeFuzzy(code);

          if (hit) {
            setState('found');
            setFound(hit);
          } else {
            setState('unknown');
          }
          stopScanner();
        } catch {
          // NotFoundException is thrown every frame when no barcode found — retry silently
          if (activeRef.current) setTimeout(decode, 200);
        }
      };

      void decode();
    } catch (err) {
      if (!activeRef.current) return;
      const msg = (err as Error).message;
      setError(
        msg.includes('Permission denied') || msg.includes('NotAllowed')
          ? 'Camera permission denied. Allow camera access in your browser settings.'
          : msg.includes('NotFound') || msg.includes('no camera')
          ? 'No camera found on this device.'
          : msg
      );
      setState('error');
    }
  }, [stopScanner]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  const handleConfirm = () => {
    if (found) onFound(found);
  };

  const handleConfirmUnknown = () => {
    if (!manualName.trim()) return;
    const manual: MedBarcodeLookup = {
      barcode: rawCode,
      genericName: manualName.trim(),
      dosage: '—',
      unit: 'unit',
      tags: [],
    };
    onFound(manual, manualName.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex flex-col items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) { stopScanner(); onClose(); } }}
    >
      <div className="w-full max-w-md bg-rig-panel border border-rig-dim/40 rounded-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-rig-dim/20">
          <div className="flex items-center gap-2">
            <Camera size={14} className="text-rig-accent" />
            <span className="text-xs uppercase tracking-widest text-rig-text">Scan Medication Barcode</span>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="text-rig-dim hover:text-rig-text p-2 -mr-1 rounded hover:bg-rig-bg/60"
            aria-label="Close scanner"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            muted
            playsInline
            className={clsx('w-full h-full object-cover', state !== 'scanning' && 'hidden')}
          />

          {/* Scanner overlay */}
          {state === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-32 border-2 border-rig-accent rounded relative">
                <span className="absolute -top-0.5 left-0 w-6 border-t-4 border-rig-accent" />
                <span className="absolute -top-0.5 right-0 w-6 border-t-4 border-rig-accent" />
                <span className="absolute -bottom-0.5 left-0 w-6 border-b-4 border-rig-accent" />
                <span className="absolute -bottom-0.5 right-0 w-6 border-b-4 border-rig-accent" />
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-rig-accent/70"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>
          )}

          {/* State overlays */}
          <AnimatePresence>
            {state === 'idle' && (
              <StateOverlay>
                <button
                  onClick={startScanner}
                  className="flex flex-col items-center gap-3 text-rig-text hover:text-rig-accent"
                >
                  <Camera size={40} className="text-rig-accent" />
                  <span className="text-sm uppercase tracking-widest">Tap to start scanning</span>
                </button>
              </StateOverlay>
            )}
            {state === 'requesting' && (
              <StateOverlay>
                <div className="text-rig-dim text-xs uppercase tracking-widest">Requesting camera…</div>
              </StateOverlay>
            )}
            {state === 'error' && (
              <StateOverlay>
                <AlertTriangle size={32} className="text-rig-critical mb-2" />
                <div className="text-xs text-rig-critical text-center max-w-xs">{error}</div>
              </StateOverlay>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div className="p-4">
          {state === 'found' && found && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-rig-ok" />
                <span className="text-xs uppercase tracking-widest text-rig-ok">Medication identified</span>
              </div>
              <div className="bg-rig-bg border border-rig-ok/30 rounded p-3 mb-3">
                <div className="font-bold text-rig-text">{found.genericName}</div>
                {found.brandName && <div className="text-xs text-rig-dim">{found.brandName}</div>}
                <div className="text-sm text-rig-accent font-mono mt-1">{found.dosage} · {found.unit}</div>
                <div className="text-[10px] text-rig-dim font-mono mt-1">Barcode: {rawCode}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 bg-rig-ok text-rig-bg rounded text-xs font-bold uppercase tracking-widest hover:bg-rig-ok/85"
                >
                  Add to inventory
                </button>
                <button
                  onClick={() => { setState('idle'); setFound(null); startScanner(); }}
                  className="px-4 py-2 border border-rig-dim/40 rounded text-xs text-rig-dim hover:text-rig-text"
                >
                  Scan another
                </button>
              </div>
            </motion.div>
          )}

          {state === 'unknown' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-2">
                <Search size={14} className="text-rig-dim" />
                <span className="text-xs uppercase tracking-widest text-rig-dim">
                  Barcode {rawCode.slice(0, 12)} not in offline database
                </span>
              </div>
              <input
                autoFocus
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmUnknown()}
                placeholder="Enter medication name to label it…"
                className="w-full bg-rig-bg border border-rig-dim/40 rounded p-2 text-sm text-rig-text placeholder:text-rig-dim focus:border-rig-accent focus:outline-none mb-3"
              />
              <div className="flex gap-2">
                <button
                  disabled={!manualName.trim()}
                  onClick={handleConfirmUnknown}
                  className="flex-1 px-4 py-2 bg-rig-accent text-rig-bg rounded text-xs font-bold uppercase tracking-widest disabled:opacity-40"
                >
                  Add with this name
                </button>
                <button
                  onClick={() => { setState('idle'); startScanner(); }}
                  className="px-4 py-2 border border-rig-dim/40 rounded text-xs text-rig-dim hover:text-rig-text"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          )}

          {(state === 'idle' || state === 'scanning') && (
            <p className="text-[10px] text-rig-dim text-center">
              {state === 'scanning'
                ? 'Point camera at the barcode or QR code on the medication package'
                : 'Supports EAN-13, Code128, QR — works fully offline'}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StateOverlay({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"
    >
      {children}
    </motion.div>
  );
}

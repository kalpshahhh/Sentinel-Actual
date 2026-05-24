import { useCallback, useState } from 'react';

export type NfcTagRead = {
  serial: string;
  records: string[];
  timestamp: number;
};

type NDEFRecord = { recordType?: string; data?: ArrayBuffer | DataView };
type NDEFMessage = { records?: NDEFRecord[] };
type NDEFReadingEvent = Event & { serialNumber?: string; message?: NDEFMessage };

type NDEFReaderInstance = {
  scan: (opts?: unknown) => Promise<void>;
  addEventListener: (type: string, listener: (ev: NDEFReadingEvent) => void) => void;
  removeEventListener: (type: string, listener: (ev: NDEFReadingEvent) => void) => void;
};

type WithNDEFReader = typeof globalThis & {
  NDEFReader?: { new (): NDEFReaderInstance };
};

/**
 * Wraps the Web NFC API. Reality:
 *   - Available ONLY on Chrome for Android.
 *   - Not available on iOS / iPadOS (Apple does not expose NFC to web pages).
 *   - Not available on desktop browsers.
 *
 * If not supported, returns `supported: false` and the UI should show the
 * simulated install-time RFID manifest narrative instead.
 */
export function useNfcReader() {
  const supported =
    typeof globalThis !== 'undefined' && typeof (globalThis as WithNDEFReader).NDEFReader === 'function';

  const [reading, setReading] = useState(false);
  const [tags, setTags] = useState<NfcTagRead[]>([]);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (!supported) {
      setError('Web NFC not available in this browser. Real NFC works on Chrome for Android only.');
      return;
    }
    setError(null);
    setReading(true);
    try {
      const Ctor = (globalThis as WithNDEFReader).NDEFReader!;
      const reader = new Ctor();
      await reader.scan();
      reader.addEventListener('reading', (event) => {
        const records: string[] = [];
        const msg = event.message;
        if (msg?.records) {
          for (const r of msg.records) {
            if (r.recordType === 'text' && r.data) {
              try {
                const dec = new TextDecoder();
                const buf = r.data instanceof ArrayBuffer ? r.data : (r.data as DataView).buffer;
                records.push(dec.decode(buf));
              } catch {
                /* ignore */
              }
            } else if (r.recordType) {
              records.push(`[${r.recordType}]`);
            }
          }
        }
        const tag: NfcTagRead = {
          serial: event.serialNumber ?? 'unknown',
          records,
          timestamp: Date.now(),
        };
        setTags((prev) => [...prev, tag]);
      });
      reader.addEventListener('readingerror', () => {
        setError('Could not read tag — try again');
      });
    } catch (err) {
      setError((err as Error).message);
      setReading(false);
    }
  }, [supported]);

  return { supported, reading, tags, error, start };
}

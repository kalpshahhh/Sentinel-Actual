import { useCallback, useState } from 'react';

// Standard GATT service UUIDs for common medical / wearable devices.
// The OS picker will show any nearby device that advertises any of these.
const MEDICAL_SERVICE_UUIDS = [
  0x180d, // Heart Rate
  0x1822, // Pulse Oximeter
  0x1809, // Health Thermometer
  0x1810, // Blood Pressure
  0x1808, // Glucose
  0x181b, // Body Composition
  0x181d, // Weight Scale
  0x181a, // Environmental Sensing
  0x181c, // User Data (used by some wearables)
  // Vendor-specific services to allow many other devices through the picker
];

export type PairedBleDevice = {
  id: string;
  name: string;
  /** Whether we successfully connected (not just paired). */
  connected: boolean;
  /** GATT services we recognised. */
  matchedServices: string[];
};

export type BluetoothState = {
  /** Whether Web Bluetooth is available in this browser. */
  supported: boolean;
  /** Currently scanning. */
  scanning: boolean;
  /** Most recent error message. */
  error: string | null;
  /** Devices the user has paired during this session. */
  paired: PairedBleDevice[];
};

type BluetoothDeviceLite = {
  id: string;
  name?: string | null;
  gatt?: { connect: () => Promise<unknown> };
};

type NavWithBluetooth = Navigator & {
  bluetooth?: {
    requestDevice: (opts: unknown) => Promise<BluetoothDeviceLite>;
  };
};

/**
 * Wraps the Web Bluetooth API. Browsers that support it:
 *   - Chrome / Edge / Opera on desktop
 *   - Chrome on Android
 * Browsers that DO NOT support it:
 *   - Safari (any platform)
 *   - All browsers on iOS / iPadOS (Apple disables it system-wide)
 *   - Firefox on desktop
 *
 * Requires HTTPS (or localhost) AND a user gesture to open the picker.
 */
export function useBluetoothScanner() {
  const supported =
    typeof navigator !== 'undefined' && typeof (navigator as NavWithBluetooth).bluetooth !== 'undefined';

  const [state, setState] = useState<BluetoothState>({
    supported,
    scanning: false,
    error: null,
    paired: [],
  });

  const scan = useCallback(async () => {
    if (!supported) {
      setState((s) => ({ ...s, error: 'Web Bluetooth not available in this browser' }));
      return null;
    }
    setState((s) => ({ ...s, scanning: true, error: null }));
    try {
      const nav = navigator as NavWithBluetooth;
      const device = await nav.bluetooth!.requestDevice({
        // Use acceptAllDevices so the user can pair anything nearby.
        // Optional services advertise what we'd like to talk to if available.
        acceptAllDevices: true,
        optionalServices: MEDICAL_SERVICE_UUIDS,
      });

      let connected = false;
      try {
        if (device.gatt) {
          await device.gatt.connect();
          connected = true;
        }
      } catch {
        connected = false;
      }

      const paired: PairedBleDevice = {
        id: device.id,
        name: device.name ?? 'Unnamed device',
        connected,
        matchedServices: [],
      };

      setState((s) => ({
        ...s,
        scanning: false,
        paired: [...s.paired.filter((p) => p.id !== paired.id), paired],
      }));
      return paired;
    } catch (err) {
      const msg = (err as Error).message;
      setState((s) => ({
        ...s,
        scanning: false,
        error: msg.includes('User cancelled') ? null : msg,
      }));
      return null;
    }
  }, [supported]);

  const clear = useCallback(() => setState((s) => ({ ...s, paired: [], error: null })), []);

  return { ...state, scan, clear };
}

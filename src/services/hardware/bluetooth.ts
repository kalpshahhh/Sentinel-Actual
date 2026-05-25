/**
 * Bluetooth hardware service — wraps the Web Bluetooth hook.
 *
 * BROWSER-SAFE: requestDevice(), connect() via GATT.
 *
 * EDGE AGENT (future): Real bonded-device list enumeration, continuous
 * background scanning, GATT characteristic reads (SpO2, HR streams),
 * and OS-level pairing would run here on a local Node/Rust agent.
 * The browser can only trigger a picker on user gesture — it cannot
 * enumerate already-paired devices without one.
 */
export { useBluetoothScanner } from '../../hooks/useBluetoothScanner';
export type { BluetoothState, PairedBleDevice } from '../../hooks/useBluetoothScanner';

/**
 * NFC hardware service — wraps the Web NFC hook.
 *
 * BROWSER-SAFE: NDEFReader scan() on Chrome for Android only.
 *
 * EDGE AGENT (future): A local native agent (Capacitor/Electron) would
 * expose the full NFC NDEF record set, handle ISO 14443/15693 tags,
 * and read the signed drug-chest manifest automatically at install time
 * without requiring a user gesture.
 */
export { useNfcReader } from '../../hooks/useNfcReader';
export type { NfcTagRead } from '../../hooks/useNfcReader';

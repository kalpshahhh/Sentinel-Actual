import type {
  InventoryManifest,
  Medication,
  MedicalDevice,
  MedicationRoute,
  MedicationTag,
  DeviceCategory,
  ConnectivityType,
} from '../../types/inventory';
import { buildCapabilityProfile } from './engine';

export type ParseResult =
  | { ok: true; manifest: InventoryManifest }
  | { ok: false; error: string };

export function parseJsonManifest(raw: unknown, vesselName = 'Unknown Vessel'): ParseResult {
  try {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { ok: false, error: 'Invalid JSON: expected an object at root' };
    }
    const obj = raw as Record<string, unknown>;

    const medications: Medication[] = Array.isArray(obj.medications)
      ? obj.medications.map(normalizeMedication).filter((m): m is Medication => m !== null)
      : [];

    const devices: MedicalDevice[] = Array.isArray(obj.devices)
      ? obj.devices.map(normalizeDevice).filter((d): d is MedicalDevice => d !== null)
      : [];

    if (medications.length === 0 && devices.length === 0) {
      return { ok: false, error: 'Manifest has no recognisable medications or devices' };
    }

    const existingProfile =
      typeof obj.capabilityProfile === 'object' && obj.capabilityProfile !== null
        ? (obj.capabilityProfile as Partial<InventoryManifest['capabilityProfile']>)
        : undefined;

    const manifest: InventoryManifest = {
      vesselId:
        typeof obj.vesselId === 'string' ? obj.vesselId : `vessel-${Date.now()}`,
      vesselName:
        typeof obj.vesselName === 'string' ? obj.vesselName : vesselName,
      preset:
        typeof obj.preset === 'string' &&
        ['offshore', 'polar', 'custom'].includes(obj.preset)
          ? (obj.preset as 'offshore' | 'polar' | 'custom')
          : 'custom',
      importedAt: new Date().toISOString(),
      importSource: 'json',
      medications,
      devices,
      capabilityProfile: buildCapabilityProfile(devices, existingProfile),
    };

    return { ok: true, manifest };
  } catch (e) {
    return { ok: false, error: `Parse error: ${(e as Error).message}` };
  }
}

/** Minimal CSV format: name/generic_name, dosage, unit, quantity, expiry?, location?
 *  Header row required. Column order flexible (matched by name). */
export function parseCsvMedications(csv: string, vesselName = 'Unknown Vessel'): ParseResult {
  try {
    const lines = csv
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return { ok: false, error: 'CSV must have a header row and at least one data row' };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const col = (row: string[], name: string): string => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? (row[idx] ?? '').trim() : '';
    };

    const medications: Medication[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const name =
        col(cols, 'name') ||
        col(cols, 'generic_name') ||
        col(cols, 'genericname') ||
        col(cols, 'drug');
      if (!name) continue;

      medications.push({
        id: `csv_${name.toLowerCase().replace(/\W+/g, '_')}_${i}`,
        genericName: name,
        brandName: col(cols, 'brand') || col(cols, 'brand_name') || undefined,
        dosage: col(cols, 'dosage') || col(cols, 'dose') || '—',
        unit: col(cols, 'unit') || 'unit',
        quantity: Math.max(0, parseInt(col(cols, 'quantity') || col(cols, 'qty') || '0', 10) || 0),
        expirationDate:
          col(cols, 'expiry') ||
          col(cols, 'expiration') ||
          col(cols, 'expiration_date') ||
          col(cols, 'exp') ||
          undefined,
        route: ['oral'],
        tags: [],
        location:
          col(cols, 'location') || col(cols, 'drawer') || col(cols, 'storage') || undefined,
      });
    }

    if (medications.length === 0) {
      return { ok: false, error: 'No valid medication rows found in CSV' };
    }

    const manifest: InventoryManifest = {
      vesselId: `vessel-${Date.now()}`,
      vesselName,
      preset: 'custom',
      importedAt: new Date().toISOString(),
      importSource: 'csv',
      medications,
      devices: [],
      capabilityProfile: buildCapabilityProfile([]),
    };

    return { ok: true, manifest };
  } catch (e) {
    return { ok: false, error: `CSV parse error: ${(e as Error).message}` };
  }
}

function normalizeMedication(raw: unknown): Medication | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const genericName = String(r.genericName || r.name || '').trim();
  if (!genericName) return null;
  return {
    id: String(r.id || genericName.toLowerCase().replace(/\W+/g, '_')),
    genericName,
    brandName: r.brandName ? String(r.brandName) : undefined,
    dosage: String(r.dosage || r.dose || '—'),
    unit: String(r.unit || 'unit'),
    quantity: Number(r.quantity ?? 0),
    expirationDate: r.expirationDate ? String(r.expirationDate) : undefined,
    route: Array.isArray(r.route) ? (r.route.map(String) as MedicationRoute[]) : ['oral'],
    tags: Array.isArray(r.tags) ? (r.tags.map(String) as MedicationTag[]) : [],
    contraindications: Array.isArray(r.contraindications)
      ? r.contraindications.map(String)
      : undefined,
    substituteGroup: r.substituteGroup ? String(r.substituteGroup) : undefined,
    location: r.location ? String(r.location) : undefined,
    locked: r.locked === true,
  };
}

function normalizeDevice(raw: unknown): MedicalDevice | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = String(r.name || '').trim();
  if (!name) return null;
  return {
    id: String(r.id || name.toLowerCase().replace(/\W+/g, '_')),
    name,
    category: String(r.category || 'diagnostic') as DeviceCategory,
    connectivityType: String(r.connectivityType || 'none') as ConnectivityType,
    operational: r.operational !== false,
    batteryLevel: r.batteryLevel !== undefined ? Number(r.batteryLevel) : undefined,
    capabilities: Array.isArray(r.capabilities) ? r.capabilities.map(String) : [],
    notes: r.notes ? String(r.notes) : undefined,
    location: r.location ? String(r.location) : undefined,
  };
}

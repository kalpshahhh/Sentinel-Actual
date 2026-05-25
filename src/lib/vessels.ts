import type { CapabilityProfile, InventoryPreset, Scenario } from '../types';
import type { InventoryManifest } from '../types/inventory';

export type VesselRecord = {
  id: string;
  name: string;
  preset: InventoryPreset;
  capabilityProfile: CapabilityProfile | null;
  manifest: InventoryManifest | null;
  /** Pre-compiled offline protocol graph. Null until compilation runs. */
  compiledScenarios: Scenario[] | null;
  compiledAt: string | null;
  lastUpdated: string;
  createdAt: string;
};

const STORAGE_KEY = 'sentinel-vessels-v2';

export function loadVessels(): VesselRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as VesselRecord[];
  } catch {
    return [];
  }
}

export function saveVessel(vessel: VesselRecord): void {
  try {
    const existing = loadVessels();
    const idx = existing.findIndex((v) => v.id === vessel.id);
    const updated = vessel.lastUpdated ? vessel : { ...vessel, lastUpdated: new Date().toISOString() };
    if (idx >= 0) {
      existing[idx] = updated;
    } else {
      existing.push(updated);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

export function deleteVessel(id: string): void {
  try {
    const existing = loadVessels().filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

export function getVessel(id: string): VesselRecord | null {
  return loadVessels().find((v) => v.id === id) ?? null;
}

/** IDs for the two built-in presets — stable so we can upsert without duplicating. */
export const VESSEL_ID_OFFSHORE = 'built-in-offshore';
export const VESSEL_ID_POLAR = 'built-in-polar';

export function makeVesselId(): string {
  return `vessel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Returns the stable built-in record for a preset, merged with any saved data. */
export function getOrInitVessel(preset: InventoryPreset, name: string): VesselRecord {
  const id = preset === 'polar' ? VESSEL_ID_POLAR : VESSEL_ID_OFFSHORE;
  const saved = getVessel(id);
  if (saved) return saved;
  const now = new Date().toISOString();
  return {
    id,
    name,
    preset,
    capabilityProfile: null,
    manifest: null,
    compiledScenarios: null,
    compiledAt: null,
    lastUpdated: now,
    createdAt: now,
  };
}

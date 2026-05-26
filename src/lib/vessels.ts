import type { InventoryPreset } from '../types';
import type { VesselRecord } from '../types/location';
import { saveLocation, loadLocations, deleteLocation, getLocation } from './inventory/db';

export type { VesselRecord };

const LEGACY_STORAGE_KEY = 'sentinel-vessels-v2';

export const VESSEL_ID_OFFSHORE = 'built-in-offshore';
export const VESSEL_ID_POLAR = 'built-in-polar';

export function makeVesselId(): string {
  return `vessel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Returns the stable built-in record for a preset. Does NOT persist — caller must saveVessel. */
export function getOrInitVessel(preset: InventoryPreset, name: string): VesselRecord {
  const id = preset === 'polar' ? VESSEL_ID_POLAR : VESSEL_ID_OFFSHORE;
  const now = new Date().toISOString();
  return { id, name, preset, capabilityProfile: null, manifest: null, compiledScenarios: null, compiledAt: null, lastUpdated: now, createdAt: now };
}

/**
 * Load all locations from Dexie. On first run, migrates any data from the old
 * localStorage key and removes it so migration only happens once.
 */
export async function loadVessels(): Promise<VesselRecord[]> {
  const existing = await loadLocations();
  if (existing.length > 0) return existing;
  // One-time migration from localStorage
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VesselRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        await Promise.all(parsed.map((v) => saveLocation(v)));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return loadLocations();
      }
    }
  } catch { /* legacy migration skipped */ }
  return [];
}

export async function saveVessel(vessel: VesselRecord): Promise<void> {
  const rec = vessel.lastUpdated ? vessel : { ...vessel, lastUpdated: new Date().toISOString() };
  await saveLocation(rec);
}

export async function deleteVessel(id: string): Promise<void> {
  await deleteLocation(id);
}

export async function getVessel(id: string): Promise<VesselRecord | null> {
  return getLocation(id);
}

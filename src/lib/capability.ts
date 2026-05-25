import type { CapabilityProfile, InventoryPreset } from '../types';

const STORAGE_KEY = 'sentinel-capability-v1';

export function loadCapabilityProfile(): CapabilityProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<CapabilityProfile>;
    if (!p.siteType || !p.region || !p.comms) return null;
    return p as CapabilityProfile;
  } catch {
    return null;
  }
}

export function saveCapabilityProfile(p: CapabilityProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export function clearCapabilityProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Sensible default profile for a preset — used when the operator has not run
 * the wizard yet (demo / live without onboarding). Lets the rest of the app
 * always have a profile to work against.
 */
export function defaultProfileForPreset(preset: InventoryPreset): CapabilityProfile {
  if (preset === 'polar') {
    return {
      siteType: 'polar_research',
      region: 'arctic_polar',
      nearestEvac: 'Tromsø UNN',
      nearestEvacKm: 1400,
      evacPossible: true,
      expectedMedicEtaHours: 18,
      comms: 'sat_phone',
      constraints: 'Weather window dependent — polar night limits aviation Nov–Feb.',
      savedAt: new Date().toISOString(),
    };
  }
  return {
    siteType: 'offshore_supply',
    region: 'north_sea_offshore',
    nearestEvac: 'Aberdeen Royal Infirmary',
    nearestEvacKm: 280,
    evacPossible: true,
    expectedMedicEtaHours: 4,
    comms: 'sat_phone',
    constraints: 'Helideck operational sea state ≤ 6. Winch transfer if heli grounded.',
    savedAt: new Date().toISOString(),
  };
}

export function siteTypeLabel(s: CapabilityProfile['siteType']): string {
  return {
    offshore_supply: 'Offshore supply vessel',
    fishing_vessel: 'Fishing vessel',
    oil_rig: 'Oil / gas rig',
    polar_research: 'Polar research station',
    remote_clinic: 'Remote clinic',
    expedition: 'Expedition team',
  }[s];
}

export function regionLabel(r: CapabilityProfile['region']): string {
  return {
    arctic_polar: 'Arctic / Polar',
    north_sea_offshore: 'North Sea / Offshore',
    tropical: 'Tropical',
    temperate_open_ocean: 'Open ocean (temperate)',
    remote_continental: 'Remote continental',
  }[r];
}

export function commsLabel(c: CapabilityProfile['comms']): string {
  return {
    sat_phone: 'Satellite phone',
    vhf_only: 'VHF radio only',
    cellular: 'Cellular',
    none: 'No comms',
  }[c];
}

import type { CapabilityProfile, InventoryPreset, Scenario } from '../types';
import type { InventoryManifest } from './inventory';

export type VesselRecord = {
  id: string;
  name: string;
  preset: InventoryPreset;
  capabilityProfile: CapabilityProfile | null;
  manifest: InventoryManifest | null;
  compiledScenarios: Scenario[] | null;
  compiledAt: string | null;
  lastUpdated: string;
  createdAt: string;
};

import type {
  InventoryManifest,
  Medication,
  MedicalDevice,
  VesselCapabilityProfile,
  CapabilityKey,
} from '../../types/inventory';

export function getAvailableMedications(manifest: InventoryManifest): Medication[] {
  const today = new Date().toISOString().slice(0, 10);
  return manifest.medications.filter(
    (m) => m.quantity > 0 && (!m.expirationDate || m.expirationDate >= today)
  );
}

export function getExpiredMedications(manifest: InventoryManifest): Medication[] {
  const today = new Date().toISOString().slice(0, 10);
  return manifest.medications.filter(
    (m) => m.expirationDate && m.expirationDate < today
  );
}

export function getLowStockMedications(manifest: InventoryManifest, threshold = 3): Medication[] {
  return manifest.medications.filter((m) => m.quantity > 0 && m.quantity <= threshold);
}

export function getOperationalDevices(manifest: InventoryManifest): MedicalDevice[] {
  return manifest.devices.filter((d) => d.operational);
}

export function hasCapability(manifest: InventoryManifest, key: CapabilityKey): boolean {
  return manifest.capabilityProfile[key] === true;
}

export function getMedicationSubstitutes(
  manifest: InventoryManifest,
  substituteGroup: string
): Medication[] {
  return getAvailableMedications(manifest).filter((m) => m.substituteGroup === substituteGroup);
}

export function isDrugAvailable(manifest: InventoryManifest, drugNamePattern: string): boolean {
  const norm = drugNamePattern.toLowerCase();
  return getAvailableMedications(manifest).some(
    (m) =>
      m.genericName.toLowerCase().includes(norm) ||
      norm.includes(m.genericName.toLowerCase()) ||
      (m.brandName?.toLowerCase().includes(norm) ?? false)
  );
}

export function getMissingCriticalCapabilities(manifest: InventoryManifest): string[] {
  const warnings: string[] = [];
  if (!hasCapability(manifest, 'oxygen'))
    warnings.push('No oxygen supply — respiratory emergencies cannot be properly supported');
  if (!hasCapability(manifest, 'defib'))
    warnings.push('No defibrillator — cardiac arrest survival rate severely reduced');
  if (!isDrugAvailable(manifest, 'adrenaline'))
    warnings.push('No adrenaline — anaphylaxis (severe allergic reaction) cannot be treated');
  if (!isDrugAvailable(manifest, 'salbutamol'))
    warnings.push('No bronchodilator — severe asthma attack cannot be treated');
  if (!hasCapability(manifest, 'iv_access'))
    warnings.push('No IV supplies — parenteral drug administration not possible');
  return warnings;
}

/** Derive a VesselCapabilityProfile from the operational device list.
 *  Used when importing a manifest that has no explicit capabilityProfile. */
export function buildCapabilityProfile(
  devices: MedicalDevice[],
  existingProfile?: Partial<VesselCapabilityProfile>
): VesselCapabilityProfile {
  const caps = devices
    .filter((d) => d.operational)
    .flatMap((d) => d.capabilities.map((c) => c.toLowerCase()));
  const has = (kw: string) => caps.some((c) => c.includes(kw));

  return {
    ultrasound: has('ultrasound') || has('abdominal') || has('fast'),
    ecg: has('ecg') || has('12-lead'),
    defib: has('aed') || has('defib') || has('defibrillator'),
    oxygen: has('oxygen'),
    advanced_airway: has('advanced airway') || has('lma') || has('intubation'),
    iv_access: true, // assumed for any registered manifest
    blood_glucose: has('blood sugar') || has('blood glucose') || has('glucose'),
    trauma_splinting: has('splint') || has('immobilize'),
    suturing: has('suture') || has('close a cut') || has('wound closure'),
    evacuation_heli: existingProfile?.evacuation_heli ?? true,
    evacuation_shore: existingProfile?.evacuation_shore ?? true,
    satellite_comms: existingProfile?.satellite_comms ?? true,
    telemedicine: existingProfile?.telemedicine ?? true,
  };
}

export type InventorySummary = {
  totalMedications: number;
  availableMedications: number;
  expiredCount: number;
  lowStockCount: number;
  totalDevices: number;
  operationalDevices: number;
  criticalWarnings: string[];
};

export function getInventorySummary(manifest: InventoryManifest): InventorySummary {
  return {
    totalMedications: manifest.medications.length,
    availableMedications: getAvailableMedications(manifest).length,
    expiredCount: getExpiredMedications(manifest).length,
    lowStockCount: getLowStockMedications(manifest).length,
    totalDevices: manifest.devices.length,
    operationalDevices: getOperationalDevices(manifest).length,
    criticalWarnings: getMissingCriticalCapabilities(manifest),
  };
}

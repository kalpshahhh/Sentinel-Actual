export type MedicationRoute = 'oral' | 'im' | 'iv' | 'sl' | 'nebulised' | 'topical' | 'rectal' | 'sc';

export type MedicationTag =
  | 'analgesic'
  | 'antibiotic'
  | 'antiemetic'
  | 'cardiac'
  | 'airway'
  | 'trauma'
  | 'controlled'
  | 'iv_fluid'
  | 'allergy'
  | 'endocrine';

export type DeviceCategory =
  | 'imaging'
  | 'monitoring'
  | 'airway'
  | 'cardiac'
  | 'trauma'
  | 'diagnostic'
  | 'oxygen';

export type ConnectivityType = 'bluetooth' | 'usb' | 'nfc' | 'wifi' | 'none';

export type CapabilityKey =
  | 'ultrasound'
  | 'ecg'
  | 'defib'
  | 'oxygen'
  | 'advanced_airway'
  | 'iv_access'
  | 'blood_glucose'
  | 'trauma_splinting'
  | 'suturing'
  | 'evacuation_heli'
  | 'evacuation_shore'
  | 'satellite_comms'
  | 'telemedicine';

export type Medication = {
  id: string;
  genericName: string;
  brandName?: string;
  dosage: string;
  unit: string;
  quantity: number;
  /** ISO date YYYY-MM-DD */
  expirationDate?: string;
  route: MedicationRoute[];
  tags: MedicationTag[];
  contraindications?: string[];
  /** Logical group for substitution lookup, e.g. 'opioid_analgesic', 'nsaid', 'antiemetic' */
  substituteGroup?: string;
  location?: string;
  locked?: boolean;
};

export type MedicalDevice = {
  id: string;
  name: string;
  category: DeviceCategory;
  connectivityType: ConnectivityType;
  operational: boolean;
  /** 0–1 */
  batteryLevel?: number;
  capabilities: string[];
  notes?: string;
  location?: string;
};

export type VesselCapabilityProfile = {
  ultrasound: boolean;
  ecg: boolean;
  defib: boolean;
  oxygen: boolean;
  advanced_airway: boolean;
  iv_access: boolean;
  blood_glucose: boolean;
  trauma_splinting: boolean;
  suturing: boolean;
  evacuation_heli: boolean;
  evacuation_shore: boolean;
  satellite_comms: boolean;
  telemedicine: boolean;
};

export type InventoryImportSource = 'csv' | 'json' | 'demo' | 'barcode' | 'manual';

export type InventoryManifest = {
  vesselId: string;
  vesselName: string;
  preset: 'offshore' | 'polar' | 'custom';
  importedAt: string;
  importSource: InventoryImportSource;
  medications: Medication[];
  devices: MedicalDevice[];
  capabilityProfile: VesselCapabilityProfile;
};

export type InventoryAuditEntry = {
  id: string;
  timestamp: string;
  action: 'import' | 'scan' | 'manual_add' | 'quantity_update' | 'expiry_flag';
  source: InventoryImportSource;
  description: string;
  itemId?: string;
  quantityDelta?: number;
};

export type TreatmentSubstitution = {
  /** Substring matched (case-insensitive) against TreatmentStep.drug */
  originalDrugPattern: string;
  /** If set, look for any available medication in this substituteGroup */
  substituteGroup?: string;
  alternatives: Array<{
    requiresRoute?: MedicationRoute;
    action: string;
    note: string;
  }>;
  /** Shown in red when no substitute can be found */
  criticalWarning?: string;
};

export type MedBarcodeLookup = {
  barcode: string;
  genericName: string;
  brandName?: string;
  dosage: string;
  unit: string;
  tags: MedicationTag[];
};

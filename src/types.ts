export type Vessel = {
  name: string;
  type: string;
  flag: string;
  crew: number;
  lat: number;
  lng: number;
  etaToShoreHours: number;
  weatherCondition: string;
};

export type EquipmentCategory = 'device' | 'drug' | 'consumable';

export type Equipment = {
  id: string;
  name: string;
  category: EquipmentCategory;
  capabilities?: string[];
  dose?: string;
  unit?: string;
  quantityOnboard?: number;
  expiryWarning?: boolean;
  /** Physical location in the medical chest — used to direct a non-clinician to the drug. */
  location?: string;
  /** Whether the bottle/box is in a locked controlled-drugs cabinet. */
  locked?: boolean;
};

export type SymptomCategory = 'pain' | 'vitals' | 'gi' | 'neuro' | 'derm' | 'other';

export type Symptom = {
  id: string;
  label: string;
  category: SymptomCategory;
  value: any;
};

export type Vitals = {
  bp_systolic: number;
  bp_diastolic: number;
  hr: number;
  spo2: number;
  temp_c: number;
  rr: number;
  etco2?: number;
  pain_0_10: number;
};

export type Citation = {
  id: string;
  source: string;
  section: string;
  quote?: string;
  url?: string;
};

export type DiagramKind =
  | 'im_deltoid'
  | 'im_thigh'
  | 'im_gluteal'
  | 'iv_acf'
  | 'iv_hand'
  | 'sl_under_tongue'
  | 'po_oral'
  | 'neb_mask'
  | 'splint_arm'
  | 'splint_leg'
  | 'direct_pressure'
  | 'tourniquet'
  | 'cool_burn'
  | 'recovery_position';

export type TreatmentStep = {
  id: string;
  action: string;
  /** Plain-English detail — shown when user clicks "show more". 2-4 sentences. */
  detail?: string;
  /** Optional professional-level notes — shown when user clicks "show more" twice. */
  professionalNotes?: string;
  /** 1-2 sentence medical reasoning — shown in the Why drawer. */
  why?: string;
  /** Alternative actions if this step is not possible (drug missing, device broken, etc.) */
  alternatives?: Array<{ when: string; instead: string }>;
  /** Optional interactive diagram showing how to do this step. */
  diagram?: DiagramKind;
  drug?: string | null;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  citationIds: string[];
};

export type BodyRegion =
  // Head & neck
  | 'head_forehead'
  | 'head_temple'
  | 'eye_right'
  | 'eye_left'
  | 'ear_right'
  | 'ear_left'
  | 'mouth_jaw'
  | 'neck_front'
  | 'neck_back'
  // Chest
  | 'chest_center'
  | 'chest_upper_right'
  | 'chest_upper_left'
  // Abdomen (proper anatomical quadrants)
  | 'belly_ruq'
  | 'belly_luq'
  | 'belly_rlq'
  | 'belly_llq'
  | 'belly_periumbilical'
  // Back / flank
  | 'back_upper'
  | 'back_mid'
  | 'back_lower'
  | 'flank_right'
  | 'flank_left'
  // Pelvis
  | 'pelvis_groin'
  | 'hip_right'
  | 'hip_left'
  // Upper limb — right
  | 'shoulder_right'
  | 'upper_arm_right'
  | 'elbow_right'
  | 'forearm_right'
  | 'wrist_right'
  | 'hand_right'
  // Upper limb — left
  | 'shoulder_left'
  | 'upper_arm_left'
  | 'elbow_left'
  | 'forearm_left'
  | 'wrist_left'
  | 'hand_left'
  // Lower limb — right
  | 'thigh_right'
  | 'knee_right'
  | 'shin_right'
  | 'ankle_right'
  | 'foot_right'
  // Lower limb — left
  | 'thigh_left'
  | 'knee_left'
  | 'shin_left'
  | 'ankle_left'
  | 'foot_left'
  // Whole-body / system
  | 'head'
  | 'skin_general'
  | 'breathing'
  | 'general';

export type EmergencyTier =
  | 'tier1_immediate' // minutes - life-threatening
  | 'tier2_urgent'    // within 2 hours
  | 'tier3_today'     // within 24 hours
  | 'tier4_onboard';  // treat onboard, no evac

export type TimeAction = {
  tier: EmergencyTier;
  label: string;        // "HELICOPTER NOW" | "Helicopter within 2 hours" | "Get to shore within 24 hours" | "Treat onboard"
  detail: string;       // "Death within minutes if untreated" | "Recheck every 4 hours" etc.
  windowMinutes: number; // suggested time window
};

export type Scenario = {
  id: string;
  condition: string;
  /** 1-sentence plain-English explanation for a non-clinician. */
  layExplanation?: string;
  /** Even simpler 5-word headline shown on the result card. */
  shortHeadline?: string;
  likelihoodPercent: number;
  triggerSymptoms: string[];
  /** Plain-English yes/no questions pre-compiled at install time, presented one-at-a-time in the wizard. */
  yesNoQuestions?: string[];
  /** Tie-breaker questions used in compare/contrast view between two close conditions. */
  tieBreakers?: string[];
  /** Body regions where this condition typically manifests — used for deterministic differential lookup. */
  regions?: BodyRegion[];
  diagnosticSteps: string[];
  treatment: TreatmentStep[];
  evacuateIf: string[];
  manageOnboardIf: string[];
  citationIds: string[];
  reasoning?: string;
  category?: ScenarioCategory;
  /** Time-tier emergency classification used to replace generic "evacuate" wording. */
  timeAction?: TimeAction;
};

export type CaseDecisionAction = 'treat_onboard' | 'helicopter_now' | 'helicopter_2h' | 'shore_24h';

export type ScenarioCategory = 'cardiovascular' | 'trauma' | 'infection' | 'gu' | 'gi' | 'respiratory' | 'neuro' | 'other' | 'endocrine' | 'neurological' | 'environmental';

export type DifferentialItem = {
  condition: string;
  probability: number;
  reasoning: string;
};

export type AuditEntryType =
  | 'input'
  | 'decision'
  | 'llm_call'
  | 'citation_lookup'
  | 'override_available'
  | 'recommendation';

export type AuditEntry = {
  id: string;
  timestamp: string;
  mode: 'deploy' | 'incident' | 'handoff';
  type: AuditEntryType;
  description: string;
  data?: any;
};

export type CaseDecision = 'onboard' | 'evacuate';

export type CaseRecommendation = {
  steps: TreatmentStep[];
  decision: CaseDecision;
  rationale: string;
  costSavings: number;
};

export type Case = {
  id: string;
  startedAt: string;
  symptoms: Record<string, any>;
  vitals: Vitals;
  differential: DifferentialItem[];
  selectedCondition?: string;
  ultrasoundFindings?: string;
  recommendation?: CaseRecommendation;
  handoffNote?: string;
  resolved: boolean;
};

export type InventoryPreset = 'offshore' | 'polar';

export type SiteType =
  | 'offshore_supply'
  | 'fishing_vessel'
  | 'oil_rig'
  | 'polar_research'
  | 'remote_clinic'
  | 'expedition';

export type GeoRegion =
  | 'arctic_polar'
  | 'north_sea_offshore'
  | 'tropical'
  | 'temperate_open_ocean'
  | 'remote_continental';

export type CommsCapability =
  | 'sat_phone'
  | 'vhf_only'
  | 'cellular'
  | 'none';

/**
 * Operational capability profile gathered during onboarding. Determines which
 * emergencies the LLM compiles into the offline graph and shapes incident-time
 * decisions (evac vs. onboard-extended-care).
 */
export type CapabilityProfile = {
  siteType: SiteType;
  region: GeoRegion;
  /** Free-text label, e.g. "Aberdeen Royal Infirmary" or "Tromsø UNN". */
  nearestEvac: string;
  /** Approximate distance to the evac point in km. Used to sanity-check ETA. */
  nearestEvacKm: number;
  /** Whether evacuation is operationally possible at all from this site. */
  evacPossible: boolean;
  /** Expected medic/helicopter arrival time in hours, given current weather/distance. */
  expectedMedicEtaHours: number;
  comms: CommsCapability;
  /** Free-text constraints (e.g. "no helideck — winch only", "weather window closed Dec-Feb"). */
  constraints: string;
  /** ISO timestamp when this profile was saved. */
  savedAt: string;
};

export type AppMode = 'deploy' | 'incident' | 'handoff';

export type OneHandedMode = 'off' | 'left' | 'right';

export type EnvironmentState = {
  roughSeas: boolean;
  nightMode: boolean;
  gloved: boolean;
  oneHanded: OneHandedMode;
  motionLevel: number;
};

export type ArchitectureCounters = {
  protocolsCompiled: number;
  graphNodes: number;
  runtimeAI: number;
  cloudCalls: number;
  auditEntries: number;
};

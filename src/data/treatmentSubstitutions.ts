import type { TreatmentSubstitution } from '../types/inventory';

/** Deterministic substitution rules — no LLM, runs fully offline.
 *  Matched in TreatmentSteps when the inventory manifest is present. */
export const TREATMENT_SUBSTITUTIONS: TreatmentSubstitution[] = [
  {
    originalDrugPattern: 'Ceftriaxone',
    substituteGroup: 'iv_antibiotic',
    alternatives: [
      {
        requiresRoute: 'oral',
        action: 'Give Ciprofloxacin 500 mg by mouth every 12 hours as alternative antibiotic',
        note: 'IV ceftriaxone not available — oral ciprofloxacin provides broad Gram-negative cover for most maritime infections',
      },
      {
        requiresRoute: 'oral',
        action: 'Give Doxycycline 100 mg by mouth twice daily as second-line antibiotic',
        note: 'If ciprofloxacin also unavailable — broad-spectrum oral option',
      },
    ],
    criticalWarning:
      'No IV antibiotic available. Oral alternatives are less effective for severe infection. Escalate evacuation priority.',
  },
  {
    originalDrugPattern: 'Ketorolac',
    substituteGroup: 'nsaid',
    alternatives: [
      {
        requiresRoute: 'oral',
        action: 'Give Ibuprofen 400 mg by mouth every 6–8 hours as alternative painkiller',
        note: 'Oral NSAID — effective for moderate pain, slower onset than IM ketorolac',
      },
      {
        requiresRoute: 'im',
        action: 'Give Morphine 5 mg into the muscle for severe pain (requires captain key for locked cabinet)',
        note: 'Escalate to opioid if all NSAIDs are unavailable',
      },
    ],
  },
  {
    originalDrugPattern: 'Morphine',
    substituteGroup: 'opioid_analgesic',
    alternatives: [
      {
        requiresRoute: 'oral',
        action: 'Give Tramadol 50–100 mg by mouth as milder opioid alternative',
        note: 'Oral opioid — weaker than parenteral morphine, appropriate for moderate pain',
      },
      {
        requiresRoute: 'im',
        action: 'Give Ketamine 0.5 mg/kg into the muscle for severe pain (subdissociative dose)',
        note: 'Ketamine at low dose provides strong analgesia without respiratory depression — requires locked cabinet key',
      },
    ],
    criticalWarning:
      'No strong opioid available. Severe pain may be uncontrollable. Consider urgent evacuation.',
  },
  {
    originalDrugPattern: 'Fentanyl',
    substituteGroup: 'opioid_analgesic',
    alternatives: [
      {
        requiresRoute: 'im',
        action: 'Give Morphine 5–10 mg into the muscle or vein as alternative opioid',
        note: 'Morphine is a reasonable substitute for IV fentanyl in this context',
      },
    ],
  },
  {
    originalDrugPattern: 'Ondansetron',
    substituteGroup: 'antiemetic',
    alternatives: [
      {
        requiresRoute: 'im',
        action: 'Give Cyclizine 50 mg into the muscle for nausea and vomiting',
        note: 'Antihistamine antiemetic — standard maritime alternative to ondansetron',
      },
    ],
  },
  {
    originalDrugPattern: 'Adrenaline',
    alternatives: [],
    criticalWarning:
      'CRITICAL — No adrenaline (epinephrine) onboard. Anaphylaxis cannot be treated. Request helicopter evacuation immediately if severe allergic reaction suspected.',
  },
  {
    originalDrugPattern: 'Salbutamol',
    substituteGroup: 'bronchodilator',
    alternatives: [],
    criticalWarning:
      'No bronchodilator available. Severe asthma or bronchospasm cannot be treated onboard. Evacuate any crewmember with significant breathing difficulty.',
  },
  {
    originalDrugPattern: 'Tranexamic acid',
    alternatives: [
      {
        action: 'Apply direct pressure to wound and maintain for at least 10 minutes without lifting',
        note: 'TXA not available — mechanical haemostasis is the only option. Use tourniquet for limb haemorrhage.',
      },
    ],
  },
  {
    originalDrugPattern: 'Aspirin',
    substituteGroup: 'antiplatelet',
    alternatives: [
      {
        requiresRoute: 'oral',
        action: 'Give Clopidogrel 300 mg by mouth (loading dose) as alternative antiplatelet',
        note: 'If aspirin not available — clopidogrel loading is an acceptable ACS alternative',
      },
    ],
  },
  {
    originalDrugPattern: 'GTN',
    alternatives: [],
    criticalWarning:
      'No GTN (nitrate) spray available. Chest pain from suspected angina/ACS cannot be treated with nitrates. Prioritise aspirin + evacuation.',
  },
];

import type { Equipment, InventoryPreset } from '../types';

// Locations are pre-registered at install time (NFC-tagged drawers + signed manifest).
// Sentinel uses them to tell a non-clinician *exactly* where to find the drug.

export const OFFSHORE_INVENTORY: Equipment[] = [
  // Devices (BLE / wired discovery at install)
  { id: 'us_butterfly_iq3', name: 'Butterfly iQ3 handheld ultrasound', category: 'device', capabilities: ['abdominal', 'FAST', 'lung', 'ocular', 'vascular', 'cardiac', 'MSK'], quantityOnboard: 1, location: 'Bridge cabinet, top shelf' },
  { id: 'lp15', name: 'Stryker LIFEPAK 15 monitor/defibrillator', category: 'device', capabilities: ['12-lead ECG', 'SpO2', 'EtCO2', 'NIBP', 'AED', 'transcutaneous pacing'], quantityOnboard: 1, location: 'Sickbay, wall mount' },
  { id: 'glucometer', name: 'Glucometer (Abbott FreeStyle)', category: 'device', capabilities: ['blood sugar'], quantityOnboard: 1, location: 'Sickbay drawer 1' },
  { id: 'ir_thermometer', name: 'Infrared thermometer', category: 'device', capabilities: ['temperature'], quantityOnboard: 2, location: 'Sickbay drawer 1' },
  { id: 'o2_d', name: 'Oxygen cylinder D-size', category: 'device', capabilities: ['oxygen therapy'], quantityOnboard: 4, location: 'Sickbay, behind door' },
  { id: 'bvm', name: 'Bag-valve mask', category: 'device', capabilities: ['rescue breathing'], quantityOnboard: 2, location: 'Sickbay shelf 2' },
  { id: 'airways', name: 'OPA/NPA airway set', category: 'device', capabilities: ['airway support'], quantityOnboard: 1, location: 'Sickbay shelf 2' },
  { id: 'suction', name: 'Portable suction unit', category: 'device', capabilities: ['clear airway'], quantityOnboard: 1, location: 'Sickbay shelf 2' },
  { id: 'splint_set', name: 'Splint set', category: 'device', capabilities: ['immobilize broken bone'], quantityOnboard: 1, location: 'Sickbay closet, left' },
  { id: 'c_collar', name: 'Neck collar', category: 'device', capabilities: ['neck immobilization'], quantityOnboard: 2, location: 'Sickbay closet, left' },
  { id: 'ked', name: 'KED extrication device', category: 'device', capabilities: ['safe patient extraction'], quantityOnboard: 1, location: 'Sickbay closet, left' },
  { id: 'suture_kit', name: 'Suture kit (3-0 prolene, 4-0 vicryl)', category: 'device', capabilities: ['close a cut'], quantityOnboard: 4, location: 'Drawer 4, blue label' },
  { id: 'staples', name: 'Skin staples', category: 'device', capabilities: ['close a cut'], quantityOnboard: 3, location: 'Drawer 4, blue label' },
  { id: 'lma', name: 'LMA (laryngeal mask airway)', category: 'device', capabilities: ['advanced airway'], quantityOnboard: 1, location: 'Sickbay shelf 2' },
  { id: 'ett', name: 'Breathing tubes (7.0/7.5/8.0)', category: 'device', capabilities: ['advanced airway'], quantityOnboard: 2, location: 'Sickbay shelf 2' },
  { id: 'laryngoscope', name: 'Laryngoscope', category: 'device', capabilities: ['advanced airway'], quantityOnboard: 1, location: 'Sickbay shelf 2' },

  // Drugs — locations from install-time signed manifest
  { id: 'paracetamol', name: 'Paracetamol (acetaminophen) tablets', category: 'drug', dose: '500 mg', unit: 'tablet, by mouth', quantityOnboard: 100, location: 'Drawer 2, white label' },
  { id: 'ibuprofen', name: 'Ibuprofen tablets', category: 'drug', dose: '400 mg', unit: 'tablet, by mouth', quantityOnboard: 60, location: 'Drawer 2, white label' },
  { id: 'ketorolac', name: 'Ketorolac injection', category: 'drug', dose: '30 mg / 1 mL', unit: 'ampoule, into muscle', quantityOnboard: 20, location: 'Drawer 3, yellow label' },
  { id: 'morphine', name: 'Morphine injection', category: 'drug', dose: '10 mg / 1 mL', unit: 'ampoule, into muscle', quantityOnboard: 10, location: 'Locked cabinet, key with captain', locked: true },
  { id: 'fentanyl', name: 'Fentanyl injection', category: 'drug', dose: '50 mcg / 1 mL', unit: 'ampoule, into vein', quantityOnboard: 6, location: 'Locked cabinet, key with captain', locked: true },
  { id: 'tramadol', name: 'Tramadol capsules', category: 'drug', dose: '50 mg', unit: 'capsule, by mouth', quantityOnboard: 30, location: 'Drawer 2, white label' },
  { id: 'ketamine', name: 'Ketamine injection', category: 'drug', dose: '50 mg / 1 mL', unit: 'ampoule, into muscle/vein', quantityOnboard: 4, location: 'Locked cabinet, key with captain', locked: true },
  { id: 'midazolam', name: 'Midazolam injection', category: 'drug', dose: '5 mg / 1 mL', unit: 'ampoule, into vein', quantityOnboard: 6, location: 'Drawer 3, yellow label' },
  { id: 'ondansetron', name: 'Ondansetron injection (anti-sickness)', category: 'drug', dose: '4 mg / 2 mL', unit: 'ampoule, into vein', quantityOnboard: 20, location: 'Drawer 3, yellow label' },
  { id: 'cyclizine', name: 'Cyclizine injection (anti-sickness)', category: 'drug', dose: '50 mg / 1 mL', unit: 'ampoule, into muscle', quantityOnboard: 10, location: 'Drawer 3, yellow label' },
  { id: 'adrenaline', name: 'Adrenaline 1:1000 (epinephrine)', category: 'drug', dose: '1 mg / 1 mL', unit: 'ampoule, into muscle', quantityOnboard: 10, location: 'Red allergy box, top of cabinet' },
  { id: 'naloxone', name: 'Naloxone injection (opioid reversal)', category: 'drug', dose: '400 mcg / 1 mL', unit: 'ampoule, into muscle/vein', quantityOnboard: 10, location: 'Drawer 3, yellow label' },
  { id: 'hydrocortisone', name: 'Hydrocortisone injection (steroid)', category: 'drug', dose: '100 mg', unit: 'vial, into vein', quantityOnboard: 6, location: 'Red allergy box, top of cabinet' },
  { id: 'salbutamol_neb', name: 'Salbutamol nebule (breathing medicine)', category: 'drug', dose: '5 mg / 2.5 mL', unit: 'nebuliser', quantityOnboard: 20, location: 'Drawer 5, blue label' },
  { id: 'aspirin', name: 'Aspirin dispersible', category: 'drug', dose: '300 mg', unit: 'tablet, chew/dissolve', quantityOnboard: 50, location: 'Drawer 2, white label' },
  { id: 'gtn', name: 'GTN spray (under-the-tongue)', category: 'drug', dose: '400 mcg', unit: 'spray', quantityOnboard: 2, location: 'Drawer 2, white label' },
  { id: 'clopidogrel', name: 'Clopidogrel tablets', category: 'drug', dose: '75 mg', unit: 'tablet, by mouth', quantityOnboard: 30, location: 'Drawer 2, white label' },
  { id: 'tamsulosin', name: 'Tamsulosin capsules', category: 'drug', dose: '0.4 mg', unit: 'capsule, by mouth', quantityOnboard: 30, location: 'Drawer 2, white label' },
  { id: 'amoxicillin', name: 'Amoxicillin capsules (antibiotic)', category: 'drug', dose: '500 mg', unit: 'capsule, by mouth', quantityOnboard: 60, location: 'Drawer 6, green label' },
  { id: 'ciprofloxacin', name: 'Ciprofloxacin tablets (antibiotic)', category: 'drug', dose: '500 mg', unit: 'tablet, by mouth', quantityOnboard: 30, location: 'Drawer 6, green label' },
  { id: 'ceftriaxone', name: 'Ceftriaxone injection (antibiotic)', category: 'drug', dose: '1 g', unit: 'vial, into vein', quantityOnboard: 10, location: 'Drawer 6, green label' },
  { id: 'doxycycline', name: 'Doxycycline capsules (antibiotic)', category: 'drug', dose: '100 mg', unit: 'capsule, by mouth', quantityOnboard: 30, location: 'Drawer 6, green label' },
  { id: 'metronidazole', name: 'Metronidazole tablets (antibiotic)', category: 'drug', dose: '400 mg', unit: 'tablet, by mouth', quantityOnboard: 30, location: 'Drawer 6, green label' },
  { id: 'txa', name: 'Tranexamic acid injection (stops bleeding)', category: 'drug', dose: '500 mg / 5 mL', unit: 'ampoule, into vein', quantityOnboard: 10, location: 'Trauma kit, red bag' },
  { id: 'glucagon', name: 'Glucagon kit (for low blood sugar)', category: 'drug', dose: '1 mg', unit: 'kit, into muscle', quantityOnboard: 4, location: 'Drawer 1, orange label' },
  { id: 'iv_nacl', name: 'Saline 0.9% IV bag', category: 'drug', dose: '1 L', unit: 'IV bag', quantityOnboard: 20, location: 'IV fluid shelf' },
  { id: 'iv_hartmann', name: "Hartmann's solution IV bag", category: 'drug', dose: '1 L', unit: 'IV bag', quantityOnboard: 20, location: 'IV fluid shelf' },
  { id: 'iv_dextrose', name: 'Dextrose 5% IV bag (sugar)', category: 'drug', dose: '500 mL', unit: 'IV bag', quantityOnboard: 10, location: 'IV fluid shelf' },
];

export const POLAR_INVENTORY: Equipment[] = [
  ...OFFSHORE_INVENTORY.filter((e) => {
    if (e.id === 'morphine') return false;
    if (e.id === 'fentanyl') return false;
    return true;
  }).map((e) => {
    if (e.id === 'ketamine') return { ...e, quantityOnboard: 8 };
    return e;
  }),
  { id: 'morphine', name: 'Morphine injection (reduced stock)', category: 'drug', dose: '10 mg / 1 mL', unit: 'ampoule, into muscle', quantityOnboard: 4, location: 'Locked cabinet, key with station leader', locked: true },

  { id: 'rewarming_bath', name: 'Rapid rewarming bath (40°C)', category: 'device', capabilities: ['warm a frozen limb', 'rewarm core temperature'], quantityOnboard: 1, location: 'Medical bay, near sink' },
  { id: 'hypothermia_kit', name: 'Low-reading thermometer + cold-injury kit', category: 'device', capabilities: ['measure temperature down to 15°C'], quantityOnboard: 2, location: 'Sickbay drawer 1' },
  { id: 'bair_hugger', name: 'Forced-air warming blanket (Bair Hugger)', category: 'device', capabilities: ['warm a cold person'], quantityOnboard: 1, location: 'Medical bay closet' },
  { id: 'frostbite_dressing', name: 'Frostbite ointment + non-stick dressings', category: 'consumable', quantityOnboard: 20, location: 'Cold-injury drawer' },
  { id: 'iloprost', name: 'Iloprost injection (for severe frostbite)', category: 'drug', dose: '50 mcg / 0.5 mL', unit: 'ampoule, into vein', quantityOnboard: 6, location: 'Drawer 7, frost-injury' },
  { id: 'oseltamivir', name: 'Oseltamivir capsules (flu medicine)', category: 'drug', dose: '75 mg', unit: 'capsule, by mouth', quantityOnboard: 60, location: 'Drawer 6, green label' },
  { id: 'aloe_vera', name: 'Aloe vera gel (frostbite topical)', category: 'consumable', quantityOnboard: 4, location: 'Cold-injury drawer' },
  { id: 'thermal_blanket', name: 'Mylar thermal blankets', category: 'consumable', quantityOnboard: 30, location: 'Cold-injury drawer' },
];

export function getInventoryForPreset(preset: InventoryPreset): Equipment[] {
  return preset === 'polar' ? POLAR_INVENTORY : OFFSHORE_INVENTORY;
}

export function getCapabilitySummary(inventory: Equipment[]): string[] {
  const caps = new Set<string>();
  for (const item of inventory) {
    if (item.capabilities) for (const c of item.capabilities) caps.add(c);
    if (item.category === 'drug') caps.add(`${item.name} ${item.dose ?? ''} ${item.unit ?? ''}`.trim());
  }
  return Array.from(caps);
}

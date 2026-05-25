import type { MedBarcodeLookup } from '../../types/inventory';

/** Offline barcode → medication lookup. Real deployments would include a full GS1 dataset.
 *  These cover the most common medications found in maritime medical chests. */
export const OFFLINE_MED_BARCODES: MedBarcodeLookup[] = [
  { barcode: '5000158070057', genericName: 'Paracetamol', brandName: 'Panadol', dosage: '500 mg', unit: 'tablet', tags: ['analgesic'] },
  { barcode: '5000356025010', genericName: 'Ibuprofen', brandName: 'Nurofen', dosage: '400 mg', unit: 'tablet', tags: ['analgesic'] },
  { barcode: '5010456020321', genericName: 'Aspirin', dosage: '300 mg', unit: 'tablet', tags: ['cardiac', 'analgesic'] },
  { barcode: '4046596013040', genericName: 'Ondansetron', dosage: '4 mg / 2 mL', unit: 'ampoule', tags: ['antiemetic'] },
  { barcode: '3664798039282', genericName: 'Ketorolac', dosage: '30 mg / 1 mL', unit: 'ampoule', tags: ['analgesic'] },
  { barcode: '5000456712983', genericName: 'Amoxicillin', dosage: '500 mg', unit: 'capsule', tags: ['antibiotic'] },
  { barcode: '3401060807818', genericName: 'Ciprofloxacin', dosage: '500 mg', unit: 'tablet', tags: ['antibiotic'] },
  { barcode: '3400932271155', genericName: 'Ceftriaxone', dosage: '1 g', unit: 'vial', tags: ['antibiotic'] },
  { barcode: '3400935577157', genericName: 'Doxycycline', dosage: '100 mg', unit: 'capsule', tags: ['antibiotic'] },
  { barcode: '3400933282326', genericName: 'Adrenaline', brandName: 'Epinephrine', dosage: '1 mg / 1 mL', unit: 'ampoule', tags: ['allergy', 'cardiac'] },
  { barcode: '3400931699869', genericName: 'Naloxone', dosage: '400 mcg / 1 mL', unit: 'ampoule', tags: ['analgesic'] },
  { barcode: '3400932543524', genericName: 'Morphine', dosage: '10 mg / 1 mL', unit: 'ampoule', tags: ['analgesic', 'controlled'] },
  { barcode: '3400930141017', genericName: 'Salbutamol', brandName: 'Ventolin', dosage: '5 mg / 2.5 mL', unit: 'nebule', tags: ['airway'] },
  { barcode: '3401360176218', genericName: 'GTN spray', brandName: 'Nitrolingual', dosage: '400 mcg', unit: 'spray', tags: ['cardiac'] },
  { barcode: '3400933451978', genericName: 'Tranexamic acid', dosage: '500 mg / 5 mL', unit: 'ampoule', tags: ['trauma'] },
  { barcode: '3400932005001', genericName: 'Midazolam', dosage: '5 mg / 1 mL', unit: 'ampoule', tags: ['controlled'] },
  { barcode: '3400933990002', genericName: 'Cyclizine', dosage: '50 mg / 1 mL', unit: 'ampoule', tags: ['antiemetic'] },
  { barcode: '3400934001003', genericName: 'Hydrocortisone', dosage: '100 mg', unit: 'vial', tags: ['allergy'] },
  { barcode: '3400934100101', genericName: 'Glucagon', dosage: '1 mg', unit: 'kit', tags: ['endocrine'] },
  { barcode: '3400934200208', genericName: 'Metronidazole', dosage: '400 mg', unit: 'tablet', tags: ['antibiotic'] },
  { barcode: '3400934300304', genericName: 'Tramadol', dosage: '50 mg', unit: 'capsule', tags: ['analgesic'] },
  { barcode: '3400934400409', genericName: 'Tamsulosin', dosage: '0.4 mg', unit: 'capsule', tags: ['analgesic'] },
  { barcode: '3400934500503', genericName: 'Clopidogrel', dosage: '75 mg', unit: 'tablet', tags: ['cardiac'] },
  { barcode: '3400934600600', genericName: 'Fentanyl', dosage: '50 mcg / 1 mL', unit: 'ampoule', tags: ['analgesic', 'controlled'] },
  { barcode: '3400934700706', genericName: 'Ketamine', dosage: '50 mg / 1 mL', unit: 'ampoule', tags: ['analgesic', 'controlled'] },
];

export function lookupBarcode(code: string): MedBarcodeLookup | null {
  return OFFLINE_MED_BARCODES.find((m) => m.barcode === code.trim()) ?? null;
}

/** Fuzzy lookup — tries the full code, then last 8 digits (strips leading zeros/check digits). */
export function lookupBarcodeFuzzy(code: string): MedBarcodeLookup | null {
  const exact = lookupBarcode(code);
  if (exact) return exact;
  const stripped = code.replace(/^0+/, '').replace(/\D/g, '');
  return OFFLINE_MED_BARCODES.find((m) => m.barcode.endsWith(stripped.slice(-8))) ?? null;
}

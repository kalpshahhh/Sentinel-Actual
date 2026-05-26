import type { Equipment } from '../types';
import { OFFSHORE_INVENTORY, POLAR_INVENTORY } from './equipment';

const ALL = [...OFFSHORE_INVENTORY, ...POLAR_INVENTORY];

/** Find a drug record by fuzzy name match — used to tell users where the drug is physically stored. */
export function findDrugLocation(drugName: string): Equipment | null {
  const norm = drugName.toLowerCase();
  // Try direct substring match
  for (const e of ALL) {
    if (e.category !== 'drug') continue;
    if (e.name.toLowerCase().includes(norm) || norm.includes(e.name.toLowerCase())) return e;
  }
  // First word match
  const first = norm.split(/[ (]/)[0];
  for (const e of ALL) {
    if (e.category !== 'drug') continue;
    const en = e.name.toLowerCase().split(/[ (]/)[0];
    if (en && first && (en === first || en.startsWith(first) || first.startsWith(en))) return e;
  }
  return null;
}

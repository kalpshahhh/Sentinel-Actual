import type { Citation } from '../types';

// Quotes paraphrased into plain English a non-clinician can understand.
// Source/section are real and stay verbatim so the telemedicine receiver can audit.
export const CITATIONS: Record<string, Citation> = {
  bnf_renal_colic: {
    id: 'bnf_renal_colic',
    source: 'BNF',
    section: '7.4.1',
    quote:
      'For adults with a small kidney stone (<10mm), give tamsulosin 0.4 mg by mouth once daily to help the stone pass.',
  },
  bnf_ketorolac: {
    id: 'bnf_ketorolac',
    source: 'BNF',
    section: '10.1.1',
    quote:
      'Ketorolac 30 mg injection into muscle, single dose. Maximum 90 mg in 24 hours. Do not use if the person has kidney problems.',
  },
  mca_renal: {
    id: 'mca_renal',
    source: 'MCA Ship Captain Medical Guide (22nd ed)',
    section: 'Kidney stones, §12.3',
    quote:
      'Treat onboard if the pain can be controlled, there is no fever, and there is no sign of a blockage. Evacuate if you suspect a kidney infection or the pain will not go away.',
  },
  nasa_cmoda: {
    id: 'nasa_cmoda',
    source: 'NASA CMO-DA validation study',
    section: 'Severe one-sided back pain scenario, Aug 2025',
    quote:
      'In testing, the system correctly identified kidney stone in 74% of cases, with a treatment plan reviewed and approved by three physicians.',
  },
  suspend_trial: {
    id: 'suspend_trial',
    source: 'Pickard et al, SUSPEND trial, Lancet 2015',
    section: 'Medicine to help kidney stones pass',
    quote:
      'A specific kind of medicine (alpha-blocker) helps medium-sized kidney stones (5-10mm) in the lower part of the urinary tract pass on their own.',
  },
  pocus_renal: {
    id: 'pocus_renal',
    source: 'Smith-Bindman et al, NEJM 2014',
    section: 'Ultrasound vs CT scan for kidney stones',
    quote:
      'A bedside ultrasound is just as good as a CT scan as a first check for someone with a suspected kidney stone.',
  },
  acep_acs: {
    id: 'acep_acs',
    source: 'ACEP Clinical Policy: Chest Pain',
    section: '2018 revision',
    quote:
      'If you suspect a heart attack, give aspirin 300 mg by mouth and a spray of GTN under the tongue while you wait for evacuation.',
  },
  who_anaphylaxis: {
    id: 'who_anaphylaxis',
    source: 'WHO Anaphylaxis Guidelines',
    section: '2023',
    quote:
      'For a severe allergic reaction, inject 0.5 mg of adrenaline (1:1000) into the muscle on the outside of the thigh. Repeat after 5 minutes if needed.',
  },
  parkland: {
    id: 'parkland',
    source: 'Parkland Formula',
    section: 'Fluid replacement for burns',
    quote:
      'Give 4 mL of fluid per kilogram of body weight per percent of body surface burned, over 24 hours. Half goes in the first 8 hours.',
  },
  tccc: {
    id: 'tccc',
    source: 'TCCC Guidelines',
    section: 'MARCH algorithm',
    quote:
      'Treat in order: stop major bleeding, open the airway, help them breathe, check circulation, protect the head and keep them warm.',
  },
};

export const VALID_CITATION_IDS = Object.keys(CITATIONS);

export function getCitation(id: string): Citation | undefined {
  return CITATIONS[id];
}

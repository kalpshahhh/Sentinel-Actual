import type { Scenario, TimeAction, TreatmentStep } from '../types';

// === Time-tier helpers ===
const TA = {
  HELI_NOW: {
    tier: 'tier1_immediate' as const,
    label: 'HELICOPTER NOW',
    detail: 'Life-threatening. Call for evacuation immediately. Death possible within minutes if untreated.',
    windowMinutes: 30,
  },
  HELI_2H: {
    tier: 'tier2_urgent' as const,
    label: 'Helicopter within 2 hours',
    detail: 'Serious. Hospital-level care needed soon. Stabilize while evac is en route.',
    windowMinutes: 120,
  },
  SHORE_24H: {
    tier: 'tier3_today' as const,
    label: 'Get to shore within 24 hours',
    detail: 'Urgent but stable. Treat onboard now, plan evacuation at next port window.',
    windowMinutes: 1440,
  },
  ONBOARD: {
    tier: 'tier4_onboard' as const,
    label: 'Treat onboard',
    detail: 'Manageable with onboard supplies. Recheck regularly.',
    windowMinutes: 0,
  },
} satisfies Record<string, TimeAction>;

// === Reusable alternative fallback ===
// Every step gets at least one of these so the user never sees "no alternative pre-compiled".
const STD_ALT_DRUG_MISSING = { when: 'You cannot find the drug or it has run out', instead: 'Look in the second supply drawer or the locked cabinet (ask the captain for the key). If still nothing, contact the on-shore physician at the next satellite window.' };
const STD_ALT_PERSON_AWAKE_REFUSES = { when: 'The person is awake but refuses', instead: 'Do not force it. Document the refusal in the operator note field. Call the on-shore physician at the next sync window for guidance.' };

export const FALLBACK_SCENARIOS_OFFSHORE: Scenario[] = [
  // === 1. KIDNEY STONE ===
  {
    id: 'kidney_stone',
    condition: 'Kidney stone',
    shortHeadline: 'Likely a kidney stone',
    layExplanation:
      'A small hard lump has formed in the kidney and is trying to pass through a narrow tube — that is what causes the severe one-sided back pain.',
    category: 'gu',
    likelihoodPercent: 7,
    timeAction: TA.ONBOARD,
    regions: ['flank_right', 'flank_left', 'back_lower', 'belly_rlq', 'belly_llq', 'pelvis_groin'],
    triggerSymptoms: ['severe one-sided back/side pain', 'pain comes in waves', 'blood in urine', 'feeling sick / vomiting', 'pain spreads to the groin'],
    yesNoQuestions: [
      'Does the pain come in waves — getting worse, then better?',
      'Does the pain spread down toward the groin?',
      'Is there any blood when they pee?',
      'Are they feeling sick or vomiting?',
      'Did the pain start very suddenly (within minutes)?',
    ],
    tieBreakers: [
      'Is there a fever above 38°C / 100.4°F? (No = stone; Yes = infection)',
      'Has the pain been there constantly for more than 12 hours? (Yes = think infection or other)',
    ],
    diagnosticSteps: [
      'Use the handheld ultrasound on the painful side of the back to look for swelling in the kidney',
      'Check urine for visible blood',
      'Check temperature with the infrared thermometer',
    ],
    treatment: [
      {
        id: 'k1',
        action: 'Give a pain-relief shot into the muscle',
        detail:
          'Get the small glass bottle labelled "Ketorolac 30 mg" from Drawer 3 (yellow label). Snap the top off. Draw all of it (1 mL) into a 21-gauge needle (the 1.5-inch ones, packaged separately in the same drawer). Pick a spot on the outside of the upper arm or the outside of the thigh. Wipe with an alcohol swab. Push the needle straight in (90° to skin) all the way to the hub, pull back slightly on the plunger to make sure no blood appears, then push the medicine in over 5 seconds. Pull out and press gauze on the spot.',
        professionalNotes:
          'IM ketorolac 30 mg; max 90 mg/24h; do not use if creatinine clearance reduced, active bleeding, or peptic ulcer disease.',
        why:
          'Ketorolac is a strong non-opioid painkiller in the NSAID family. It works by reducing the prostaglandins that make the ureter spasm — so it both relieves pain and helps relax the tube around the stone so it can pass.',
        diagram: 'im_deltoid',
        drug: 'Ketorolac injection',
        dose: '30 mg',
        route: 'into the muscle (shoulder or thigh)',
        frequency: 'every 6 hours as needed (maximum 4 doses in 24 hours)',
        alternatives: [
          { when: 'No ketorolac in stock', instead: 'Use Morphine 5 mg into a vein every 4 hours. Ask the captain for the key to the locked cabinet.' },
          { when: 'The person has kidney problems, stomach-ulcer history, or is over 65', instead: 'Skip ketorolac. Use Morphine 5 mg into a vein every 4 hours instead.' },
          { when: 'You cannot do an injection', instead: 'Give two Paracetamol 500 mg tablets and two Ibuprofen 400 mg tablets by mouth (both from Drawer 2). Less effective but workable.' },
        ],
        citationIds: ['bnf_ketorolac', 'mca_renal'],
      },
      {
        id: 'k2',
        action: 'Give an anti-sickness shot if they are nauseous',
        detail:
          'Get Ondansetron 4 mg from Drawer 3 (yellow label). Snap open. Push slowly (over 1 minute) into the same IV line you set up for fluids, or directly into a vein with a small needle.',
        professionalNotes:
          'Ondansetron 4 mg IV; can be given IM if no IV access. Watch for prolonged QT in patients on serotonergic agents.',
        why:
          'Severe pain reliably causes vomiting. Vomiting causes dehydration, which makes the kidney stone harder to pass and the kidney itself work harder. Ondansetron stops the vomit signal in the brain.',
        diagram: 'iv_acf',
        drug: 'Ondansetron injection',
        dose: '4 mg',
        route: 'into a vein',
        frequency: 'every 8 hours as needed',
        alternatives: [
          { when: 'No IV access', instead: 'Give Cyclizine 50 mg into the outside of the thigh muscle instead. From Drawer 3.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: ['mca_renal'],
      },
      {
        id: 'k3',
        action: 'Set up an IV fluid drip',
        detail:
          'Take a bag of "Hartmann\'s solution 1 L" from the IV fluid shelf. Spike it with a giving set (clear plastic tube with drip chamber). Hang it on a hook or doorframe higher than the patient. Insert a green (18-gauge) or grey (16-gauge) cannula into the bend of the elbow — the vein you can see most easily. Connect the giving set. Open the roller clamp to a fast drip (about 1 drop per second) for the first bag.',
        professionalNotes:
          "Hartmann's (lactated Ringer's) 1 L over 2 hours, then 100 mL/h maintenance. Switch to NaCl 0.9% if hyperkalaemia suspected.",
        why:
          'Most kidney stones pass on their own when the kidney has enough water to flush them. IV fluids also reduce pain by easing the pressure inside the kidney.',
        diagram: 'iv_acf',
        drug: "Hartmann's solution IV bag",
        dose: '1 litre',
        route: 'IV drip into a vein',
        frequency: 'first bag over 2 hours, then 1 bag every 8 hours',
        alternatives: [
          { when: 'You cannot get an IV in', instead: 'Give 500 mL of water by mouth every hour as long as they are not vomiting. Less efficient but works for mild dehydration.' },
          { when: 'IV bag stock is low', instead: 'Use 0.9% Saline 1 L bags from the same shelf — equally good for this purpose.' },
        ],
        citationIds: ['mca_renal'],
      },
      {
        id: 'k4',
        action: 'Give a daily pill that helps the stone pass',
        detail:
          'Get a "Tamsulosin 0.4 mg" capsule from Drawer 2 (white label). Have them swallow it whole with a sip of water after a meal. One capsule a day for up to 28 days.',
        professionalNotes:
          'Tamsulosin 0.4 mg PO OD as medical expulsive therapy. Most effective for stones 5-10 mm in the distal ureter. Counsel about postural hypotension on first dose.',
        why:
          'Tamsulosin relaxes the muscle of the tube the stone is travelling down. Studies show this gets stones that otherwise would not have passed to pass on their own — fewer surgeries needed.',
        diagram: 'po_oral',
        drug: 'Tamsulosin capsules',
        dose: '0.4 mg',
        route: 'by mouth',
        frequency: 'once a day for up to 28 days',
        alternatives: [
          { when: 'No tamsulosin available', instead: 'Skip this step. Most stones still pass with hydration and pain control alone within 7 days.' },
          { when: 'They have very low blood pressure or feel dizzy when standing', instead: 'Hold tamsulosin and reassess in 24 hours. It can drop blood pressure further.' },
        ],
        citationIds: ['bnf_renal_colic', 'suspend_trial'],
      },
      {
        id: 'k5',
        action: 'Catch any stone they pee out',
        detail:
          'Give them an empty bottle and a piece of gauze from the suture kit. Have them pee through the gauze every time. If they catch a stone (looks like a tiny gravel piece, brown or yellow), put it in a sealed bag with the time written on it. The on-shore physician will analyse it to choose long-term prevention.',
        why:
          'The composition of the stone tells doctors what kind of diet and medicine will stop another one forming. Roughly half of people who pass one stone get another within 10 years without prevention.',
        alternatives: [
          { when: 'You do not have gauze', instead: 'Use a clean coffee filter or fine kitchen strainer. Anything that traps grit while letting urine through.' },
          { when: 'They lose the stone', instead: 'Skip — not critical. Note in the operator log.' },
        ],
        citationIds: ['mca_renal'],
      },
      {
        id: 'k6',
        action: 'Re-check them at 1, 2, and 4 hours',
        detail:
          'Set three alarms on your phone. Each re-check: (1) ask if pain is better/same/worse on a 0-10 scale, (2) feel their forehead and use the IR thermometer, (3) ask when they last peed and roughly how much. At the 4-hour check, repeat the ultrasound on the same kidney to see if swelling has changed.',
        professionalNotes:
          'Reassess pain, fever, urine output, and POCUS findings. Escalate if temperature trends up, urine output drops below 0.5 mL/kg/h, or pain is refractory.',
        why:
          'Catching deterioration early is what makes onboard care safe. The three things that flip this from onboard to evacuation are: fever, no peeing, or pain that does not come down.',
        alternatives: [
          { when: 'You are working alone and cannot stay with them', instead: 'Have them shout for you if pain returns above 5/10 or they feel like they will vomit. Re-check every 30 minutes instead.' },
        ],
        citationIds: ['pocus_renal'],
      },
    ],
    evacuateIf: [
      'Their temperature goes above 38.5°C / 101.3°F',
      'Pain is still uncontrolled after the second injection',
      'They cannot pee for more than 4 hours',
      'Ultrasound shows a clear blockage (severe swelling)',
      'Worsening blood in urine with them looking pale or faint',
    ],
    manageOnboardIf: ['No kidney swelling on ultrasound', 'No fever and vital signs are steady', 'Pain can be controlled'],
    citationIds: ['bnf_renal_colic', 'bnf_ketorolac', 'mca_renal', 'pocus_renal', 'suspend_trial', 'nasa_cmoda'],
    reasoning: 'Sudden cramping one-sided back pain with blood in urine and pain radiating to the groin is the classic kidney-stone picture.',
  },

  // === 2. HEART ATTACK ===
  {
    id: 'heart_attack',
    condition: 'Heart attack (suspected)',
    shortHeadline: 'Possible heart attack',
    layExplanation: 'Blood flow to the heart muscle may be blocked. This is time-critical — every minute matters.',
    category: 'cardiovascular',
    likelihoodPercent: 9,
    timeAction: TA.HELI_NOW,
    regions: ['chest_center', 'chest_upper_left', 'shoulder_left', 'upper_arm_left', 'mouth_jaw', 'neck_front'],
    triggerSymptoms: ['crushing or heavy chest pain', 'pain spreading to the left arm, jaw, or back', 'sweating heavily', 'shortness of breath', 'feeling sick or faint'],
    yesNoQuestions: [
      'Is the pain in the centre of the chest, like pressure or weight?',
      'Does the pain spread to the left arm, jaw, neck or back?',
      'Are they sweating heavily, even though they are still?',
      'Are they short of breath?',
      'Do they look pale or grey?',
    ],
    tieBreakers: [
      'Does the pain change with breathing? (Yes = less likely heart, more likely chest wall)',
      'Did it start with exercise or stress? (Yes = more likely heart)',
    ],
    diagnosticSteps: ['Connect the LIFEPAK 15 and run a 12-lead ECG', 'Take blood pressure on both arms', 'Check blood sugar with the glucometer'],
    treatment: [
      {
        id: 'h1',
        action: 'Have them chew and swallow one aspirin',
        detail:
          'Get a 300 mg Aspirin dispersible tablet from Drawer 2 (white label). Tell them to chew it for 30 seconds, then swallow with a sip of water. Chewing is critical — it gets the medicine into the blood in 5 minutes instead of 30.',
        professionalNotes:
          'Aspirin 300 mg PO chewed — irreversible COX-1 inhibition reduces platelet aggregation. Skip only if true allergy or active GI bleed.',
        why:
          'Aspirin stops new blood clots from forming on top of the one blocking the heart artery. It is the single most life-saving medicine you can give in the first hour of a heart attack.',
        diagram: 'po_oral',
        drug: 'Aspirin dispersible',
        dose: '300 mg',
        route: 'chewed and swallowed',
        frequency: 'single dose',
        alternatives: [
          { when: 'They are allergic to aspirin (true allergy, not just stomach upset)', instead: 'Skip aspirin. Give Clopidogrel 300 mg by mouth from Drawer 2 instead.' },
          { when: 'They are unconscious or cannot swallow', instead: 'Skip — do not put anything in the mouth of someone unconscious. Focus on oxygen and getting evacuation on the way.' },
        ],
        citationIds: ['acep_acs'],
      },
      {
        id: 'h2',
        action: 'Spray GTN once under their tongue',
        detail:
          'Get the small "GTN spray" from Drawer 2 (white label). Have them lift their tongue. Press the spray button once so a single puff goes onto the underside of the tongue. Wait 5 minutes. If pain is still severe and they do not feel faint, you can repeat — up to 3 sprays total, 5 minutes apart.',
        professionalNotes:
          'GTN 400 mcg SL. Do not give if SBP < 100, recent sildenafil/tadalafil, or suspicion of right ventricular infarct.',
        why:
          'GTN widens the heart arteries and reduces the work the heart has to do. It often eases the chest pain within minutes. The fact that GTN helps is itself a clinical clue.',
        diagram: 'sl_under_tongue',
        drug: 'GTN spray',
        dose: '400 mcg',
        route: 'under the tongue',
        frequency: 'every 5 minutes up to 3 doses',
        alternatives: [
          { when: 'They look pale, sweaty, faint, or you can measure BP and the top number is below 100', instead: 'Skip GTN — it will drop blood pressure further. Go straight to oxygen and aspirin only.' },
          { when: 'They took an erectile-dysfunction pill in the last 24 hours', instead: 'Do NOT give GTN — combination can cause dangerous blood pressure drop. Skip this step.' },
        ],
        citationIds: ['acep_acs'],
      },
      {
        id: 'h3',
        action: 'Give morphine if pain is still severe',
        detail:
          'Get the captain to unlock the controlled-drugs cabinet. Take one Morphine 10 mg/1 mL ampoule. Draw up 5 mg (0.5 mL) into a 5 mL syringe and dilute with 4.5 mL of saline (so 1 mg per mL). Push 1 mL (1 mg) into a vein slowly. Wait 2 minutes. Push another 1 mL. Keep going up to 5 mg total, stopping if they look drowsy or breathing slows.',
        professionalNotes:
          'Morphine 5 mg IV titrated in 1 mg increments. Watch RR; reverse with naloxone 400 mcg IM if RR < 8.',
        why:
          'Severe pain releases stress hormones that make the heart work harder — exactly the opposite of what you want during a heart attack. Calming the pain literally rests the heart muscle.',
        diagram: 'iv_acf',
        drug: 'Morphine injection',
        dose: '5 mg (titrate 1 mg at a time)',
        route: 'into a vein',
        frequency: 'titrate over 5-10 minutes, can repeat once if pain still severe',
        alternatives: [
          { when: 'You cannot get an IV in', instead: 'Give Morphine 10 mg into the outside of the thigh muscle. Slower onset (15 min) but works.' },
          { when: 'They are already drowsy or breathing slowly', instead: 'Skip morphine. Their pain control is less important than keeping them breathing.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: ['acep_acs'],
      },
      {
        id: 'h4',
        action: 'Oxygen by mask if they look short of breath',
        detail:
          'Open the green D-size oxygen cylinder behind the sickbay door. Connect a non-rebreather mask. Set the flow to 6-10 L/min so the bag stays inflated. Put the mask on their face. Only do this if their LIFEPAK SpO2 reading is below 94%, or if they look obviously short of breath.',
        professionalNotes:
          'Titrate O2 to SpO2 94-98%. Hyperoxia in normoxic MI patients may be harmful — do not give routinely.',
        why:
          'A struggling heart needs oxygen. But too much oxygen when their levels are already normal can actually be harmful, so the rule is: give it only if the SpO2 reading is below 94%.',
        diagram: 'neb_mask',
        drug: 'Oxygen cylinder',
        dose: '6-10 L/min',
        route: 'face mask',
        frequency: 'continuous until evacuation',
        alternatives: [
          { when: 'No oxygen available', instead: 'Open windows and doors for fresh air. Loosen tight clothing around the chest and neck.' },
          { when: 'They feel claustrophobic with the mask', instead: 'Use the simple nasal cannula (the tube under the nose) at 2-4 L/min instead.' },
        ],
        citationIds: ['acep_acs'],
      },
      {
        id: 'h5',
        action: 'Sit them up and keep them still and calm',
        detail:
          'Prop them up at about 45 degrees — propped against pillows or a folded mattress. Loosen any tight clothing. Do not let them walk. Talk to them calmly — fear releases stress hormones that make the heart work harder. Get someone to wait with them.',
        why:
          'Sitting up makes breathing easier and reduces blood return to a heart that is already struggling. Walking causes a sudden demand on the heart muscle that can trigger a fatal rhythm.',
        diagram: 'recovery_position',
        alternatives: [
          { when: 'They want to lie flat', instead: 'Let them — comfort comes first. But raise the head of the bed if you can.' },
          { when: 'They are unconscious but breathing', instead: 'Put them in the recovery position (on their side, head tilted back). Stay with them.' },
        ],
        citationIds: ['acep_acs'],
      },
    ],
    evacuateIf: ['Always — every suspected heart attack must be evacuated immediately'],
    manageOnboardIf: ['Never — even uncertain cases need a doctor'],
    citationIds: ['acep_acs'],
    reasoning: 'A heart attack needs hospital-level care that does not exist onboard.',
  },

  // === 3. BROKEN BONE ===
  {
    id: 'broken_bone',
    condition: 'Broken bone or dislocated joint',
    shortHeadline: 'Likely a broken bone',
    layExplanation: 'A bone or joint has been forced out of its normal shape.',
    category: 'trauma',
    likelihoodPercent: 20,
    timeAction: TA.SHORE_24H,
    regions: ['shoulder_right', 'shoulder_left', 'upper_arm_right', 'upper_arm_left', 'elbow_right', 'elbow_left', 'forearm_right', 'forearm_left', 'wrist_right', 'wrist_left', 'hand_right', 'hand_left', 'thigh_right', 'thigh_left', 'knee_right', 'knee_left', 'shin_right', 'shin_left', 'ankle_right', 'ankle_left', 'foot_right', 'foot_left'],
    triggerSymptoms: ['visible deformity', 'severe pain after a fall', 'rapid swelling', 'cannot move the limb', 'numbness below the injury'],
    yesNoQuestions: [
      'Did this happen after a fall, impact, or twist?',
      'Does the limb look bent or out of shape?',
      'Is it swelling fast?',
      'Can they move it normally?',
      'Is the hand or foot beyond the injury pale, cold, or numb?',
    ],
    tieBreakers: [
      'Is there a piece of bone visible through the skin? (Yes = upgrade to HELI NOW)',
      'Is the hand or foot beyond the injury pale or cold? (Yes = upgrade to HELI within 2h)',
    ],
    diagnosticSteps: ['Check skin color and warmth past the injury', 'Check pulse below the injury', 'Use ultrasound to look for a break', 'Photograph for the on-shore physician'],
    treatment: [
      {
        id: 'b1',
        action: 'Give a strong pain-relief shot for severe pain',
        detail:
          'Ask the captain to unlock the controlled-drugs cabinet. Take one Ketamine 50 mg/1 mL ampoule. Estimate the person\'s weight in kg, multiply by 0.5 — that is the milligrams you need (so 80 kg person = 40 mg = 0.8 mL). Draw it up. Inject into the outside of the thigh muscle, 90° angle, full needle depth. They may feel floaty for 15-20 minutes — that is normal.',
        professionalNotes:
          'Ketamine 0.5 mg/kg IM. Dissociative analgesia preserves respiratory drive. Maintain quiet, low-stimulation environment to minimize emergence phenomena.',
        why:
          'Ketamine is the safest powerful painkiller for use without monitoring. Unlike opioids, it does not slow breathing. Perfect for severe limb pain when you cannot get an IV in.',
        diagram: 'im_thigh',
        drug: 'Ketamine injection',
        dose: '0.5 mg per kg of body weight',
        route: 'into the outside of the thigh muscle',
        frequency: 'single dose, can repeat once after 30 minutes',
        alternatives: [
          { when: 'No ketamine access yet (captain unavailable)', instead: 'Give Morphine 10 mg into the same thigh muscle while you wait for the cabinet key.' },
          { when: 'They have a known psychiatric history of psychosis', instead: 'Skip ketamine — can trigger hallucinations. Use Morphine 10 mg into the thigh instead.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: ['tccc'],
      },
      {
        id: 'b2',
        action: 'Add paracetamol tablets for ongoing pain',
        detail:
          'Get two Paracetamol 500 mg tablets from Drawer 2 (white label). Have them swallow with water. Every 6 hours — set alarms. Do not exceed 8 tablets (4 g) in 24 hours.',
        why:
          'Paracetamol stacks safely on top of the strong injection — they work through different pathways. Better pain control with less of any one drug.',
        diagram: 'po_oral',
        drug: 'Paracetamol tablets',
        dose: '1 g (two 500 mg tablets)',
        route: 'by mouth',
        frequency: 'every 6 hours',
        alternatives: [
          { when: 'They are vomiting and cannot keep tablets down', instead: 'Skip oral paracetamol. The ketamine shot is doing the work.' },
          STD_ALT_PERSON_AWAKE_REFUSES,
        ],
        citationIds: [],
      },
      {
        id: 'b3',
        action: 'Splint the limb so it cannot move',
        detail:
          'Open the splint set in the sickbay closet (left side). Pick a splint about the same length as the limb. Pad the inside with rolled-up cloth or gauze. Place the splint along the limb so the broken area is in the middle. Tie firmly with the included straps — one above the break, one below, never directly on the break. Leave fingers or toes visible so you can keep checking color.',
        professionalNotes:
          'Immobilise joint above and joint below the fracture. Reassess neurovascular status every 30 minutes — pallor, cool skin, capillary refill > 3s, or absent distal pulse mandates evacuation upgrade.',
        why:
          'Movement of a broken bone causes severe pain, more tissue damage, and continued bleeding inside the limb. A good splint reduces all three.',
        diagram: 'splint_arm',
        alternatives: [
          { when: 'No splint set available', instead: 'Improvise: use a rolled-up newspaper, a wooden board, or even the other arm strapped to the broken one. The principle is the same — no movement.' },
          { when: 'It is the hip or pelvis (cannot splint)', instead: 'Lie them flat, place rolled blankets on each side of the hips and tie around. Do not move them — upgrade to HELI NOW.' },
        ],
        citationIds: ['tccc'],
      },
      {
        id: 'b4',
        action: 'Re-check the limb every 30 minutes',
        detail:
          'Look at the hand or foot below the injury. Press a fingernail or toenail for 2 seconds, release — colour should come back within 2 seconds (pink, warm). Ask if they can feel you touching the skin. Check the pulse if you can find it. Pink + warm + feels touch = good. Pale, cold, numb = bad.',
        professionalNotes:
          'Document the 6 Ps (pain, pallor, pulselessness, paraesthesia, paralysis, poikilothermia). Any change = compartment syndrome concern, upgrade time tier.',
        why:
          'If circulation to the limb gets cut off (by swelling, by a bone fragment, by the splint being too tight) the tissue starts to die in 4-6 hours. Catching this early is the difference between a normal recovery and amputation.',
        alternatives: [
          { when: 'You cannot tell if circulation is OK', instead: 'Loosen the splint straps until you can fit two fingers underneath. Re-check in 10 minutes. If still uncertain, treat as red flag — evacuate.' },
        ],
        citationIds: [],
      },
    ],
    evacuateIf: ['Bone visible through skin', 'Hand or foot below the injury pale, cold, or numb', 'Hip or pelvis fracture suspected', 'Severe swelling worsening'],
    manageOnboardIf: ['Closed simple fracture with normal color and pulse', 'Pain controllable', 'Patient can rest'],
    citationIds: ['tccc'],
    reasoning: 'Simple closed fractures can be splinted and managed onboard until the next port.',
  },

  // === 4. SEVERE BLEED ===
  {
    id: 'severe_bleed',
    condition: 'Severe bleeding from a deep cut',
    shortHeadline: 'Stop the bleeding now',
    layExplanation: 'A wound is losing significant blood. You need to stop the bleeding fast.',
    category: 'trauma',
    likelihoodPercent: 18,
    timeAction: TA.HELI_2H,
    regions: ['shoulder_right', 'shoulder_left', 'upper_arm_right', 'upper_arm_left', 'forearm_right', 'forearm_left', 'thigh_right', 'thigh_left', 'shin_right', 'shin_left', 'skin_general'],
    triggerSymptoms: ['visible heavy bleeding', 'blood pooling', 'pale clammy skin', 'fast pulse', 'feeling faint'],
    yesNoQuestions: [
      'Is there visible heavy bleeding right now?',
      'Is blood soaking through cloth or pooling?',
      'Do they look pale, sweaty, or weak?',
      'Are they feeling faint or dizzy?',
      'Is the wound deep enough that you can see muscle, tendon, or bone?',
    ],
    tieBreakers: [
      'Did pressure for 10 minutes stop it? (Yes = onboard; No = HELI NOW)',
      'Is the bleeding from the head, neck, chest, or belly? (Yes = HELI NOW)',
    ],
    diagnosticSteps: ['Find exactly where the blood is coming from', 'Estimate how much they have lost', 'Check pulse and skin colour'],
    treatment: [
      {
        id: 'sl1',
        action: 'Press hard, directly on the bleeding point',
        detail:
          'Open a stack of gauze (from the trauma kit, red bag, or any drawer). Press the whole stack directly on the bleeding spot — do not dab, press and hold. Use both hands and your bodyweight if you have to. By the clock: hold for 10 full minutes without lifting. If gauze soaks through, do NOT remove it — add more on top and keep pressing.',
        professionalNotes:
          'Direct pressure controls 90% of external haemorrhage. Lifting to inspect disrupts the forming clot.',
        why:
          'Pressure stops most bleeding. Lifting the cloth to check disrupts the clot that has started to form and the bleed starts again.',
        diagram: 'direct_pressure',
        alternatives: [
          { when: 'You have to leave to get help', instead: 'Pack the wound tightly with gauze and wrap firmly with an elastic bandage. Continue pressure when you get back.' },
          { when: 'No gauze available', instead: 'Use any clean cloth — a clean T-shirt, a tea towel. Cleanliness matters less than pressure right now.' },
        ],
        citationIds: ['tccc'],
      },
      {
        id: 'sl2',
        action: 'Tourniquet on a limb if pressure does not work',
        detail:
          'Take the orange CAT tourniquet from the trauma kit (red bag). Place it on the limb between the wound and the heart, at least 5 cm above the wound. Pull the strap tight, then twist the windlass (the white stick) until bleeding stops. Lock the windlass in the clip. Write the time on the white label with a marker.',
        professionalNotes:
          'CAT or SOFTT-W. Tighten until distal pulse is absent. Time-stamp clearly. Convert to wound packing if evacuation > 2 hours and tactically appropriate.',
        why:
          'If a major artery in a limb is sliced open, pressure alone cannot stop it. A tourniquet cuts off all blood to the limb until surgery. The limb can survive 4-6 hours without blood — far better than dying from blood loss.',
        diagram: 'tourniquet',
        alternatives: [
          { when: 'No commercial tourniquet', instead: 'Improvise: take a wide belt (NOT a thin rope — it cuts the skin). Wrap above the wound. Place a strong stick across the knot and twist to tighten. Tie off when bleeding stops.' },
          { when: 'The bleed is on the chest, belly, neck, or head', instead: 'Do NOT use a tourniquet — apply pressure with gauze and pack the wound. Upgrade to HELI NOW.' },
        ],
        citationIds: ['tccc'],
      },
      {
        id: 'sl3',
        action: 'Give the bleeding-stopper medicine into a vein',
        detail:
          'Get a Tranexamic Acid 500 mg/5 mL ampoule from the trauma kit. Draw 2 ampoules (1 g total, 10 mL) into a 20 mL syringe. Add 10 mL of saline. Push slowly into a vein over 10 minutes. After that, mix another 1 g into a 500 mL saline bag and run it through the IV over 8 hours.',
        professionalNotes:
          'TXA 1 g IV bolus over 10 min, then 1 g infusion over 8 h. Most effective within 3 hours of injury (CRASH-2). Reduces all-cause mortality ~10% in significant haemorrhage.',
        why:
          'Tranexamic acid stops clots from breaking down. Given within the first 3 hours of major bleeding, it reduces the chance of dying by about 10%. After 3 hours it may actually be harmful — so timing matters.',
        diagram: 'iv_acf',
        drug: 'Tranexamic acid injection',
        dose: '1 g',
        route: 'into a vein',
        frequency: 'first dose over 10 minutes, then second 1 g over 8 hours',
        alternatives: [
          { when: 'You cannot get IV access', instead: 'Skip TXA. Focus on direct pressure / tourniquet. TXA into the muscle works but takes too long for this emergency.' },
          { when: 'Wound is more than 3 hours old', instead: 'Skip TXA — no benefit after 3 hours and possible harm. Continue with pressure only.' },
        ],
        citationIds: ['tccc'],
      },
      {
        id: 'sl4',
        action: 'Rinse the wound with saline once bleeding is controlled',
        detail:
          'Once bleeding has stopped (no fresh blood on the gauze for 5 minutes), open a 1 L bag of saline. Pour it over the wound from about 10 cm above so it flushes out dirt and clots. Do not scrub. Catch the runoff in a basin if you can.',
        why:
          'A clean wound heals faster and is far less likely to get infected. Scrubbing damages new tissue that is trying to form.',
        alternatives: [
          { when: 'No saline available', instead: 'Use clean drinking water. Saline is ideal but not essential at this stage.' },
        ],
        citationIds: [],
      },
      {
        id: 'sl5',
        action: 'Close the wound if clean, shallow, and less than 8 hours old',
        detail:
          'Get the suture kit from Drawer 4 (blue label). Inject lidocaine around the wound edges (small amounts, just enough to numb). Bring the wound edges together with toothed forceps. Pass the curved needle from one side to the other, through both edges. Tie three knots on the OUTSIDE of the skin. Space stitches about 5 mm apart. Cover with a dressing.',
        professionalNotes:
          '3-0 prolene or nylon for skin closure. Approximate, do not strangulate. Consider delayed primary closure if contamination is significant.',
        why:
          'Closing the skin fast (within 8 hours) reduces scarring and prevents the wound from drying out. After 8 hours the chance of infection rises sharply — better to leave open.',
        alternatives: [
          { when: 'Wound is dirty (oil, dirt, road debris)', instead: 'Leave open. Pack with gauze. Change pack daily. Refer for delayed closure at port.' },
          { when: 'Wound is over 8 hours old', instead: 'Leave open and dress. Closing now traps bacteria and causes infection.' },
          { when: 'You are not confident with sutures', instead: 'Use skin staples from the same drawer — easier to use. Or close with adhesive strips ("Steri-Strips") if the wound is shallow and not under tension.' },
        ],
        citationIds: [],
      },
      {
        id: 'sl6',
        action: 'Preventive antibiotic if the wound is dirty or older than 6h',
        detail:
          'Get Amoxicillin 500 mg capsules from Drawer 6 (green label). One capsule three times a day for 5 days. First dose now with water.',
        why:
          'Dirty or old wounds are nearly certain to get infected without antibiotics. Catching the bacteria early prevents an abscess or sepsis later.',
        diagram: 'po_oral',
        drug: 'Amoxicillin capsules',
        dose: '500 mg',
        route: 'by mouth',
        frequency: 'three times a day for 5 days',
        alternatives: [
          { when: 'They are allergic to penicillin', instead: 'Use Doxycycline 100 mg twice a day for 5 days instead, from the same drawer.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: [],
      },
    ],
    evacuateIf: ['Cannot stop bleeding within 10 minutes', 'Deep wound exposing tendon/bone/muscle', 'Pale or confused', 'Any chest, neck, or belly wound'],
    manageOnboardIf: ['Bleeding controlled within minutes', 'Wound is shallow and clean', 'Pink and alert'],
    citationIds: ['tccc'],
    reasoning: 'Pressure stops most bleeding. TXA within 3 hours saves lives.',
  },

  // === 5. SEVERE ALLERGY ===
  {
    id: 'severe_allergy',
    condition: 'Severe allergic reaction',
    shortHeadline: 'Severe allergy — give adrenaline',
    layExplanation: 'The body is overreacting to something. The airway can swell shut. This is a true emergency.',
    category: 'respiratory',
    likelihoodPercent: 8,
    timeAction: TA.HELI_NOW,
    regions: ['breathing', 'skin_general', 'mouth_jaw', 'neck_front', 'general'],
    triggerSymptoms: ['sudden widespread rash', 'lips/tongue/face swelling', 'wheezing', 'throat closing up', 'becoming pale or limp'],
    yesNoQuestions: [
      'Did this start within minutes after eating, a sting, or a new medicine?',
      'Are their lips, tongue, or face swelling?',
      'Is there a rash, hives, or itching all over?',
      'Are they wheezing or struggling to breathe?',
      'Do they feel like their throat is closing up?',
    ],
    tieBreakers: ['Are they having ONLY a rash with normal breathing? (Yes = onboard; otherwise HELI NOW)'],
    diagnosticSteps: ['Listen for wheezing or stridor', 'Look in mouth for swelling', 'Check oxygen on LIFEPAK'],
    treatment: [
      {
        id: 'an1',
        action: 'Inject adrenaline into the outside of the thigh — FIRST AND MOST IMPORTANT',
        detail:
          'Get the red allergy box from the top of the cabinet. If there is an EpiPen-style auto-injector with orange tip: pull off the blue cap, jab the orange end firmly into the OUTSIDE of the upper thigh (right through clothing is fine), hold for 3 seconds, remove. If only ampoules: snap open one Adrenaline 1:1000 ampoule, draw all 1 mL into a 23-gauge needle, inject 0.5 mL (= 0.5 mg) into the outside of the thigh at 90°, all the way in. Repeat after 5 minutes if still unwell.',
        professionalNotes:
          'Adrenaline 0.5 mg (0.5 mL of 1:1000) IM anterolateral thigh. Onset 5-10 min. Repeat q5min PRN. Beware accidental IV — can cause hypertensive crisis and dysrhythmias.',
        why:
          'Adrenaline reverses the entire reaction: it shrinks the swelling, opens the airways, and props up the blood pressure. Nothing else in your kit will save this person. Better to give it and not need it than the other way around.',
        diagram: 'im_thigh',
        drug: 'Adrenaline 1:1000',
        dose: '0.5 mg (0.5 mL)',
        route: 'into the outside of the thigh muscle',
        frequency: 'now, repeat every 5 minutes if still unwell',
        alternatives: [
          { when: 'No adrenaline in stock', instead: 'No substitute exists — this is a life-or-death emergency. Start CPR if they stop breathing. Get the captain to issue a distress call.' },
          { when: 'They have an EpiPen in their kit (not yours)', instead: 'Use their own EpiPen first — saves time. Then move to the onboard supply for repeat doses.' },
        ],
        citationIds: ['who_anaphylaxis'],
      },
      {
        id: 'an2',
        action: 'Give a steroid injection',
        detail:
          'Open two Hydrocortisone 100 mg vials from the red allergy box. Add 2 mL saline to each to dissolve the powder. Draw both up (total 200 mg in 4 mL) into a syringe. Push slowly into a vein over 1 minute, or into the same thigh muscle.',
        professionalNotes:
          'Hydrocortisone 200 mg IV or IM. Onset 4-6 hours — does not replace adrenaline. Reduces biphasic reaction risk.',
        why:
          'Steroids reduce the late-phase part of the reaction that can come back hours after the initial event. They do not work fast enough to be life-saving on their own — adrenaline does that.',
        diagram: 'iv_acf',
        drug: 'Hydrocortisone injection',
        dose: '200 mg (two vials)',
        route: 'into a vein',
        frequency: 'single dose',
        alternatives: [
          { when: 'You cannot get an IV in', instead: 'Inject the same dose into the outside of the thigh muscle. Slower onset but works.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: ['who_anaphylaxis'],
      },
      {
        id: 'an3',
        action: 'Give a salbutamol breathing treatment if they are wheezing',
        detail:
          'Take a Salbutamol nebule (5 mg / 2.5 mL) from Drawer 5 (blue label). Crack it open and pour into the nebuliser chamber. Connect to the oxygen cylinder at 6-8 L/min. Place the mask over their nose and mouth. Have them breathe normally for 10-15 minutes until the chamber is empty. Repeat every 20 minutes as needed.',
        professionalNotes:
          'Salbutamol 5 mg neb in O2. Bronchodilator — does not address upper airway oedema (use adrenaline for that).',
        why:
          'Opens the small airways in the lungs so they can breathe better. Works on the lungs only — not the swollen throat (that is what adrenaline is for).',
        diagram: 'neb_mask',
        drug: 'Salbutamol nebule',
        dose: '5 mg',
        route: 'nebuliser mask',
        frequency: 'every 20 minutes as needed',
        alternatives: [
          { when: 'No nebuliser machine', instead: 'Use the salbutamol inhaler (if they have one) with the spacer — 10 puffs back to back.' },
          { when: 'No salbutamol at all', instead: 'Skip this step. Adrenaline will help the lung wheeze too.' },
        ],
        citationIds: ['who_anaphylaxis'],
      },
      {
        id: 'an4',
        action: 'Run a fast IV fluid bolus if they look faint or pale',
        detail:
          'Hang a 1 L saline bag. Use the largest cannula you can fit. Open the roller clamp fully — you want 1 L in over 15 minutes. Look for veins in the bend of the elbow.',
        professionalNotes:
          'Crystalloid 1 L wide open. Anaphylactic shock = distributive — vasopressor (adrenaline) is primary, fluid supports filling.',
        why:
          'The allergic reaction makes blood vessels leak fluid into the tissues — that is why their face swells. Replacing that fluid quickly keeps blood pressure up.',
        diagram: 'iv_acf',
        drug: 'Saline 0.9% IV bag',
        dose: '1 L',
        route: 'IV drip into a vein',
        frequency: 'over 15 minutes',
        alternatives: [
          { when: 'You cannot get IV access', instead: 'Lay them flat with legs propped up on a chair — uses gravity to keep blood reaching the heart.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: ['who_anaphylaxis'],
      },
      {
        id: 'an5',
        action: 'Lay them flat with feet raised, give oxygen',
        detail:
          'Lie them flat on their back. Prop their legs up on a chair or pile of cushions (~30 cm higher than the heart). Put oxygen mask on, 10-15 L/min. Stay with them. If they vomit, roll them on their side immediately.',
        professionalNotes:
          'Supine with legs elevated — improves venous return. Do NOT sit them up if hypotensive — can cause cardiac arrest.',
        why:
          'Helps blood get back to the heart and brain while the medicine works. Sitting them up when their blood pressure is crashing can trigger a fatal cardiac arrest.',
        diagram: 'recovery_position',
        alternatives: [
          { when: 'They cannot breathe lying flat', instead: 'Prop them up at 45° — comfort + breathing trump position. Keep legs elevated if you can.' },
          { when: 'They are pregnant', instead: 'Lie them on their LEFT side (with pillows under the right hip) — prevents the womb from pressing on the big vein.' },
        ],
        citationIds: ['who_anaphylaxis'],
      },
    ],
    evacuateIf: ['Every confirmed severe allergic reaction — biphasic relapse risk 4-72 hours'],
    manageOnboardIf: ['Mild rash with normal breathing only — antihistamine and watch'],
    citationIds: ['who_anaphylaxis'],
    reasoning: 'Only adrenaline reverses a severe allergic reaction.',
  },

  // === 6. SEVERE INFECTION ===
  {
    id: 'severe_infection',
    condition: 'Severe infection (sepsis)',
    shortHeadline: 'Body-wide infection',
    layExplanation: 'An infection has spread through the body. Without fast treatment it can shut down the organs.',
    category: 'infection',
    likelihoodPercent: 10,
    timeAction: TA.HELI_2H,
    regions: ['general', 'breathing', 'belly_periumbilical', 'skin_general'],
    triggerSymptoms: ['high fever and shivering', 'fast pulse', 'fast breathing', 'becoming confused', 'mottled skin'],
    yesNoQuestions: [
      'Do they feel hot to the touch, or are they shivering uncontrollably?',
      'Are they breathing faster than usual?',
      'Are they becoming confused, drowsy, or hard to wake?',
      'Does their skin look pale, mottled, or blotchy?',
      'Have they been unwell with infection symptoms for more than 24 hours?',
    ],
    tieBreakers: ['Is there a clear single infection source? (Yes = onboard antibiotics first, monitor; No or worsening = HELI within 2h)'],
    diagnosticSteps: ['Check temperature', 'Count breathing rate', 'Feel pulse', 'Find the source: skin / urine / cough / belly'],
    treatment: [
      {
        id: 'sp1',
        action: 'Run a fast IV fluid bag',
        detail:
          "Hang Hartmann's 1 L. Insert a large cannula (green/grey). Open the roller clamp fully so the whole bag goes in within 30 minutes to 1 hour. Watch the breathing — if they get more short of breath, slow it down.",
        professionalNotes:
          '30 mL/kg crystalloid in first hour (Surviving Sepsis bundle). Watch for fluid overload in cardiac/renal patients.',
        why:
          'Sepsis drops the blood pressure by making blood vessels leak. Fast IV fluids buy time for the antibiotics to start working.',
        diagram: 'iv_acf',
        drug: "Hartmann's solution IV bag",
        dose: '1 L',
        route: 'IV drip into a vein',
        frequency: 'over 1 hour, then reassess and repeat if still unwell',
        alternatives: [
          { when: 'No IV access yet', instead: 'Get the antibiotic into the muscle first while you keep trying for the IV. Fluids second.' },
          { when: 'They have known heart failure', instead: 'Give only 500 mL fast, then re-check breathing. Slow down if short of breath.' },
        ],
        citationIds: [],
      },
      {
        id: 'sp2',
        action: 'Give a strong antibiotic injection now',
        detail:
          'Get Ceftriaxone 1 g vials from Drawer 6 (green label). Take two vials. Mix each with 10 mL saline to dissolve the powder. Draw both into a 20 mL syringe (total 2 g in 20 mL). Push slowly into a vein over 5 minutes.',
        professionalNotes:
          'Ceftriaxone 2 g IV — broad coverage including most gram-negatives. Adjust if known MRSA risk (add vancomycin per protocol).',
        why:
          'Every hour without antibiotics in sepsis increases the chance of death by about 8%. Speed matters more than the perfect choice — get this in within the first hour.',
        diagram: 'iv_acf',
        drug: 'Ceftriaxone injection',
        dose: '2 g (two vials)',
        route: 'into a vein',
        frequency: 'once a day',
        alternatives: [
          { when: 'No IV access', instead: 'Inject 1 g into the outside of the thigh muscle (2 separate sites of 1 g each — large volume).' },
          { when: 'Severe penicillin allergy', instead: 'Use Ciprofloxacin 500 mg by mouth twice a day from the same drawer — covers gram-negatives.' },
        ],
        citationIds: [],
      },
      {
        id: 'sp3',
        action: 'Add a second antibiotic if you suspect a belly source',
        detail:
          'Get Metronidazole 400 mg tablets from Drawer 6. One tablet three times a day. First dose now with water. If they cannot swallow, you can dissolve a tablet in 30 mL water and give through a syringe slowly.',
        why:
          'Ceftriaxone misses anaerobic gut bacteria. If the infection might be from the belly (severe belly pain, recent surgery, diarrhea), metronidazole covers what ceftriaxone does not.',
        diagram: 'po_oral',
        drug: 'Metronidazole tablets',
        dose: '400 mg',
        route: 'by mouth or crushed and through NG tube',
        frequency: 'three times a day',
        alternatives: [
          { when: 'No belly source suspected', instead: 'Skip — only needed for gut/abscess sources.' },
          { when: 'They cannot swallow and you have no NG tube', instead: 'Hold metronidazole until they can swallow. Continue with ceftriaxone alone.' },
        ],
        citationIds: [],
      },
      {
        id: 'sp4',
        action: 'Bring the fever down',
        detail:
          'Give Paracetamol 1 g (two 500 mg tablets) by mouth, or if they cannot swallow, use a paracetamol IV bag if available. Repeat every 6 hours. Cool wet towels on forehead and groin also help.',
        why:
          'High fever makes the heart and brain work harder. Bringing it down improves how they feel and reduces the metabolic load.',
        diagram: 'po_oral',
        drug: 'Paracetamol tablets',
        dose: '1 g',
        route: 'by mouth',
        frequency: 'every 6 hours',
        alternatives: [
          { when: 'Already vomiting', instead: 'Use a paracetamol suppository (rectal) if stocked. Cool towels on the forehead help while you wait.' },
        ],
        citationIds: [],
      },
      {
        id: 'sp5',
        action: 'Give oxygen if SpO2 below 94%',
        detail:
          'Use the LIFEPAK 15 SpO2 finger probe. If reading is below 94%, put a non-rebreather mask on at 10-15 L/min. Keep the bag inflated.',
        why:
          'Body tissues burning through oxygen faster during severe infection. Extra oxygen supports the heart and brain.',
        diagram: 'neb_mask',
        alternatives: [
          { when: 'No oxygen cylinder', instead: 'Open windows, loosen clothing. Sit them up. Watch breathing — if it gets worse, upgrade to HELI NOW.' },
        ],
        citationIds: [],
      },
    ],
    evacuateIf: ['Any suspected severe infection', 'Confusion or low blood pressure', 'Fever does not come down after 4 hours'],
    manageOnboardIf: ['Localised infection only — oral antibiotic and watch'],
    citationIds: [],
    reasoning: 'Antibiotics within the first hour save lives in sepsis.',
  },

  // === 7. BELLY EMERGENCY ===
  {
    id: 'belly_emergency',
    condition: 'Severe belly emergency (possible appendicitis)',
    shortHeadline: 'Surgical belly problem',
    layExplanation: 'Sudden severe belly pain that may be appendicitis or another condition needing surgery.',
    category: 'gi',
    likelihoodPercent: 13,
    timeAction: TA.HELI_2H,
    regions: ['belly_rlq', 'belly_periumbilical', 'belly_ruq', 'belly_llq', 'belly_luq'],
    triggerSymptoms: ['pain starting near navel then moving to lower right', 'tense tender belly', 'fever', 'no appetite', 'worse when coughing or jumping'],
    yesNoQuestions: [
      'Did the pain start near the belly button and then move to the lower right?',
      'Is the belly tense and tender to touch?',
      'Have they had no appetite for the last few hours?',
      'Does the pain get much worse when they cough or jump?',
      'Do they have a fever or feel hot?',
    ],
    tieBreakers: [
      'Is the whole belly rigid like a board? (Yes = upgrade to HELI NOW — perforation suspected)',
      'Did they get better after passing gas or pooping? (Yes = likely not appendicitis)',
    ],
    diagnosticSteps: ['Press lower-right belly gently, release quickly — watch their face', 'Use ultrasound on the painful spot', 'Check temperature', 'Check urine'],
    treatment: [
      {
        id: 'aa1',
        action: 'Nothing by mouth — no food, no water',
        detail: 'Tell them clearly: nothing to eat or drink. If they are very thirsty, you can wet a piece of gauze and let them suck on it.',
        why: 'If surgery is needed, an empty stomach is safer for anaesthesia — full stomachs can lead to fatal aspiration during anaesthesia induction.',
        alternatives: [{ when: 'They are in severe distress from thirst', instead: 'Allow them small ice chips only — minimal stomach contents.' }],
        citationIds: [],
      },
      {
        id: 'aa2',
        action: 'Start a slow IV fluid drip',
        detail:
          "Hang a Hartmann's 1 L bag. Use the smallest reasonable cannula. Run at maintenance rate — about 1 drop per 2 seconds — to keep them hydrated while they cannot drink.",
        why: 'They are not eating or drinking. Without IV fluids they will get dehydrated within hours, which makes the surgery riskier.',
        diagram: 'iv_acf',
        drug: "Hartmann's solution IV bag",
        dose: '1 L',
        route: 'IV drip into a vein',
        frequency: '125 mL per hour (slow drip)',
        alternatives: [{ when: 'Cannot get IV access', instead: 'Allow small sips of water every hour — better than nothing if surgery is hours away.' }],
        citationIds: [],
      },
      {
        id: 'aa3',
        action: 'Give pain relief',
        detail:
          'Get the captain to unlock the controlled-drugs cabinet. Take a Morphine 10 mg ampoule. Draw 5 mg (0.5 mL) into a syringe, dilute with 4.5 mL saline. Push 1 mL at a time into a vein, wait 2 minutes between each. Stop when pain is bearable or you have given the full 5 mg.',
        professionalNotes: 'Morphine 5 mg IV titrated. Does not mask peritoneal signs at this dose — old myth.',
        why: 'Severe belly pain is one of the worst kinds. Modern guidelines confirm that pain relief does NOT mask the diagnosis — surgeons can still examine after morphine.',
        diagram: 'iv_acf',
        drug: 'Morphine injection',
        dose: '5 mg (titrate 1 mg at a time)',
        route: 'into a vein',
        frequency: 'titrate over 5 minutes, repeat after 30 min if still severe',
        alternatives: [
          { when: 'No IV access', instead: 'Morphine 10 mg into the thigh muscle. Slower onset (15 min) but works.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: [],
      },
      {
        id: 'aa4',
        action: 'Give anti-sickness',
        detail: 'Ondansetron 4 mg into a vein slowly, from Drawer 3 (yellow label).',
        why: 'Pain causes vomiting. Vomiting on top of belly pain makes the pain worse and increases dehydration.',
        diagram: 'iv_acf',
        drug: 'Ondansetron injection',
        dose: '4 mg',
        route: 'into a vein',
        frequency: 'every 8 hours as needed',
        alternatives: [{ when: 'No IV', instead: 'Cyclizine 50 mg into the thigh muscle instead.' }],
        citationIds: [],
      },
      {
        id: 'aa5',
        action: 'Antibiotics if perforation suspected',
        detail:
          'If the belly is rigid (board-like) or they have a high fever: give Ceftriaxone 2 g (two vials) into the vein over 5 minutes, plus Metronidazole 500 mg by mouth (or 1 vial 500 mg slow IV if stocked).',
        why: 'Perforation spills gut bacteria into the belly cavity. Antibiotics buy time until surgery.',
        diagram: 'iv_acf',
        drug: 'Ceftriaxone + Metronidazole',
        dose: '2 g + 500 mg',
        route: 'into a vein / by mouth',
        frequency: 'ceftriaxone once a day, metronidazole three times a day',
        alternatives: [
          { when: 'No clear sign of perforation (soft belly, no fever)', instead: 'Skip antibiotics — not needed yet, and overuse breeds resistance.' },
          { when: 'No IV', instead: 'Ceftriaxone 1 g into each thigh muscle (2 sites) for 2 g total. Oral metronidazole as written.' },
        ],
        citationIds: [],
      },
    ],
    evacuateIf: ['All suspected appendicitis', 'Rigid belly', 'Blood pressure drops'],
    manageOnboardIf: ['Settles within 4 hours, no fever, soft belly only'],
    citationIds: [],
    reasoning: 'Appendicitis needs an operating room.',
  },

  // === 8. BIG BURN ===
  {
    id: 'big_burn',
    condition: 'Large burn',
    shortHeadline: 'Big burn — fluids critical',
    layExplanation: 'A burn covering more than a small area causes massive fluid loss and needs careful management.',
    category: 'trauma',
    likelihoodPercent: 10,
    timeAction: TA.HELI_2H,
    regions: ['skin_general', 'chest_center', 'upper_arm_right', 'upper_arm_left', 'forearm_right', 'forearm_left', 'thigh_right', 'thigh_left'],
    triggerSymptoms: ['visible burned skin', 'blistering', 'red painful area larger than palm', 'singed nose hair or coughing soot'],
    yesNoQuestions: [
      'Is the burned area larger than the palm of their hand?',
      'Is any part of the burn white, brown, or charred?',
      'Are there big blisters?',
      'Did they breathe in smoke?',
      'Is the burn on the face, hands, genitals, or a joint?',
    ],
    tieBreakers: ['Did they inhale smoke? (Yes = upgrade to HELI NOW — airway can swell shut)'],
    diagnosticSteps: ['Estimate %BSA (palm = 1%)', 'Look at depth', 'Check airway for soot or singed hair'],
    treatment: [
      {
        id: 'bn1',
        action: 'Run cool (not cold) water over the burn for 20 minutes',
        detail:
          'Use cool tap water, not ice cold. Run continuously over the burn for 20 full minutes by the clock. Only works if you start within 3 hours of the burn. Keep the rest of the person warm with a blanket — only the burn gets cool water.',
        why: 'Cooling within 3 hours reduces both the depth of the burn and the pain. Cold (not cool) water causes shivering and hypothermia, which makes the burn worse.',
        diagram: 'cool_burn',
        alternatives: [
          { when: 'No running water', instead: 'Soak a clean cloth in water and apply for 20 minutes. Re-wet every 2 minutes.' },
          { when: 'Burn is more than 3 hours old', instead: 'Skip the cooling — no longer helps. Move to dressing.' },
        ],
        citationIds: ['parkland'],
      },
      {
        id: 'bn2',
        action: 'Calculate and run IV fluids',
        detail:
          'Math: their weight in kg × 4 × percent of body burned (palm = 1%) = mL of fluid needed in the first 24 hours. Half of that in the first 8 hours from the burn (not from now), half over the next 16 hours. Example: 70 kg person, 15% burn = 70 × 4 × 15 = 4200 mL total; 2100 mL in first 8 hours = 263 mL/hr. Use Hartmann\'s.',
        professionalNotes: 'Parkland formula: 4 mL × kg × %BSA Lactated Ringer\'s over 24 h, 50% in first 8 h from time of burn. Titrate to urine output 0.5 mL/kg/h.',
        why:
          'Burns leak enormous amounts of fluid invisibly. Aggressive replacement keeps the kidneys working and prevents shock. Under-replacing kills.',
        diagram: 'iv_acf',
        drug: "Hartmann's solution IV bag",
        dose: 'see calculation above',
        route: 'IV drip into a vein',
        frequency: 'continuous, titrate to urine output',
        alternatives: [
          { when: 'You cannot get an IV in', instead: 'Have them drink electrolyte solution by mouth as fast as they can tolerate. Not as good but better than nothing.' },
          { when: 'Burn is less than 10% of body', instead: 'Oral fluids enough — skip IV unless they look dehydrated.' },
        ],
        citationIds: ['parkland'],
      },
      {
        id: 'bn3',
        action: 'Strong pain relief before any dressing change',
        detail:
          'Get the captain to unlock the cabinet. Ketamine: weight in kg × 0.5 = mg needed (so 70 kg = 35 mg = 0.7 mL of the 50 mg/mL ampoule). Inject into the outside of the thigh, 90° angle, all the way in. Wait 5 minutes before touching the dressings. They may feel detached — that is normal and means it is working.',
        professionalNotes: 'Ketamine 0.5 mg/kg IM 5 minutes before dressing. Add midazolam 1-2 mg if emergence agitation expected.',
        why: 'Burn dressing changes are described by survivors as the worst pain imaginable. Pre-medicating means they remember the trauma less and stay still during the procedure.',
        diagram: 'im_thigh',
        drug: 'Ketamine injection',
        dose: '0.5 mg per kg',
        route: 'into the outside of the thigh muscle',
        frequency: 'before each dressing change',
        alternatives: [
          { when: 'No ketamine', instead: 'Morphine 10 mg into the thigh, 10 minutes before. Not quite as effective for procedural pain.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: ['parkland'],
      },
      {
        id: 'bn4',
        action: 'Cover with cling film, then non-stick dressing',
        detail:
          'After the cool water is finished, wrap a single layer of cling film loosely over the burn (do not pull tight — it expands as the burn swells). Then put a non-stick dressing pad over the cling film. Tape edges down.',
        why: 'Cling film keeps fluid in and germs out without sticking to the wound. Painless to remove later, unlike gauze which sticks to burnt tissue.',
        alternatives: [
          { when: 'No cling film', instead: 'Use the non-stick pads alone. Change daily and apply a thin layer of petroleum jelly between dressing changes to keep them from sticking.' },
        ],
        citationIds: ['parkland'],
      },
      {
        id: 'bn5',
        action: 'Keep them warm with a Mylar blanket',
        detail:
          'Wrap the unaffected parts of the body in a Mylar (silver) thermal blanket from the trauma kit. Use warmed IV fluids if available — drop the IV bag in warm water for 5 minutes before hanging.',
        why: 'Big burns lose heat very fast — the skin cannot regulate temperature any more. Hypothermia (below 36°C) doubles the death rate from burns.',
        alternatives: [
          { when: 'No Mylar blanket', instead: 'Layer regular blankets and turn up the cabin heat. The goal is body temperature above 36°C.' },
        ],
        citationIds: ['parkland'],
      },
    ],
    evacuateIf: ['Burn larger than 10% of body', 'Any deep/charred areas', 'Burns to face, hands, genitals, or over a joint', 'Smoke inhalation', 'Electrical or chemical burns'],
    manageOnboardIf: ['Small (<5%) shallow burn not on the face, hands, or joints'],
    citationIds: ['parkland'],
    reasoning: 'Big burns lose enormous amounts of fluid invisibly.',
  },

  // === 9. DIABETIC EMERGENCY ===
  {
    id: 'diabetic_emergency',
    condition: 'Diabetic emergency (low blood sugar)',
    shortHeadline: 'Low blood sugar — act fast',
    layExplanation: 'The brain runs on sugar. When blood sugar crashes, the person can become confused or unconscious within minutes.',
    category: 'endocrine',
    likelihoodPercent: 11,
    timeAction: TA.SHORE_24H,
    regions: ['general', 'head'],
    triggerSymptoms: ['shaking or trembling', 'sudden confusion or strange behaviour', 'sweating heavily', 'pale and clammy', 'known diabetic'],
    yesNoQuestions: [
      'Are they a known diabetic?',
      'Are they shaking or trembling?',
      'Are they confused, aggressive, or not making sense?',
      'Are they sweating heavily without exertion?',
      'Did they miss a meal or take insulin recently?',
    ],
    tieBreakers: [
      'Glucometer reading below 4 mmol/L (72 mg/dL)? (Yes = hypoglycaemia confirmed)',
      'Fruity-smelling breath? (Yes = more likely high blood sugar — different treatment)',
    ],
    diagnosticSteps: ['Check blood glucose with the glucometer NOW', 'If glucometer unavailable: assume low and treat — safer than waiting', 'Recheck glucose every 15 minutes'],
    treatment: [
      {
        id: 'dex1',
        action: 'Check blood glucose immediately',
        detail: 'Take the glucometer from Sickbay drawer 1 (orange label). Prick the side of a fingertip. Apply the drop to the strip. Below 4 mmol/L = low blood sugar. Treat immediately.',
        why: 'Low blood sugar kills brain cells within minutes. Fast diagnosis prevents permanent damage.',
        alternatives: [{ when: 'No glucometer or strip', instead: 'If symptoms fit (shaking, sweating, diabetic) — treat for low blood sugar anyway. Giving sugar to a high-blood-sugar patient is far less dangerous than not giving it to a low one.' }],
        citationIds: [],
      },
      {
        id: 'dex2',
        action: 'Give glucose by mouth if they can swallow safely',
        detail: 'Give one of: 200 mL of fruit juice, 4 glucose tablets (from the medical kit), 3 teaspoons of sugar dissolved in water, or 6 jellybeans. Have them swallow it all at once. Repeat after 15 minutes if still unwell.',
        professionalNotes: '15-15 rule: 15 g fast carbohydrate, recheck at 15 min. Then give slow-release snack (sandwich) once >4 mmol/L.',
        why: 'Fast sugar gets into the blood in 5-10 minutes. Slow sugar (like bread) prevents the crash coming back.',
        alternatives: [{ when: 'They cannot swallow or are too confused', instead: 'Do NOT give anything by mouth — choking risk. Move to glucagon injection.' }],
        citationIds: [],
      },
      {
        id: 'dex3',
        action: 'Glucagon injection if unconscious or cannot swallow',
        detail: 'Find the Glucagon Kit (orange label) in Drawer 1. Snap together the syringe as per the instructions on the box lid. Inject the whole 1 mg into the outside of the upper thigh, 90°, all the way in. Roll them on their side. They should wake within 10-15 minutes.',
        professionalNotes: 'Glucagon 1 mg IM. Onset 10-15 min. Causes nausea on waking — have a bucket ready. Give slow carbohydrate once conscious.',
        why: 'Glucagon tells the liver to release its stored sugar. Works even when they cannot eat.',
        diagram: 'im_thigh',
        drug: 'Glucagon injection kit',
        dose: '1 mg',
        route: 'into the outside of the thigh muscle',
        frequency: 'single dose',
        alternatives: [
          { when: 'No glucagon', instead: 'If IV access: run 50 mL of Dextrose 5% IV bag as fast as it will go. Then 100 mL more. Recheck glucose every 5 minutes.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: [],
      },
      {
        id: 'dex4',
        action: 'Recheck glucose at 15 and 30 minutes',
        detail: 'Use the glucometer. Target is above 5 mmol/L. Once above, give a proper meal — sandwich, crackers with cheese, anything slow-release. If they refuse, give a glucose drink every 30 minutes.',
        why: 'Blood sugar can drop again within an hour after treatment. Slow carbohydrate "locks in" the recovery.',
        alternatives: [{ when: 'No food available', instead: 'Keep a glucose drink running every 30 minutes until shore.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['Did not respond to glucagon within 20 minutes', 'Glucose stays below 3 mmol/L after two rounds of treatment', 'Seizure occurred during the episode', 'This is their second severe episode this voyage'],
    manageOnboardIf: ['Responds to oral glucose within 15 minutes', 'Glucose >5 mmol/L at 30 min check', 'Fully alert and eating'],
    citationIds: [],
    reasoning: 'Hypoglycaemia is one of the most common reversible medical emergencies in working crews.',
  },

  // === 10. ASTHMA ATTACK ===
  {
    id: 'asthma_attack',
    condition: 'Severe asthma attack',
    shortHeadline: 'Severe wheeze — open the airways',
    layExplanation: 'The small tubes in the lungs have gone into spasm, making it very hard to breathe out.',
    category: 'respiratory',
    likelihoodPercent: 9,
    timeAction: TA.HELI_2H,
    regions: ['breathing', 'chest_center'],
    triggerSymptoms: ['severe wheezing', 'cannot speak a full sentence', 'using neck and shoulder muscles to breathe', 'known asthma not responding to their own inhaler', 'blue lips'],
    yesNoQuestions: [
      'Are they wheezing (high-pitched noise on breathing out)?',
      'Have they already used their own inhaler without improvement?',
      'Can they speak only 2-3 words before needing to breathe?',
      'Are they hunched forward gripping the chair?',
      'Are their lips or fingertips going blue?',
    ],
    tieBreakers: ['Blue lips or SpO2 below 88%? (Yes = HELI NOW)', 'Silent chest (no wheeze at all)? (Yes = HELI NOW — too little air to make sound)'],
    diagnosticSteps: ['Check SpO2 on LIFEPAK 15', 'Count breathing rate', 'Listen to the chest — wheeze both sides, or silent?', 'Time how long they can speak before needing a breath'],
    treatment: [
      {
        id: 'asth1',
        action: 'Salbutamol nebuliser — give right away',
        detail: 'Get a Salbutamol 5 mg nebule from Drawer 5 (blue label). Pour into the nebuliser chamber. Connect oxygen at 6-8 L/min. Place mask over nose and mouth. Run for 10-15 minutes until the chamber rattles empty. Can repeat every 20 minutes up to 3 times.',
        professionalNotes: 'Salbutamol 5 mg via O2-driven nebuliser. Repeat every 20 min PRN for 3 doses. Add ipratropium 500 mcg if available.',
        why: 'Salbutamol opens the spasmed airways within 3-5 minutes. It is the most important first treatment.',
        diagram: 'neb_mask',
        drug: 'Salbutamol nebule',
        dose: '5 mg',
        route: 'nebuliser mask with oxygen',
        frequency: 'every 20 minutes, up to 3 doses',
        alternatives: [
          { when: 'No nebuliser machine', instead: 'Use their own MDI inhaler with a spacer — 10 puffs back to back, one puff at a time, 30 seconds apart.' },
          { when: 'No salbutamol available', instead: 'Get the captain to issue an urgent distress call — there is no safe replacement onboard.' },
        ],
        citationIds: [],
      },
      {
        id: 'asth2',
        action: 'Steroid injection to calm the inflammation',
        detail: 'Get two Hydrocortisone 100 mg vials from the red allergy box. Dissolve each in 2 mL saline. Draw both into one syringe. Push slowly into a vein over 1 minute (or into the thigh muscle if no IV).',
        professionalNotes: 'Hydrocortisone 200 mg IV or IM. Onset 4-6 hours but important to give early. If prednisolone tablets are stocked: 40 mg PO is equivalent.',
        why: 'The bronchospasm is partly immediate (salbutamol fixes this) and partly inflammation building over hours (steroids fix this). Without steroids, the attack is very likely to come back.',
        diagram: 'iv_acf',
        drug: 'Hydrocortisone injection',
        dose: '200 mg',
        route: 'into a vein',
        frequency: 'single dose now, then every 6 hours if still wheezing',
        alternatives: [
          { when: 'No IV access', instead: 'Inject both vials into the outside of the thigh muscle (each separately — 2 mL max per site).' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: [],
      },
      {
        id: 'asth3',
        action: 'Sit them upright and give continuous oxygen',
        detail: 'Sit them up at 90° — leaning slightly forward with elbows on knees is the easiest position to breathe in. Never lie them flat. Non-rebreather oxygen mask at 10-15 L/min if SpO2 below 94%.',
        why: 'Lying flat compresses the lungs. Sitting upright with shoulders high makes every breath easier. Oxygen supports the heart during the strain of severe breathing.',
        alternatives: [{ when: 'They cannot sit up', instead: 'Prop at 45° minimum, supported on both sides with rolled blankets.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['SpO2 below 92% despite treatment', 'Still cannot speak after 3 nebulisers', 'Breathing rate above 30 per minute', 'Silent chest at any point', 'Blue lips'],
    manageOnboardIf: ['SpO2 above 94%, can speak normally, wheeze much improved after first nebuliser'],
    citationIds: [],
    reasoning: 'Severe asthma can be fatal — respond aggressively and evacuate if not rapidly improving.',
  },

  // === 11. SEIZURE ===
  {
    id: 'seizure',
    condition: 'Seizure (fit)',
    shortHeadline: 'Seizure — protect and wait',
    layExplanation: 'A seizure is an uncontrolled electrical storm in the brain causing shaking or loss of consciousness.',
    category: 'neurological',
    likelihoodPercent: 7,
    timeAction: TA.SHORE_24H,
    regions: ['head', 'general'],
    triggerSymptoms: ['uncontrolled shaking of arms and legs', 'eyes rolled back', 'loss of consciousness', 'bitten tongue', 'confusion after shaking stops', 'loss of bladder control'],
    yesNoQuestions: [
      'Did the shaking involve the whole body?',
      'Were they unconscious during the shaking?',
      'Has the shaking lasted more than 5 minutes?',
      'Is this their first seizure ever?',
      'Do they have a known epilepsy diagnosis?',
    ],
    tieBreakers: [
      'Still seizing after 5 minutes? (Yes = status epilepticus — give midazolam NOW)',
      'Head injury before the seizure? (Yes = treat head injury, HELI NOW)',
      'Blood glucose below 4 mmol/L? (Yes = treat hypoglycaemia)',
    ],
    diagnosticSteps: ['Time the seizure from start', 'Check blood glucose immediately after', 'Check temperature', 'Check pupils (equal and reactive = better sign)'],
    treatment: [
      {
        id: 'sz1',
        action: 'During the seizure: protect and clear the space',
        detail: 'Move any objects that could injure them away — chairs, equipment, sharp edges. Slide something soft under their head — a rolled jacket or pillow. Do NOT hold them down or put anything in their mouth. Stay with them and time the seizure on your watch.',
        why: 'Restraining causes joint injuries. Putting objects in the mouth causes broken teeth and can be bitten off. The seizure must run its course — your job is to prevent injury, not stop the movement.',
        alternatives: [{ when: 'On a moving vessel in rough seas', instead: 'Get crew to steady themselves on either side (not hold). Clear the surrounding 2 metres as best you can.' }],
        citationIds: [],
      },
      {
        id: 'sz2',
        action: 'Midazolam if seizure continues past 5 minutes',
        detail: 'Get Midazolam 5 mg / 1 mL from Drawer 3 (yellow label). Draw up 10 mg (2 mL) into a syringe. While they are seizing, pull back their cheek and squirt the full 2 mL between the cheek and gum (buccal route — not into the throat). The medicine absorbs through the mouth lining in 2-3 minutes.',
        professionalNotes: 'Midazolam 10 mg buccal. Second-line: 5 mg IM into the thigh if buccal failed. Watch airway and breathing rate post-dose.',
        why: 'A seizure lasting more than 5 minutes will not stop on its own. Midazolam interrupts the electrical storm. Untreated, brain damage begins around 30 minutes.',
        diagram: 'sl_under_tongue',
        drug: 'Midazolam injection',
        dose: '10 mg (2 mL)',
        route: 'squirted inside the cheek (buccal)',
        frequency: 'single dose, can repeat once after 10 minutes if still seizing',
        alternatives: [
          { when: 'Cannot safely access the mouth', instead: 'Inject the same 10 mg into the outside of the thigh muscle while still seizing.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: [],
      },
      {
        id: 'sz3',
        action: 'After the seizure: recovery position and airway check',
        detail: 'Once shaking stops, roll them onto their side (recovery position). Tilt the head back slightly to open the airway. They will be confused and tired (post-ictal) for 10-60 minutes — this is normal. Talk calmly. Do not let them stand up until fully alert.',
        why: 'Post-seizure patients vomit frequently. The recovery position prevents choking. Confusion lasting more than an hour may suggest a more serious cause.',
        alternatives: [{ when: 'Suspected neck injury', instead: 'Keep head neutral — do not tilt. Support the jaw from the sides to open the airway (jaw thrust).' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['First-ever seizure', 'Seizure lasted more than 10 minutes', 'Did not fully recover consciousness within 1 hour', 'Head injury preceded the seizure', 'Two or more seizures in 24 hours'],
    manageOnboardIf: ['Known epileptic who has fully recovered, back to normal within 1 hour, no injury'],
    citationIds: [],
    reasoning: 'Seizures in isolation are rarely immediately fatal, but the cause must be investigated and recurrence prevented.',
  },

  // === 12. HEAD INJURY ===
  {
    id: 'head_injury',
    condition: 'Head injury',
    shortHeadline: 'Head injury — watch closely',
    layExplanation: 'A blow to the head can cause bleeding inside the skull. It can look mild at first, then deteriorate hours later.',
    category: 'trauma',
    likelihoodPercent: 13,
    timeAction: TA.HELI_2H,
    regions: ['head'],
    triggerSymptoms: ['hit head on equipment or deck', 'brief loss of consciousness', 'confused or slow to respond', 'vomiting after the hit', 'unequal pupils'],
    yesNoQuestions: [
      'Did they hit their head on something solid?',
      'Did they lose consciousness, even briefly?',
      'Are they confused or not remembering the event?',
      'Have they vomited more than once since the hit?',
      'Are the pupils different sizes?',
    ],
    tieBreakers: [
      'One pupil larger than the other and not reacting to light? (Yes = HELI NOW — brain bleed probable)',
      'GCS below 14 (confused or not obeying commands)? (Yes = HELI NOW)',
    ],
    diagnosticSteps: ['GCS: Eyes (1-4), Voice (1-5), Movement (1-6) — max 15', 'Check both pupils with a torch — equal size and both reacting?', 'Ask: what is today? Where are we? What happened?', 'Check arms and legs for weakness'],
    treatment: [
      {
        id: 'hi1',
        action: 'Establish spine precautions if mechanism was a fall from height',
        detail: 'If they fell more than their own height (e.g., off a ladder): keep their head and neck in the same line. Get a second person to hold the head still from both sides. Apply the neck collar from the sickbay closet. Log-roll together to move them.',
        why: 'Falls from height can break the neck without obvious signs. Moving with an unstable neck fracture can cause paralysis.',
        alternatives: [{ when: 'Mechanism was a bump at the same level (not a fall)', instead: 'Neck collar not needed — focus on neuro obs.' }],
        citationIds: [],
      },
      {
        id: 'hi2',
        action: 'Check GCS and pupils every 15 minutes',
        detail: 'Write down: the time, GCS score (Eyes + Voice + Movement), and whether pupils are equal and reacting. Use the whiteboard or a paper log. Any DECREASE in GCS by 2 or more = evacuate immediately.',
        professionalNotes: 'GCS <14 at any point = urgent evacuation. Watch for Cushing\'s triad: rising BP, slowing pulse, irregular breathing — indicates rising intracranial pressure.',
        why: 'Bleeding inside the skull raises pressure slowly. The deterioration can happen over minutes to hours. Catching it early allows evacuation before brain damage occurs.',
        alternatives: [{ when: 'Working alone', instead: 'Set a phone alarm every 15 minutes. Ask crew to check on you.' }],
        citationIds: [],
      },
      {
        id: 'hi3',
        action: 'Head elevated 30°, nothing by mouth',
        detail: 'Prop them up at 30° — do not lie them flat. No food or water (they may need surgery). Keep the room quiet and lights low.',
        why: 'Head elevation reduces pressure inside the skull. No food is needed in case of emergency surgery on arrival.',
        alternatives: [{ when: 'Suspected neck injury and cannot tilt', instead: 'Tilt the whole bed/stretcher 30° from the feet end while keeping the head flat.' }],
        citationIds: [],
      },
      {
        id: 'hi4',
        action: 'Pain relief: paracetamol only — no aspirin, no ibuprofen',
        detail: 'Give two Paracetamol 500 mg tablets from Drawer 2. Every 6 hours as needed. Do NOT give aspirin, ibuprofen, or ketorolac — they thin the blood and can make a brain bleed much worse.',
        why: 'NSAIDs increase bleeding risk inside the skull. Paracetamol does not.',
        drug: 'Paracetamol tablets',
        dose: '1 g (two 500 mg tablets)',
        route: 'by mouth',
        frequency: 'every 6 hours',
        alternatives: [{ when: 'Unable to swallow', instead: 'Withhold all analgesia. Comfort with position.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['GCS below 14 at any point', 'Unequal pupils', 'One-sided arm or leg weakness', 'Seizure', 'Worsening headache after initial improvement', 'Any unconsciousness in a patient over 65'],
    manageOnboardIf: ['GCS 15, equal pupils, alert and orientated, no vomiting, mild mechanism — monitor hourly for 6 hours'],
    citationIds: [],
    reasoning: 'An extradural haematoma can present with a \'lucid interval\' — seeming fine, then deteriorating rapidly. Vigilance saves lives.',
  },

  // === 13. STROKE ===
  {
    id: 'stroke',
    condition: 'Stroke (suspected)',
    shortHeadline: 'Possible stroke — time is brain',
    layExplanation: 'Part of the brain has lost its blood supply. Every minute more brain cells die. Evacuation speed determines outcome.',
    category: 'neurological',
    likelihoodPercent: 6,
    timeAction: TA.HELI_NOW,
    regions: ['head', 'general'],
    triggerSymptoms: ['sudden face drooping on one side', 'sudden arm weakness on one side', 'sudden slurred speech', 'sudden severe headache with no cause', 'sudden vision loss in one eye'],
    yesNoQuestions: [
      'Did the face droop suddenly on one side?',
      'Is one arm suddenly weak or numb?',
      'Is their speech suddenly slurred or they cannot find words?',
      'Did this come on suddenly (within minutes)?',
      'Is there a sudden very severe headache — the worst of their life?',
    ],
    tieBreakers: [
      'Sudden worst-ever headache with stiff neck? (Yes = subarachnoid haemorrhage — HELI NOW, no aspirin)',
      'Blood glucose below 4? (Yes = treat for low blood sugar first — can mimic stroke)',
    ],
    diagnosticSteps: ['FAST assessment: Face droop, Arm drift, Speech, Time', 'Blood glucose to rule out hypoglycaemia', 'Blood pressure on both arms', 'Check if on blood thinners'],
    treatment: [
      {
        id: 'str1',
        action: 'Call for evacuation immediately — do not wait',
        detail: 'Contact the captain now. A suspected stroke requires helicopter evacuation. Every minute of delay costs 2 million brain cells. State the time symptoms started clearly — hospital treatment depends on this.',
        why: 'The clot-dissolving treatment (thrombolysis) can only be given within 4.5 hours of symptom start. After that window, the treatment that could save them becomes unavailable.',
        alternatives: [{ when: 'Weather prevents immediate helicopter', instead: 'Get the fastest available evacuation option. Contact the on-shore physician via satellite for guidance.' }],
        citationIds: [],
      },
      {
        id: 'str2',
        action: 'Aspirin 300 mg if they can swallow and symptoms started less than 4 hours ago',
        detail: 'Only give aspirin if: (1) they are fully conscious, (2) they can swallow safely, (3) the headache is NOT the worst-ever type (that may mean a bleed, not a clot). Get a 300 mg dispersible tablet from Drawer 2. Have them chew it and swallow.',
        professionalNotes: 'Aspirin 300 mg PO only for ischaemic stroke — CONTRAINDICATED if haemorrhagic stroke suspected (thunderclap headache, very high BP). Do not give if taking anticoagulants.',
        why: 'Most strokes are caused by a clot. Aspirin stops the clot growing and reduces the chance of a second stroke in the next 24 hours.',
        drug: 'Aspirin dispersible',
        dose: '300 mg',
        route: 'chewed and swallowed',
        frequency: 'single dose',
        diagram: 'po_oral',
        alternatives: [
          { when: 'Headache is the worst of their life, or very high blood pressure (above 200)', instead: 'Skip aspirin — this may be a bleed, not a clot. Aspirin in a bleed can be fatal.' },
          { when: 'They cannot swallow safely', instead: 'Skip — do not put anything in the mouth of someone who cannot swallow.' },
        ],
        citationIds: [],
      },
      {
        id: 'str3',
        action: 'Recovery position and oxygen if not fully alert',
        detail: 'If conscious: sit them up at 30°. If drowsy or unconscious: roll them on their side (recovery position). Oxygen at 6-10 L/min via face mask if SpO2 below 94% or if they look blue.',
        why: 'Swallowing is often affected in stroke — recovery position prevents choking on saliva or vomit. Oxygen supports the struggling brain.',
        alternatives: [{ when: 'They insist on sitting up and can maintain airway', instead: 'Let them choose their position. Comfort reduces blood pressure and fear.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['Always — every suspected stroke must reach hospital within hours'],
    manageOnboardIf: ['Never — no onboard treatment can substitute for a CT scan and thrombolysis'],
    citationIds: [],
    reasoning: 'Stroke is a time-critical emergency. The only onboard role is to stabilise, give aspirin (if appropriate), and evacuate as fast as possible.',
  },

  // === 14. EYE INJURY ===
  {
    id: 'eye_injury',
    condition: 'Eye injury (chemical or impact)',
    shortHeadline: 'Eye emergency — irrigate now',
    layExplanation: 'A chemical splash or impact to the eye can cause permanent vision loss within minutes without treatment.',
    category: 'trauma',
    likelihoodPercent: 8,
    timeAction: TA.SHORE_24H,
    regions: ['head'],
    triggerSymptoms: ['chemical in the eye', 'severe eye pain', 'vision blurred or gone', 'eye will not open', 'hit by object near the eye'],
    yesNoQuestions: [
      'Did a chemical splash into the eye?',
      'Is the eye very painful and hard to open?',
      'Is their vision blurred or lost in that eye?',
      'Did a solid object hit the eye directly?',
      'Is the eyelid swollen or the eye looking deformed?',
    ],
    tieBreakers: ['Visible fluid or jelly coming from the eye? (Yes = likely ruptured globe — patch gently, NO pressure, HELI NOW)'],
    diagnosticSteps: ['Cover the other eye — can they see any light through the injured one?', 'Look at the cornea (the clear front) — is it cloudy?', 'Identify the chemical if possible'],
    treatment: [
      {
        id: 'ey1',
        action: 'Irrigate the eye with saline — START IMMEDIATELY for chemical injury',
        detail: 'Pick up a 1 L bag of saline. Pierce the bag with an IV giving set. Hold the drip end over the open eye and let saline flow continuously over the eyeball for 20 full minutes. Have someone hold their eyelids open if they cannot. Move the eye in all directions. Repeat with a second bag if you have it.',
        professionalNotes: 'Copious irrigation for 20-30 min. Aim for pH 7-7.5 using litmus paper if available. Alkali burns (bleach, cement) penetrate deeper — irrigate for 30-60 min.',
        why: 'Alkali chemicals penetrate the eye within 30 seconds and keep burning for hours. Acid burns are also serious. Dilution with saline is the only way to stop the damage.',
        alternatives: [
          { when: 'No saline available', instead: 'Use clean tap water continuously for 20 minutes. Not as good as saline but much better than nothing.' },
          { when: 'No IV bag', instead: 'Tilt their head, keep eye open, pour water from a cup continuously. Get the flow going over the inner corner of the eye first.' },
        ],
        citationIds: [],
      },
      {
        id: 'ey2',
        action: 'Patch the eye after irrigation',
        detail: 'After rinsing: place a non-stick pad (from Drawer 4, blue label) gently over the closed eye. Tape the edges with micropore tape — make sure it is not pressing on the eyeball. For impact injuries: same technique — a pad, NOT a tight bandage.',
        why: 'A patch prevents blinking (which is painful) and keeps debris out. Light pressure is fine for chemical burns, but NOT for ruptured globes.',
        alternatives: [{ when: 'Suspected ruptured globe (deformed eye, jelly leaking)', instead: 'Place a rigid eye shield (paper cup cut to size) taped around the eye — do NOT apply any pressure to the eyeball.' }],
        citationIds: [],
      },
      {
        id: 'ey3',
        action: 'Pain relief — ketorolac IM',
        detail: 'Get Ketorolac 30 mg from Drawer 3 (yellow label). Inject 1 mL into the outside of the shoulder or thigh muscle at 90°. Effective in 20-30 minutes.',
        drug: 'Ketorolac injection',
        dose: '30 mg',
        route: 'into the shoulder or thigh muscle',
        frequency: 'every 6 hours as needed',
        diagram: 'im_deltoid',
        alternatives: [
          { when: 'No ketorolac', instead: 'Two Paracetamol 500 mg tablets plus two Ibuprofen 400 mg tablets — together for better effect.' },
        ],
        citationIds: [],
      },
    ],
    evacuateIf: ['Any vision loss after irrigation', 'Ruptured globe suspected', 'Strong acid or alkali chemical (cement, bleach, battery acid)', 'Eye remains very painful after 30 min irrigation'],
    manageOnboardIf: ['Mild splash (soap, mild detergent), fully irrigated, vision normal, no pain after irrigation'],
    citationIds: [],
    reasoning: 'Alkali eye injuries can cause blindness within minutes if irrigation is delayed. Speed is essential.',
  },

  // === 15. HEAT ILLNESS ===
  {
    id: 'heat_illness',
    condition: 'Heat illness (heat exhaustion or heat stroke)',
    shortHeadline: 'Overheating — cool fast',
    layExplanation: 'The body has overheated, usually from working in a hot engine room or direct sun. Heat stroke is immediately life-threatening.',
    category: 'environmental',
    likelihoodPercent: 9,
    timeAction: TA.HELI_2H,
    regions: ['general', 'head'],
    triggerSymptoms: ['working in extreme heat', 'stopped sweating but feels very hot', 'confused or hallucinating', 'collapsing or feeling faint', 'skin hot and dry to the touch'],
    yesNoQuestions: [
      'Have they been in a hot engine room or direct sun for hours?',
      'Is their skin hot and dry (not sweating any more)?',
      'Are they confused, acting strangely, or hard to rouse?',
      'Has their temperature gone above 40°C / 104°F?',
      'Have they had muscle cramps with heavy sweating?',
    ],
    tieBreakers: [
      'Skin hot and dry + confused? (Yes = heat stroke — HELI NOW, cool aggressively)',
      'Still sweating + feels faint but alert? (Yes = heat exhaustion — cool and hydrate, usually responds in 30 minutes)',
    ],
    diagnosticSteps: ['Core temperature with IR thermometer', 'Check mental status — what day is it, where are we?', 'Check pulse — rapid weak?', 'Look for sweating (exhaustion) vs dry skin (stroke)'],
    treatment: [
      {
        id: 'ht1',
        action: 'Move to coolest available space immediately',
        detail: 'Get them out of the heat — engine room, sun deck. Bring them to an air-conditioned cabin or the coldest internal space. Remove excess clothing — work shirts, boots, thick trousers. Lay them down with legs elevated.',
        why: 'The body can only cool itself if the environment is cooler than skin temperature. Every minute in the heat causes more damage.',
        alternatives: [{ when: 'No air-conditioned space', instead: 'Get fans blowing at them. The airflow over moist skin cools through evaporation.' }],
        citationIds: [],
      },
      {
        id: 'ht2',
        action: 'Active cooling — ice packs to pulse points',
        detail: 'Pack ice (from the galley) into food bags or gloves. Apply to: back of neck, both armpits, both groin areas. Also wet their head and shoulders with cold water and fan them. Keep adding cold water continuously.',
        professionalNotes: 'Target core temperature below 39°C within 30 min. Evaporative cooling (misting + fan) is most effective. Ice packs to groin/axilla/neck for heat stroke.',
        why: 'These points have large blood vessels close to the skin. Cooling the blood here rapidly reduces core temperature.',
        alternatives: [{ when: 'No ice', instead: 'Soak towels in the coldest water available, drape over neck, armpits, and groin. Re-soak every 2 minutes.' }],
        citationIds: [],
      },
      {
        id: 'ht3',
        action: 'IV fluids 1 L fast if they look faint or temperature above 40°C',
        detail: 'Run one Hartmann\'s 1 L IV bag as fast as it will go (clamp fully open). If they are conscious and not confused: also encourage drinking cold water — as much as they can manage.',
        why: 'Dehydration is always a component of heat illness. IV fluids restore circulating volume, which allows the sweating mechanism to restart.',
        diagram: 'iv_acf',
        drug: "Hartmann's solution IV bag",
        dose: '1 L',
        route: 'IV drip into a vein',
        frequency: 'over 30 minutes, then reassess',
        alternatives: [
          { when: 'Alert and can drink', instead: 'Cold electrolyte drink (sports drink or ORS sachets in water) — 500 mL every 30 minutes.' },
          { when: 'Cannot get IV access', instead: 'Continue aggressive external cooling and oral fluids if they can swallow.' },
        ],
        citationIds: [],
      },
      {
        id: 'ht4',
        action: 'Temperature every 10 minutes',
        detail: 'Use the IR thermometer on the forehead every 10 minutes. Once below 39°C, slow cooling to avoid overshoot. If temperature does not drop 1°C in 20 minutes despite active cooling, upgrade to HELI NOW.',
        why: 'Cooling can be too effective — below 37°C, shivering begins and the temperature rebounds. Monitor closely.',
        alternatives: [{ when: 'No thermometer', instead: 'Judge by confusion level — if still confused after 30 min of cooling and fluids, treat as heat stroke, evacuate.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['Temperature above 40°C and confused (heat stroke)', 'Temperature not falling after 30 min active cooling', 'Unconscious or seizing', 'Rapid weak pulse'],
    manageOnboardIf: ['Heat exhaustion: alert, still sweating, temperature below 39°C — responds to cooling and oral fluids within 30 minutes'],
    citationIds: [],
    reasoning: 'Heat stroke (hot, dry, confused) kills. Heat exhaustion (sweating, faint) resolves with cooling and fluids.',
  },

  // === 16. NEAR DROWNING ===
  {
    id: 'near_drowning',
    condition: 'Near-drowning (rescue from water)',
    shortHeadline: 'Rescued from water — act fast',
    layExplanation: 'Water in the lungs and cold from immersion are both immediately life-threatening.',
    category: 'environmental',
    likelihoodPercent: 7,
    timeAction: TA.HELI_NOW,
    regions: ['breathing', 'general'],
    triggerSymptoms: ['rescued from sea or flooded space', 'coughing up water', 'not breathing normally', 'unconscious after immersion', 'very cold and shivering'],
    yesNoQuestions: [
      'Were they rescued from the sea or an enclosed flooded space?',
      'Are they breathing normally?',
      'Are they conscious and responding?',
      'Were they in the water for more than 5 minutes?',
      'Was the water cold (below 15°C)?',
    ],
    tieBreakers: ['No pulse and not breathing? (Yes = START CPR NOW — cold water protects the brain, keep going)'],
    diagnosticSteps: ['Is there a pulse? Is there breathing?', 'Skin colour — blue, pale, or pink?', 'Temperature', 'SpO2 as soon as possible'],
    treatment: [
      {
        id: 'nd1',
        action: 'If not breathing: start CPR immediately',
        detail: 'Lay them flat. Tilt head back, lift chin. 30 chest compressions in the centre of the chest, pressing down 5-6 cm at a rate of 100 per minute. Then 2 rescue breaths (or continuous compressions only if you cannot breathe for them). Use the LIFEPAK 15 AED pads as soon as they are attached.',
        professionalNotes: 'Hypothermic cardiac arrest: do not stop CPR early — the cold brain is far more resistant to damage. Rule: \'not dead until warm and dead\'.',
        why: 'Cold water protects the brain. There are cases of full recovery after 30+ minutes of submersion in cold water with CPR continued until warming in hospital.',
        diagram: 'recovery_position',
        alternatives: [{ when: 'Only one rescuer', instead: '30:2 ratio. If exhausted after 10 minutes, switch to hands-only compressions without rescue breaths.' }],
        citationIds: [],
      },
      {
        id: 'nd2',
        action: 'Oxygen — high-flow, immediately',
        detail: 'Non-rebreather mask at 15 L/min. Keep the bag inflated. If they are breathing on their own, this is the most important thing you can do while preparing evacuation.',
        why: 'Water disrupts the lung\'s ability to move oxygen into the blood. High-flow oxygen compensates for this until the fluid clears.',
        diagram: 'neb_mask',
        drug: 'Oxygen cylinder',
        dose: '15 L/min',
        route: 'non-rebreather face mask',
        frequency: 'continuous',
        alternatives: [{ when: 'No oxygen', instead: 'Sit them upright (if conscious) and maintain airway. Continuous observation.' }],
        citationIds: [],
      },
      {
        id: 'nd3',
        action: 'Rewarm — remove wet clothing, wrap in blankets',
        detail: 'Cut off wet clothing with scissors — do not roll them to undress (unnecessary movement in a cold person can trigger cardiac arrest). Wrap in dry blankets. Use Mylar blanket from the trauma kit over the top. Warm IV fluids if available (drop bag in warm water for 5 min).',
        why: 'Wet clothing conducts heat away 25 times faster than air. Aggressive rewarming is essential for survival.',
        alternatives: [{ when: 'No Mylar blanket', instead: 'Lay between two dry wool blankets. Hat on the head — 30% of heat loss is from an uncovered head.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['Every near-drowning — even those who seem recovered need hospital observation for 24 hours (secondary drowning)'],
    manageOnboardIf: ['Never — secondary drowning (delayed lung oedema) can occur 4-8 hours later and is fatal without hospital care'],
    citationIds: [],
    reasoning: '\'Secondary drowning\' can kill a person who seemed recovered. All near-drowning victims must reach a hospital.',
  },

  // === 17. CHEST TRAUMA ===
  {
    id: 'chest_trauma',
    condition: 'Chest injury (rib fractures)',
    shortHeadline: 'Chest injury — breathe through it',
    layExplanation: 'A hard blow to the chest can crack ribs. Multiple broken ribs can stop the lungs from expanding properly.',
    category: 'trauma',
    likelihoodPercent: 11,
    timeAction: TA.HELI_2H,
    regions: ['chest_center', 'chest_upper_left', 'chest_upper_right'],
    triggerSymptoms: ['chest pain after a fall or impact', 'pain that gets much worse when breathing in', 'tenderness to pressing on the ribs', 'shortness of breath', 'guarding — holding chest to breathe'],
    yesNoQuestions: [
      'Did they take a direct blow or impact to the chest?',
      'Is breathing in very painful?',
      'Are they breathing shallowly to avoid the pain?',
      'Is SpO2 below 94%?',
      'Do 3 or more ribs feel tender in a row?',
    ],
    tieBreakers: [
      'Sudden deterioration + trachea shifted to one side? (Yes = tension pneumothorax — HELI NOW)',
      'Air heard bubbling through a wound in the chest wall? (Yes = open pneumothorax — seal wound immediately)',
    ],
    diagnosticSteps: ['SpO2 on LIFEPAK 15', 'Breathing rate', 'Press gently on each rib from the breastbone outwards — note where it hurts', 'Listen to both sides of the chest — is air entry equal?'],
    treatment: [
      {
        id: 'ct1',
        action: 'Strong pain relief — makes breathing easier',
        detail: 'Ketorolac 30 mg from Drawer 3 (yellow label): inject into the outside of the shoulder or thigh muscle. Add Paracetamol 1 g by mouth every 6 hours. Good pain control lets them breathe deeply, which prevents the pneumonia that kills rib fracture patients.',
        professionalNotes: 'NSAIDs are specifically good for rib fractures (anti-inflammatory + analgesic). Opioids can suppress respiratory drive — use cautiously.',
        drug: 'Ketorolac injection + Paracetamol',
        dose: '30 mg IM + 1 g by mouth',
        route: 'injection into muscle + by mouth',
        frequency: 'ketorolac every 6 hours (max 4/day); paracetamol every 6 hours',
        diagram: 'im_deltoid',
        alternatives: [
          { when: 'Pain still severe after ketorolac', instead: 'Add Tramadol 50 mg by mouth every 6 hours from Drawer 2.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: [],
      },
      {
        id: 'ct2',
        action: 'Teach \'splinted breathing\' — do NOT strap the chest',
        detail: 'Give them a folded blanket or pillow to hug against their chest. Tell them to take 5 deep slow breaths every 30 minutes, pressing the pillow against their ribs as they do it. This holds the rib stable during the expansion. NEVER wrap the chest with a bandage — this prevents full expansion and causes pneumonia within hours.',
        why: 'Pain makes them breathe shallowly. Shallow breathing collapses small lung segments, which become infected within 24 hours. Painful deep breaths are necessary.',
        alternatives: [{ when: 'They absolutely cannot tolerate deep breaths', instead: 'Prioritise pain control and re-assess after 30 minutes.' }],
        citationIds: [],
      },
      {
        id: 'ct3',
        action: 'Oxygen if SpO2 below 94%',
        detail: 'Non-rebreather mask at 10-15 L/min. Sit them upright (90°) — this improves breathing mechanics. Never lay a chest injury patient flat.',
        why: 'Multiple rib fractures reduce how much air the lungs can move. Oxygen compensates for this reduced ventilation.',
        alternatives: [{ when: 'SpO2 above 94%', instead: 'No oxygen needed. Upright position only.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['3 or more ribs fractured', 'SpO2 below 92% on oxygen', 'Trachea shifted to one side (tension pneumothorax)', 'Breathing getting steadily worse over 1 hour', 'Air bubbling from a chest wound'],
    manageOnboardIf: ['1-2 ribs, SpO2 above 95%, pain controlled, no respiratory distress — monitor hourly'],
    citationIds: ['tccc'],
    reasoning: 'Rib fractures kill through pain-induced hypoventilation and pneumonia, not the fracture itself.',
  },

  // === 18. DENTAL ABSCESS ===
  {
    id: 'dental_abscess',
    condition: 'Dental abscess or severe toothache',
    shortHeadline: 'Dental infection — antibiotics now',
    layExplanation: 'An infected tooth or gum can spread to the jaw and, in rare cases, to the throat and airway.',
    category: 'infection',
    likelihoodPercent: 9,
    timeAction: TA.SHORE_24H,
    regions: ['mouth_jaw', 'head'],
    triggerSymptoms: ['severe throbbing toothache', 'swelling of the cheek or jaw', 'visible pus on the gum', 'pain worse when biting', 'swallowing feels uncomfortable'],
    yesNoQuestions: [
      'Is there a swollen painful area on the gum or inside the cheek?',
      'Is the cheek or jaw visibly swollen from outside?',
      'Is the pain throbbing and severe?',
      'Is swallowing uncomfortable or is the throat swelling?',
      'Do they have a fever?',
    ],
    tieBreakers: ['Swelling reaching the floor of the mouth or below the chin? (Yes = HELI NOW — airway risk, Ludwig\'s angina)'],
    diagnosticSteps: ['Look inside the mouth with a torch', 'Feel the outside of the jaw — hard or soft swelling?', 'Can they open their mouth fully?', 'Temperature'],
    treatment: [
      {
        id: 'da1',
        action: 'Antibiotics — start immediately',
        detail: 'Amoxicillin 500 mg from Drawer 6 (green label): one capsule three times a day for 5 days. First dose now. Also add Metronidazole 400 mg one tablet three times a day — together these two cover all the bacteria in dental abscesses.',
        professionalNotes: 'Co-amoxiclav (amoxicillin + clavulanate) is optimal if stocked. Amoxicillin + metronidazole is the standard alternative. Duration 5 days.',
        drug: 'Amoxicillin + Metronidazole',
        dose: '500 mg + 400 mg',
        route: 'by mouth',
        frequency: 'three times a day for 5 days',
        diagram: 'po_oral',
        alternatives: [
          { when: 'Penicillin allergy', instead: 'Use Doxycycline 100 mg twice a day (5 days) plus Metronidazole 400 mg three times a day.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: [],
      },
      {
        id: 'da2',
        action: 'Pain relief — ibuprofen + paracetamol alternating',
        detail: 'Ibuprofen 400 mg (two tablets from Drawer 2) every 8 hours. Paracetamol 500 mg (two tablets from Drawer 2) every 6 hours. Alternate them so there is always one active. Ibuprofen works better for tooth pain than paracetamol alone.',
        why: 'Dental abscesses cause severe, debilitating pain. The inflammation around the tooth root is what creates the throbbing — ibuprofen reduces this directly.',
        drug: 'Ibuprofen + Paracetamol',
        dose: '400 mg + 500 mg',
        route: 'by mouth',
        frequency: 'alternating every 3 hours',
        alternatives: [
          { when: 'Stomach problems (ulcer history)', instead: 'Skip ibuprofen. Use Paracetamol 1 g every 6 hours only.' },
        ],
        citationIds: [],
      },
      {
        id: 'da3',
        action: 'Salt water rinse to clean the area',
        detail: 'One teaspoon of salt in a glass of warm water. Rinse gently for 30 seconds three times a day (morning, midday, bedtime). Spit out — do not swallow. Do not rinse aggressively as this can dislodge any protective clot.',
        why: 'Salt water is mildly antiseptic and draws fluid out of inflamed tissue, reducing swelling around the tooth.',
        alternatives: [{ when: 'No salt', instead: 'Plain warm water rinse — less effective but better than nothing.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['Swelling below the chin or floor of the mouth', 'Difficulty swallowing or breathing', 'Fever above 38.5°C with worsening facial swelling', 'Cannot open the mouth more than 1 cm'],
    manageOnboardIf: ['Abscess with swelling inside mouth only, antibiotics started, pain controlled, no fever above 38°C'],
    citationIds: [],
    reasoning: 'Dental abscesses can spread to the airway (Ludwig\'s angina) — a life-threatening emergency. Early antibiotics and airway monitoring are critical.',
  },
];

export const FALLBACK_SCENARIOS_POLAR: Scenario[] = [
  ...FALLBACK_SCENARIOS_OFFSHORE.slice(0, 5).map((s) => ({
    ...s,
    likelihoodPercent: Math.max(4, Math.round(s.likelihoodPercent * 0.5)),
  })),
  {
    id: 'severe_cold',
    condition: 'Severe hypothermia',
    shortHeadline: 'Dangerously cold body',
    layExplanation: 'The body core temperature has dropped dangerously low. Without rewarming, the heart can stop.',
    category: 'other',
    likelihoodPercent: 22,
    timeAction: TA.HELI_2H,
    regions: ['general', 'skin_general'],
    triggerSymptoms: ['shivering stopped', 'confusion', 'pale blue skin', 'slow pulse', 'slow shallow breathing'],
    yesNoQuestions: [
      'Have they been exposed to extreme cold for hours?',
      'Have they stopped shivering even though they are still very cold?',
      'Are they confused, sleepy, or hard to wake?',
      'Does their skin look pale or blue?',
      'Is their breathing slow and shallow?',
    ],
    tieBreakers: ['Any signs of cardiac arrest (no pulse, no breathing)? (Yes = start CPR — never declare dead until warm and dead)'],
    diagnosticSteps: ['Use the low-reading thermometer', 'Watch heart rhythm on LIFEPAK 15', 'Recheck every 5 minutes'],
    treatment: [
      {
        id: 'sc1',
        action: 'Get them out of the cold — gentle handling',
        detail: 'Carry them, do not let them walk. Roll them onto a stretcher with as little jolting as possible. Move slowly and smoothly into the medical bay.',
        why: 'A cold heart is electrically fragile — rough movement can trigger ventricular fibrillation. Smooth, slow movements only.',
        alternatives: [{ when: 'They are conscious and able to help themselves', instead: 'Still ask them to move slowly and avoid sudden movements. Support them as they walk.' }],
        citationIds: [],
      },
      {
        id: 'sc2',
        action: 'Active warming — Bair Hugger plus warm IV fluids',
        detail:
          'Get the Bair Hugger from the medical bay closet. Place the blue inflatable blanket over their torso and head (not arms/legs yet). Turn the heater unit on. Then start warm IV fluids: take a Hartmann\'s bag, drop into a basin of 42°C water for 5 minutes before hanging.',
        professionalNotes: 'Active external + internal rewarming. Avoid limb warming until core temp > 32°C (afterdrop risk).',
        why: 'External warming alone is too slow at this depth of cold. Warmed IV fluids carry heat directly to the core. Warming the torso first prevents "afterdrop" — cold blood from the limbs flushing back to the heart.',
        diagram: 'iv_acf',
        alternatives: [
          { when: 'No Bair Hugger', instead: 'Pile every dry blanket you have. Place hot water bottles wrapped in cloth at the armpits and groin (NOT directly on skin — burn risk).' },
        ],
        citationIds: [],
      },
      {
        id: 'sc3',
        action: 'Warm humidified oxygen by mask',
        detail: 'Run the oxygen cylinder through a humidifier bottle warmed in a water bath at 42°C. Mask on at 10-15 L/min.',
        why: 'The lungs are a huge surface area — warm humid air rewarms the body from inside out.',
        diagram: 'neb_mask',
        alternatives: [{ when: 'No humidifier', instead: 'Use dry oxygen at 10-15 L/min. Less effective for rewarming but still useful for oxygen delivery.' }],
        citationIds: [],
      },
      {
        id: 'sc4',
        action: 'Warm IV fluid bolus',
        detail: 'Push 500 mL of the warmed Hartmann\'s over 15 minutes. Re-check core temperature. Repeat if still below 34°C.',
        why: 'Cold dehydrates by causing fluid to shift out of the blood vessels. Warmed fluid replaces volume and adds heat.',
        diagram: 'iv_acf',
        drug: "Hartmann's solution (warmed to 42°C)",
        dose: '500 mL',
        route: 'IV drip into a vein',
        frequency: 'over 15 minutes, repeat as needed',
        alternatives: [{ when: 'No IV access', instead: 'Warm drinks by mouth if they are awake enough to swallow. Sugar + warm water is ideal.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['Core temperature below 32°C', 'Any abnormal heart rhythm', 'Not warming up after 1 hour'],
    manageOnboardIf: ['Mild hypothermia (32-35°C) and they are still alert'],
    citationIds: [],
    reasoning: 'In polar settings, hypothermia is the dominant risk.',
  },
  {
    id: 'frostbite',
    condition: 'Frostbite (deep)',
    shortHeadline: 'Frozen tissue',
    category: 'other',
    layExplanation: 'Skin and deeper tissue have frozen. Without careful rewarming, the tissue will die.',
    likelihoodPercent: 18,
    timeAction: TA.SHORE_24H,
    regions: ['hand_right', 'hand_left', 'foot_right', 'foot_left', 'ear_right', 'ear_left', 'mouth_jaw'],
    triggerSymptoms: ['pale or waxy fingers/toes/ears', 'no feeling in the area', 'hard or wooden to touch', 'blisters when warmed'],
    yesNoQuestions: [
      'Has a finger, toe, ear, or nose been exposed to extreme cold?',
      'Does the affected area look pale, waxy, or white?',
      'Is the area hard or wooden to touch?',
      'Has feeling been lost in the affected area?',
      'Could the area refreeze before evacuation?',
    ],
    diagnosticSteps: ['Assess depth', 'Photograph each digit', 'Check core temperature first'],
    treatment: [
      {
        id: 'fr1',
        action: 'DO NOT rewarm if it could refreeze',
        detail: 'If they have to go back outside or evacuation has not arrived: leave it frozen. Wrap loosely in dry cloth to protect it from impact. Refreezing after rewarming is catastrophic — much worse than staying frozen.',
        why: 'A rewarm-then-refreeze cycle creates ice crystals inside cells and shreds them on the second freeze. Tissue that would have survived staying frozen dies after the cycle.',
        alternatives: [{ when: 'Indoors and confirmed staying warm', instead: 'Proceed to rewarming in 40°C water (next step).' }],
        citationIds: [],
      },
      {
        id: 'fr2',
        action: 'Rapid rewarming in 40°C water bath',
        detail:
          'Fill a clean basin with water and check the temperature with a thermometer — exactly 40°C (104°F). Submerge the frozen part for 30 minutes. Add fresh warm water as it cools. Do NOT rub the tissue — ice crystals will shred it.',
        professionalNotes: 'Water 37-39°C × 15-30 min until pliable and red/purple. Do not delay for transport.',
        why: 'Slow rewarming causes more tissue damage than rapid. The water must be exactly the right temperature: hotter burns, cooler is too slow.',
        alternatives: [
          { when: 'No thermometer for the bath', instead: 'Use the wrist test — water should feel warm but comfortable, not hot.' },
          { when: 'Cannot submerge (e.g. nose)', instead: 'Apply warm wet cloths, replaced every 2 minutes for 30 minutes.' },
        ],
        citationIds: [],
      },
      {
        id: 'fr3',
        action: 'Strong pain relief — rewarming is very painful',
        detail: 'Give Morphine 5 mg into a vein 10 minutes BEFORE you start rewarming, then every 4 hours as needed.',
        why: 'Rewarming frostbite is excruciating. Pre-medicating means they can tolerate the full 30 minutes — incomplete rewarming = more tissue loss.',
        diagram: 'iv_acf',
        drug: 'Morphine injection',
        dose: '5 mg',
        route: 'into a vein',
        frequency: 'every 4 hours as needed',
        alternatives: [{ when: 'No IV', instead: 'Morphine 10 mg into the muscle of the thigh, 15 minutes before rewarming.' }],
        citationIds: [],
      },
      {
        id: 'fr4',
        action: 'Iloprost infusion for deep frostbite within 48h',
        detail:
          'If the frostbite is deep (hard, white, no sensation) and started less than 48 hours ago: mix Iloprost ampoules into a 250 mL saline bag at 0.5 ng/kg/min. Run for 6 hours per day for up to 5 days. The pump rate calculation depends on the person\'s weight — write the formula on the bag.',
        professionalNotes: 'Iloprost 0.5-2 ng/kg/min IV over 6 hours daily × 5 days. Reduces amputation rate in stage 3-4 frostbite.',
        why: 'Iloprost opens the tiny blood vessels in the frostbitten tissue and stops further clotting. Studies show it can save digits that would otherwise be amputated.',
        diagram: 'iv_acf',
        drug: 'Iloprost injection',
        dose: '0.5-2 ng/kg/min',
        route: 'IV infusion',
        frequency: '6 hours/day for 5 days',
        alternatives: [
          { when: 'No iloprost in stock', instead: 'Skip — there is no good substitute. Standard wound care and evacuation for surgical assessment.' },
          { when: 'Frostbite more than 48 hours old', instead: 'Skip iloprost — beyond the effective window. Move to wound care.' },
        ],
        citationIds: [],
      },
      {
        id: 'fr5',
        action: 'Aloe vera, non-stick dressing, tetanus check',
        detail: 'After rewarming: dab thin layer of aloe vera gel on the affected skin. Cover with non-stick dressing. Check tetanus vaccination status — boost if more than 10 years.',
        why: 'Aloe vera reduces inflammation in frostbite blisters and the dressing prevents bacterial infection of the damaged tissue.',
        alternatives: [{ when: 'No aloe vera', instead: 'Use a thin layer of petroleum jelly. Skip if neither.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['Deep frostbite of any digit', 'Tissue does not turn pink after rewarming', 'Signs of infection'],
    manageOnboardIf: ['Only mild frostnip that warms quickly'],
    citationIds: [],
    reasoning: 'Rapid rewarming is the cornerstone.',
  },
  {
    id: 'flu_outbreak',
    condition: 'Flu outbreak',
    shortHeadline: 'Crew flu outbreak',
    category: 'infection',
    layExplanation: 'A respiratory virus is spreading through the station crew.',
    likelihoodPercent: 12,
    timeAction: TA.ONBOARD,
    regions: ['breathing', 'general'],
    triggerSymptoms: ['fever in multiple crew', 'cough', 'aches', 'tiredness', 'sometimes vomiting'],
    yesNoQuestions: [
      'Are more than one crew member sick with similar symptoms?',
      'Do they have a fever?',
      'Are they coughing?',
      'Do they have aches all over and feel very tired?',
      'Did their symptoms start in the last 48 hours?',
    ],
    diagnosticSteps: ['Check temperature on each symptomatic person', 'Isolate first cases', 'Note when symptoms started'],
    treatment: [
      {
        id: 'fl1',
        action: 'Antiviral if started within 48h of symptoms',
        detail: 'Give Oseltamivir 75 mg capsule by mouth, twice a day, for 5 days. From Drawer 6 (green label).',
        why: 'Oseltamivir works only if started within 48 hours of symptoms. After that the virus has replicated too far for the medicine to help.',
        diagram: 'po_oral',
        drug: 'Oseltamivir capsules',
        dose: '75 mg',
        route: 'by mouth',
        frequency: 'twice a day for 5 days',
        alternatives: [
          { when: 'Symptoms started more than 48 hours ago', instead: 'Skip oseltamivir. Focus on symptom relief — paracetamol, fluids, rest.' },
          STD_ALT_DRUG_MISSING,
        ],
        citationIds: [],
      },
      {
        id: 'fl2',
        action: 'Symptom relief — paracetamol and fluids',
        detail: 'Paracetamol 1 g (two 500 mg tablets) every 6 hours. Drink 2-3 litres of water per day.',
        why: 'Paracetamol brings the fever and aches down. Hydration thins the mucus and prevents dehydration from the fever.',
        diagram: 'po_oral',
        drug: 'Paracetamol tablets',
        dose: '1 g',
        route: 'by mouth',
        frequency: 'every 6 hours',
        alternatives: [{ when: 'Vomiting', instead: 'Try sips of water with electrolyte powder. Hold paracetamol until they can keep liquids down.' }],
        citationIds: [],
      },
      {
        id: 'fl3',
        action: 'Isolate sick crew together, masks on everyone',
        detail: 'Move all symptomatic crew to a single dorm with the door closed. Healthy crew wear masks when entering. Sick crew wear masks at all times. Hand sanitiser at the door.',
        why: 'Confined polar stations have very high transmission. Cohort isolation prevents the entire crew from getting sick simultaneously — keeping at least some people well enough to operate the station.',
        alternatives: [{ when: 'Only one room is heated', instead: 'Keep sick crew at one end with a sheet partition. Better than nothing.' }],
        citationIds: [],
      },
    ],
    evacuateIf: ['Pneumonia signs (SpO2 below 94%)', 'Fever beyond 5 days', 'Confusion or severe dehydration'],
    manageOnboardIf: ['Uncomplicated flu in an otherwise healthy person'],
    citationIds: [],
    reasoning: 'Confined station = high transmission.',
  },
];

export function getFallbackScenarios(preset: 'offshore' | 'polar'): Scenario[] {
  return preset === 'polar' ? FALLBACK_SCENARIOS_POLAR : FALLBACK_SCENARIOS_OFFSHORE;
}

/**
 * Defensive enrichment: if the LLM (or a future fallback) ever omits why or
 * alternatives, fill with a sensible default so the user never sees an empty modal.
 */
export function enrichStep(step: TreatmentStep, scenarioCondition: string): TreatmentStep {
  return {
    ...step,
    why: step.why ?? defaultWhy(step, scenarioCondition),
    alternatives: step.alternatives && step.alternatives.length > 0 ? step.alternatives : defaultAlternatives(step),
  };
}

function defaultWhy(step: TreatmentStep, condition: string): string {
  if (step.drug?.toLowerCase().includes('paracetamol')) return 'Brings fever and mild-to-moderate pain down. Works through a different pathway than ibuprofen so they stack safely.';
  if (step.drug?.toLowerCase().includes('morphine')) return 'Strong pain killer for severe pain. Works on opioid receptors in the brain and spinal cord.';
  if (step.drug?.toLowerCase().includes('saline') || step.drug?.toLowerCase().includes("hartmann")) return 'Replaces fluid the body has lost and keeps blood pressure up while the rest of the treatment works.';
  return `Part of the deterministic protocol for ${condition.toLowerCase()}, compiled at install time from the onboard medical guide and evidence sources.`;
}

function defaultAlternatives(step: TreatmentStep): TreatmentStep['alternatives'] {
  const alts: NonNullable<TreatmentStep['alternatives']> = [];
  if (step.drug) {
    alts.push({ when: 'The drug is not in stock', instead: 'Check the locked cabinet (ask the captain) and the secondary supply drawer. If still nothing, call the on-shore physician at the next sync window.' });
  }
  if (step.route?.includes('vein')) {
    alts.push({ when: 'You cannot get a needle into a vein', instead: 'Inject the same dose into the outside of the thigh muscle instead. Slower onset, same effect.' });
  }
  if (alts.length === 0) {
    alts.push({ when: 'You cannot do this step physically', instead: 'Mark it done with a note explaining what blocked you. The on-shore physician will adjust the plan at the next sync window.' });
  }
  return alts;
}

// === Answer-driven ranking — runtime, no LLM ===

export type Answer = 'yes' | 'no' | 'skip';

export type QuestionEntry = {
  id: string;
  text: string;
  scenarioIds: string[];
  categoryBoost?: string[];
};

export function buildQuestionPool(
  scenarios: Scenario[],
  regions: import('../types').BodyRegion[]
): QuestionEntry[] {
  const pool: QuestionEntry[] = [
    { id: 'q_awake', text: 'Are they awake and able to talk normally?', scenarioIds: [], categoryBoost: ['cardiovascular', 'neuro', 'respiratory', 'other'] },
    { id: 'q_breathing', text: 'Are they having trouble breathing right now?', scenarioIds: [], categoryBoost: ['cardiovascular', 'respiratory'] },
    { id: 'q_bleeding', text: 'Is there visible heavy bleeding right now?', scenarioIds: [], categoryBoost: ['trauma'] },
  ];

  const relevant =
    regions.length === 0
      ? scenarios
      : scenarios.filter((s) => s.regions?.some((r) => regions.includes(r)) || s.regions?.includes('general'));

  const seen = new Map<string, QuestionEntry>();
  for (const s of relevant) {
    const qs = s.yesNoQuestions ?? [];
    for (const q of qs) {
      const key = normalize(q);
      const existing = seen.get(key);
      if (existing) existing.scenarioIds.push(s.id);
      else seen.set(key, { id: `q_${key.slice(0, 30).replace(/\s+/g, '_')}`, text: q, scenarioIds: [s.id] });
    }
  }
  const specific = Array.from(seen.values()).sort((a, b) => b.scenarioIds.length - a.scenarioIds.length);
  return [...pool, ...specific].slice(0, 8);
}

export function rankFromAnswers(
  scenarios: Scenario[],
  regions: import('../types').BodyRegion[],
  answers: Record<string, Answer>,
  questionPool: QuestionEntry[]
): Array<{ scenario: Scenario; probability: number; matchCount: number; reasoning: string }> {
  const scored = scenarios.map((s) => {
    let score = s.likelihoodPercent / 100;
    const matches: string[] = [];
    let matchCount = 0;

    if (regions.length > 0) {
      const regionHits = s.regions?.filter((r) => regions.includes(r)).length ?? 0;
      if (regionHits > 0) {
        score *= 2.5 + regionHits * 0.6;
        matches.push(`${regionHits} location match${regionHits > 1 ? 'es' : ''}`);
      } else {
        score *= 0.5;
      }
    }

    for (const q of questionPool) {
      const ans = answers[q.id];
      if (!ans || ans === 'skip') continue;
      const linked = q.scenarioIds.includes(s.id);
      const categoryHit = q.categoryBoost?.includes(s.category ?? '');
      if (ans === 'yes') {
        if (linked) { score *= 1.9; matches.push(`said yes to "${q.text}"`); matchCount++; }
        else if (categoryHit) score *= 1.25;
      } else if (ans === 'no') {
        if (linked) score *= 0.45;
        else if (categoryHit) score *= 0.85;
      }
    }

    const reasoning = matches.length ? `Matches because ${matches.slice(0, 3).join('; ')}.` : 'Baseline likelihood.';
    return { scenario: s, score, matchCount, reasoning };
  });

  const total = scored.reduce((sum, x) => sum + x.score, 0) || 1;
  return scored
    .map((x) => ({ scenario: x.scenario, probability: x.score / total, matchCount: x.matchCount, reasoning: x.reasoning }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// === Dose-schedule math (when-help-arrives → timed checklist) ===

export type DoseSchedule = {
  step: TreatmentStep;
  /** Total doses to give before help arrives. */
  totalDoses: number;
  /** Hours between doses, or null for single/PRN. */
  intervalHours: number | null;
  /** Specific timestamps for each dose. */
  doseTimes: Date[];
  /** Plain-English summary. */
  summary: string;
};

/**
 * Parse a plain-English frequency like "every 6 hours" / "twice a day" / "single dose"
 * into hours-between-doses.
 */
export function parseFrequencyHours(freq: string | null | undefined): number | null {
  if (!freq) return null;
  const f = freq.toLowerCase();
  if (/single dose|once$|now$|stat/.test(f)) return null;
  const everyMatch = f.match(/every\s+(\d+(?:\.\d+)?)\s*(hour|hr|h)/);
  if (everyMatch) return parseFloat(everyMatch[1]);
  const minutesMatch = f.match(/every\s+(\d+)\s*(minute|min)/);
  if (minutesMatch) return parseFloat(minutesMatch[1]) / 60;
  if (/three times a day|tds|tid/.test(f)) return 8;
  if (/four times a day|qds|qid/.test(f)) return 6;
  if (/twice a day|bd|bid/.test(f)) return 12;
  if (/once a day|od|daily|qd/.test(f)) return 24;
  return null;
}

/**
 * Build the timed dose schedule for a scenario given when help is expected.
 * helpInHours = how many hours from now until evacuation arrives.
 */
export function buildDoseSchedule(scenario: Scenario, helpInHours: number, startedAt: Date = new Date()): DoseSchedule[] {
  const schedules: DoseSchedule[] = [];
  for (const step of scenario.treatment) {
    const intervalHours = parseFrequencyHours(step.frequency);
    if (!step.drug && !step.frequency) continue; // skip non-drug procedural steps with no recurrence
    if (intervalHours === null) {
      schedules.push({
        step,
        totalDoses: step.drug ? 1 : 0,
        intervalHours: null,
        doseTimes: step.drug ? [startedAt] : [],
        summary: step.drug ? 'One dose now' : 'One-off action',
      });
      continue;
    }
    // First dose right now, then at each interval up to helpInHours
    const doseTimes: Date[] = [];
    for (let h = 0; h <= helpInHours; h += intervalHours) {
      doseTimes.push(new Date(startedAt.getTime() + h * 3600_000));
    }
    schedules.push({
      step,
      totalDoses: doseTimes.length,
      intervalHours,
      doseTimes,
      summary: `${doseTimes.length} dose${doseTimes.length > 1 ? 's' : ''} every ${intervalHours} h${doseTimes.length === 0 ? ' — help arrives before next dose' : ''}`,
    });
  }
  return schedules;
}

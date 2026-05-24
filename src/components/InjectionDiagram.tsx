import type { DiagramKind } from '../types';

type Props = { kind: DiagramKind };

/**
 * SVG diagrams for each technique. Aimed at a non-clinician: shows the spot,
 * the angle, depth, and what to do with the needle / probe. Captions are
 * deliberately simple.
 */
export function InjectionDiagram({ kind }: Props) {
  switch (kind) {
    case 'im_deltoid':
      return <DeltoidDiagram />;
    case 'im_thigh':
      return <ThighDiagram />;
    case 'im_gluteal':
      return <GlutealDiagram />;
    case 'iv_acf':
      return <AcfDiagram />;
    case 'iv_hand':
      return <HandIvDiagram />;
    case 'sl_under_tongue':
      return <SublingualDiagram />;
    case 'po_oral':
      return <OralDiagram />;
    case 'neb_mask':
      return <MaskDiagram />;
    case 'splint_arm':
      return <ArmSplintDiagram />;
    case 'splint_leg':
      return <LegSplintDiagram />;
    case 'direct_pressure':
      return <PressureDiagram />;
    case 'tourniquet':
      return <TourniquetDiagram />;
    case 'cool_burn':
      return <CoolBurnDiagram />;
    case 'recovery_position':
      return <RecoveryPositionDiagram />;
    default:
      return null;
  }
}

const FRAME = 'bg-rig-bg/60 border border-rig-dim/30 rounded p-3';
const CAP = 'text-[10px] text-rig-dim font-mono mt-2 leading-relaxed';
const LABEL = 'fill-[#fb923c] font-mono';
const BODY = 'fill-[#1f2937] stroke-[#6b7280]';

// ============ IM DELTOID ============
function DeltoidDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 220 200" className="w-full">
        {/* shoulder + upper arm cross-section */}
        <path d="M 50 30 Q 110 10 170 30 L 170 180 Q 110 195 50 180 Z" className={BODY} strokeWidth="1.2" />
        {/* deltoid muscle highlight */}
        <ellipse cx="110" cy="70" rx="40" ry="22" fill="#fb923c" fillOpacity="0.18" stroke="#fb923c" strokeWidth="1" strokeDasharray="3 2" />
        {/* injection spot */}
        <circle cx="110" cy="70" r="4" fill="#fb923c">
          <animate attributeName="r" values="3;6;3" dur="1.4s" repeatCount="indefinite" />
        </circle>
        {/* needle at 90 degrees */}
        <line x1="110" y1="20" x2="110" y2="70" stroke="#22d3ee" strokeWidth="2" />
        <polygon points="110,68 106,75 114,75" fill="#22d3ee" />
        <text x="120" y="35" className={LABEL} fontSize="10">90°</text>
        <text x="155" y="75" className={LABEL} fontSize="10">deltoid</text>
        <line x1="150" y1="73" x2="135" y2="68" stroke="#fb923c" strokeWidth="0.8" />
        {/* avoid zone (acromion) */}
        <rect x="80" y="20" width="60" height="14" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeDasharray="2 2" />
        <text x="82" y="18" fill="#ef4444" fontSize="8" fontFamily="ui-monospace">stay 3 finger-widths below the top of the shoulder</text>
      </svg>
      <p className={CAP}>
        Find the bony bump at the very top of the shoulder. Go 3 finger-widths down from it. That square is the deltoid muscle. Push the needle in at a right angle (90°), all the way to the hub.
      </p>
    </div>
  );
}

// ============ IM THIGH ============
function ThighDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 220 220" className="w-full">
        {/* thigh from the side */}
        <rect x="60" y="20" width="100" height="180" rx="20" className={BODY} strokeWidth="1.2" />
        {/* outer thigh strip (vastus lateralis) */}
        <rect x="62" y="40" width="20" height="140" fill="#fb923c" fillOpacity="0.18" stroke="#fb923c" strokeWidth="1" strokeDasharray="3 2" />
        {/* hip and knee markers */}
        <line x1="50" y1="30" x2="170" y2="30" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2 2" />
        <text x="172" y="33" fill="#9ca3af" fontSize="8" fontFamily="ui-monospace">hip</text>
        <line x1="50" y1="190" x2="170" y2="190" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2 2" />
        <text x="172" y="193" fill="#9ca3af" fontSize="8" fontFamily="ui-monospace">knee</text>
        {/* injection spot — middle third, outer thigh */}
        <circle cx="72" cy="110" r="5" fill="#fb923c">
          <animate attributeName="r" values="4;8;4" dur="1.4s" repeatCount="indefinite" />
        </circle>
        {/* needle */}
        <line x1="20" y1="110" x2="72" y2="110" stroke="#22d3ee" strokeWidth="2" />
        <polygon points="70,110 64,106 64,114" fill="#22d3ee" />
        <text x="22" y="105" className={LABEL} fontSize="10">90°</text>
        <text x="100" y="115" className={LABEL} fontSize="10">outer thigh — middle third</text>
      </svg>
      <p className={CAP}>
        Divide the outer side of the thigh into thirds (hip to knee). Aim for the middle third, on the outside (where you would put your hand if you put it on your hip and slid down). Needle in at 90°, all the way to the hub. Safest IM site — no big nerves or vessels.
      </p>
    </div>
  );
}

// ============ IM GLUTEAL ============
function GlutealDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 200" className="w-full">
        <path d="M 30 60 Q 120 30 210 60 L 210 180 Q 120 200 30 180 Z" className={BODY} strokeWidth="1.2" />
        {/* upper-outer quadrant highlight */}
        <rect x="155" y="65" width="55" height="55" fill="#fb923c" fillOpacity="0.18" stroke="#fb923c" strokeDasharray="3 2" />
        <line x1="120" y1="60" x2="120" y2="180" stroke="#9ca3af" strokeWidth="0.6" strokeDasharray="2 2" />
        <line x1="30" y1="120" x2="210" y2="120" stroke="#9ca3af" strokeWidth="0.6" strokeDasharray="2 2" />
        <circle cx="183" cy="92" r="5" fill="#fb923c">
          <animate attributeName="r" values="4;8;4" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <text x="160" y="58" className={LABEL} fontSize="10">upper outer quadrant only</text>
      </svg>
      <p className={CAP}>
        Imagine the buttock divided into 4 quarters. The injection goes ONLY in the upper-outer quarter (top, away from the spine). The big sciatic nerve runs through the other quarters — wrong spot = nerve damage.
      </p>
    </div>
  );
}

// ============ IV ACF ============
function AcfDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 260 180" className="w-full">
        {/* forearm + elbow */}
        <path d="M 20 60 Q 50 50 120 60 L 240 80 L 240 110 L 120 110 Q 50 100 20 90 Z" className={BODY} strokeWidth="1.2" />
        {/* veins */}
        <path d="M 60 75 Q 100 85 150 80 Q 200 80 230 95" stroke="#3b82f6" strokeWidth="2.5" fill="none" />
        <path d="M 60 90 Q 100 92 140 95" stroke="#3b82f6" strokeWidth="1.8" fill="none" />
        <text x="155" y="74" fill="#3b82f6" fontSize="9" fontFamily="ui-monospace">cephalic vein</text>
        <text x="62" y="105" fill="#3b82f6" fontSize="9" fontFamily="ui-monospace">basilic vein</text>
        {/* elbow crease */}
        <line x1="135" y1="55" x2="135" y2="115" stroke="#9ca3af" strokeWidth="0.6" strokeDasharray="2 2" />
        <text x="140" y="48" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace">elbow crease</text>
        {/* cannula */}
        <line x1="90" y1="40" x2="155" y2="78" stroke="#22d3ee" strokeWidth="2.5" />
        <polygon points="155,78 148,72 148,82" fill="#22d3ee" />
        <text x="80" y="35" className={LABEL} fontSize="10">15–30° angle, bevel up</text>
      </svg>
      <p className={CAP}>
        Look at the bend of the elbow — there are usually 1-2 blue lines visible (veins). Apply the tourniquet 5 cm above. Wipe with alcohol. Hold the cannula at a shallow angle (15-30°) with the sharp side (bevel) facing up. Push slowly until you see a flash of blood, then lower the angle to almost flat and slide the plastic tube off the needle into the vein.
      </p>
    </div>
  );
}

function HandIvDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 260 160" className="w-full">
        <path d="M 50 30 L 200 30 L 220 70 L 220 120 L 50 120 Z" className={BODY} strokeWidth="1.2" />
        <path d="M 70 75 Q 130 75 200 85" stroke="#3b82f6" strokeWidth="2" fill="none" />
        <path d="M 90 95 Q 140 95 195 100" stroke="#3b82f6" strokeWidth="1.6" fill="none" />
        <circle cx="135" cy="78" r="4" fill="#fb923c">
          <animate attributeName="r" values="3;6;3" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <line x1="80" y1="40" x2="135" y2="78" stroke="#22d3ee" strokeWidth="2.5" />
        <polygon points="135,78 128,72 128,82" fill="#22d3ee" />
        <text x="70" y="35" className={LABEL} fontSize="10">15° angle</text>
      </svg>
      <p className={CAP}>
        Back of the hand — many small visible veins. Smaller veins, smaller cannula (pink or blue). Same technique: shallow angle, bevel up, watch for the blood flash.
      </p>
    </div>
  );
}

// ============ SUBLINGUAL ============
function SublingualDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 140" className="w-full">
        {/* open mouth */}
        <ellipse cx="120" cy="70" rx="80" ry="50" className={BODY} strokeWidth="1.2" />
        <ellipse cx="120" cy="80" rx="50" ry="22" fill="#ef4444" fillOpacity="0.25" stroke="#ef4444" />
        {/* tongue */}
        <ellipse cx="120" cy="78" rx="38" ry="14" fill="#fb923c" fillOpacity="0.4" stroke="#fb923c" />
        <text x="105" y="83" fill="#fb923c" fontSize="9" fontFamily="ui-monospace" fontWeight="bold">tongue</text>
        {/* underside arrow */}
        <line x1="120" y1="94" x2="120" y2="115" stroke="#22d3ee" strokeWidth="2" />
        <polygon points="120,94 115,100 125,100" fill="#22d3ee" />
        <text x="130" y="110" className={LABEL} fontSize="10">spray here — UNDER tongue</text>
      </svg>
      <p className={CAP}>
        Have them lift their tongue. The underside is full of tiny blood vessels — medicine sprayed there enters the bloodstream in seconds. Keep the spray nozzle close to (not touching) the floor of the mouth. One press = one dose. Have them keep the tongue lifted for 10 seconds after.
      </p>
    </div>
  );
}

// ============ ORAL ============
function OralDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 130" className="w-full">
        <ellipse cx="120" cy="65" rx="80" ry="45" className={BODY} strokeWidth="1.2" />
        <ellipse cx="120" cy="80" rx="40" ry="14" fill="#ef4444" fillOpacity="0.2" />
        {/* tablet */}
        <circle cx="120" cy="60" r="8" fill="#e5e7eb" stroke="#9ca3af" />
        <text x="116" y="63" fill="#1f2937" fontSize="7" fontFamily="ui-monospace">RX</text>
        {/* water glass */}
        <rect x="190" y="40" width="30" height="50" rx="3" fill="#3b82f6" fillOpacity="0.3" stroke="#3b82f6" />
        <text x="190" y="35" fill="#3b82f6" fontSize="9" fontFamily="ui-monospace">water</text>
      </svg>
      <p className={CAP}>
        Place the tablet on the back third of the tongue. Sip water, swallow. Sit them upright for 10 minutes after to make sure it goes down. If they cannot swallow whole tablets, you can crush in a spoon of jam or yogurt — most tablets are fine, but check with the on-shore physician for capsules.
      </p>
    </div>
  );
}

// ============ NEB MASK ============
function MaskDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 240 180" className="w-full">
        {/* face */}
        <circle cx="120" cy="80" r="50" className={BODY} strokeWidth="1.2" />
        {/* mask */}
        <ellipse cx="120" cy="95" rx="44" ry="32" fill="#9ca3af" fillOpacity="0.25" stroke="#9ca3af" strokeWidth="1.5" />
        {/* tubing */}
        <path d="M 120 130 Q 140 150 180 160" stroke="#22d3ee" strokeWidth="2" fill="none" />
        <text x="170" y="158" className={LABEL} fontSize="9">to nebuliser</text>
        {/* mist */}
        <circle cx="120" cy="85" r="2" fill="#a78bfa" />
        <circle cx="115" cy="92" r="1.5" fill="#a78bfa" />
        <circle cx="128" cy="92" r="2" fill="#a78bfa" />
        <circle cx="120" cy="98" r="1.5" fill="#a78bfa" />
      </svg>
      <p className={CAP}>
        Pour the nebule into the mask reservoir. Connect to the oxygen cylinder, flow 6-8 L/min so you see a continuous mist. Have them breathe normally — slow in, slow out. Whole dose takes 10-15 minutes. Keep going until the mist stops.
      </p>
    </div>
  );
}

// ============ ARM SPLINT ============
function ArmSplintDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 280 180" className="w-full">
        {/* arm with break */}
        <path d="M 30 60 Q 50 50 140 60 L 250 80 L 250 110 L 140 110 Q 50 100 30 90 Z" className={BODY} strokeWidth="1.2" />
        <line x1="130" y1="65" x2="135" y2="105" stroke="#ef4444" strokeWidth="3" strokeDasharray="3 2" />
        <text x="125" y="58" fill="#ef4444" fontSize="9" fontFamily="ui-monospace">break</text>
        {/* splint board */}
        <rect x="40" y="48" width="200" height="8" fill="#a78bfa" fillOpacity="0.35" stroke="#a78bfa" />
        <text x="120" y="44" fill="#a78bfa" fontSize="9" fontFamily="ui-monospace">rigid splint above</text>
        {/* straps */}
        <line x1="80" y1="40" x2="80" y2="118" stroke="#fb923c" strokeWidth="2" />
        <line x1="190" y1="40" x2="190" y2="118" stroke="#fb923c" strokeWidth="2" />
        <text x="85" y="135" className={LABEL} fontSize="9">strap above break</text>
        <text x="160" y="135" className={LABEL} fontSize="9">strap below break</text>
        {/* fingers visible */}
        <circle cx="258" cy="95" r="6" fill="#fbbf24" stroke="#9ca3af" />
        <text x="252" y="145" fill="#22d3ee" fontSize="9" fontFamily="ui-monospace">leave fingers visible</text>
      </svg>
      <p className={CAP}>
        Splint goes along the limb, padded with cloth. Tie ONE strap above the break and ONE below — never directly on the break. The strap should be firm but not cut off circulation (two fingers should slide under). Leave fingers visible so you can keep checking colour and warmth.
      </p>
    </div>
  );
}

function LegSplintDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 280 200" className="w-full">
        <path d="M 110 20 L 170 20 L 165 180 L 115 180 Z" className={BODY} strokeWidth="1.2" />
        <line x1="115" y1="95" x2="165" y2="100" stroke="#ef4444" strokeWidth="3" strokeDasharray="3 2" />
        <text x="172" y="100" fill="#ef4444" fontSize="9" fontFamily="ui-monospace">break</text>
        <rect x="95" y="20" width="10" height="160" fill="#a78bfa" fillOpacity="0.35" stroke="#a78bfa" />
        <rect x="175" y="20" width="10" height="160" fill="#a78bfa" fillOpacity="0.35" stroke="#a78bfa" />
        <line x1="90" y1="55" x2="190" y2="55" stroke="#fb923c" strokeWidth="2" />
        <line x1="90" y1="140" x2="190" y2="140" stroke="#fb923c" strokeWidth="2" />
        <text x="200" y="58" className={LABEL} fontSize="9">strap above</text>
        <text x="200" y="143" className={LABEL} fontSize="9">strap below</text>
      </svg>
      <p className={CAP}>
        For legs use TWO splints — one on each side. They sandwich the leg so it cannot move sideways. Two straps minimum (above and below the break). Keep toes visible.
      </p>
    </div>
  );
}

function PressureDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 260 180" className="w-full">
        <path d="M 40 60 Q 60 50 150 60 L 250 80 L 250 110 L 150 110 Q 60 100 40 90 Z" className={BODY} strokeWidth="1.2" />
        {/* wound */}
        <path d="M 130 75 L 145 95 L 160 80" stroke="#ef4444" strokeWidth="3" fill="none" />
        {/* gauze */}
        <rect x="115" y="60" width="60" height="50" fill="#e5e7eb" fillOpacity="0.5" stroke="#9ca3af" strokeDasharray="2 2" />
        {/* hands */}
        <circle cx="145" cy="40" r="20" fill="#fb923c" fillOpacity="0.4" stroke="#fb923c" strokeWidth="2" />
        <circle cx="145" cy="40" r="14" fill="#fb923c" fillOpacity="0.6" />
        <text x="135" y="35" className={LABEL} fontSize="10">HANDS</text>
        <text x="20" y="160" fill="#fb923c" fontSize="9" fontFamily="ui-monospace">Press down with body weight. Do not lift to check.</text>
      </svg>
      <p className={CAP}>
        Place gauze (or any clean cloth) directly on the bleeding spot. Press with both hands using your body weight. Do NOT lift to peek — that breaks the clot. Hold for 10 minutes by the clock. If blood soaks through, add more cloth on top.
      </p>
    </div>
  );
}

function TourniquetDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 280 180" className="w-full">
        <path d="M 40 60 Q 60 50 150 60 L 250 80 L 250 110 L 150 110 Q 60 100 40 90 Z" className={BODY} strokeWidth="1.2" />
        {/* wound on lower part of arm */}
        <path d="M 200 80 L 215 100 L 230 85" stroke="#ef4444" strokeWidth="3" fill="none" />
        <text x="200" y="125" fill="#ef4444" fontSize="9" fontFamily="ui-monospace">wound</text>
        {/* tourniquet band — between wound and heart, at least 5cm above */}
        <rect x="100" y="55" width="20" height="50" fill="#ef4444" fillOpacity="0.4" stroke="#ef4444" strokeWidth="2" />
        <text x="80" y="48" fill="#ef4444" fontSize="9" fontFamily="ui-monospace">tourniquet</text>
        {/* arrows showing direction to heart */}
        <line x1="35" y1="75" x2="60" y2="75" stroke="#22d3ee" strokeWidth="2" />
        <polygon points="35,75 42,71 42,79" fill="#22d3ee" />
        <text x="20" y="50" className={LABEL} fontSize="9">toward heart</text>
        {/* windlass */}
        <line x1="105" y1="40" x2="115" y2="50" stroke="#fb923c" strokeWidth="2.5" />
        <text x="120" y="40" className={LABEL} fontSize="9">twist stick</text>
        {/* time label */}
        <rect x="98" y="115" width="50" height="20" fill="#e5e7eb" stroke="#9ca3af" />
        <text x="103" y="128" fill="#1f2937" fontSize="9" fontFamily="ui-monospace">14:32</text>
        <text x="155" y="130" fill="#22d3ee" fontSize="9" fontFamily="ui-monospace">WRITE THE TIME</text>
      </svg>
      <p className={CAP}>
        Place the tourniquet on the limb BETWEEN the wound and the heart, at least 5 cm above the wound. Pull tight, then twist the white stick until bleeding stops. Lock the stick in the clip. WRITE THE TIME on the label — surgeons need to know.
      </p>
    </div>
  );
}

function CoolBurnDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 260 180" className="w-full">
        {/* arm */}
        <path d="M 30 80 Q 60 70 150 80 L 250 95 L 250 120 L 150 120 Q 60 110 30 100 Z" className={BODY} strokeWidth="1.2" />
        {/* burn */}
        <ellipse cx="160" cy="100" rx="35" ry="14" fill="#ef4444" fillOpacity="0.4" stroke="#ef4444" />
        {/* tap + water */}
        <rect x="140" y="20" width="40" height="20" fill="#9ca3af" stroke="#6b7280" />
        <path d="M 160 40 L 158 90 L 162 90 Z" fill="#3b82f6" />
        {/* drops */}
        <circle cx="160" cy="60" r="1.5" fill="#3b82f6" />
        <circle cx="158" cy="70" r="1.5" fill="#3b82f6" />
        <circle cx="162" cy="80" r="1.5" fill="#3b82f6" />
        <text x="20" y="160" fill="#3b82f6" fontSize="9" fontFamily="ui-monospace">Cool water 20 min. Not cold. Not ice.</text>
      </svg>
      <p className={CAP}>
        Run COOL (room temperature) tap water over the burn for a full 20 minutes by the clock. Cold or ice water makes them shiver and lose body heat. Keep the rest of the body wrapped warm — only the burned area gets the cool water.
      </p>
    </div>
  );
}

function RecoveryPositionDiagram() {
  return (
    <div className={FRAME}>
      <svg viewBox="0 0 260 160" className="w-full">
        {/* person on side */}
        <ellipse cx="60" cy="80" rx="22" ry="26" className={BODY} strokeWidth="1.2" />
        <rect x="70" y="60" width="160" height="50" rx="20" className={BODY} strokeWidth="1.2" />
        {/* upper arm bent */}
        <path d="M 90 60 Q 100 30 130 50" stroke="#6b7280" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* upper knee bent */}
        <path d="M 200 110 Q 200 140 220 145" stroke="#6b7280" strokeWidth="8" fill="none" strokeLinecap="round" />
        <text x="20" y="140" fill="#fb923c" fontSize="9" fontFamily="ui-monospace">On side · head tilted back · top knee bent</text>
      </svg>
      <p className={CAP}>
        Roll them onto their side. Bend the top knee 90° so it stops them rolling onto their face. Tilt the head slightly back so the airway stays open. Tuck the lower arm behind. Check every minute that they are still breathing.
      </p>
    </div>
  );
}

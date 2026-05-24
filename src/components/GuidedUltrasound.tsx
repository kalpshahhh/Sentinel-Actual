import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export type UltrasoundFinding =
  | 'no_hydronephrosis'
  | 'mild_hydronephrosis'
  | 'mod_severe_hydronephrosis'
  | 'unclear';

type Props = {
  onConfirm: (finding: UltrasoundFinding, label: string) => void;
  onStepComplete?: (stepIdx: number, label: string) => void;
};

const STEPS = [
  'Put a generous blob of gel on the right side of their back, below the ribs',
  'Hold the probe with the marker pointing toward their head',
  'Look on the screen for a bean-shaped grey object — that is the kidney',
  'Slowly tilt the probe forward and backward to see the whole kidney',
  'Look for any dark space inside the kidney — that means a blockage',
];

export function GuidedUltrasound({ onConfirm, onStepComplete }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) return;
    const id = setTimeout(() => {
      onStepComplete?.(step, STEPS[step]);
      setStep((s) => s + 1);
    }, 800);
    return () => clearTimeout(id);
  }, [step, onStepComplete]);

  return (
    <div className="bg-rig-surface border border-rig-dim/20 rounded-md overflow-hidden">
      <div className="px-5 py-3 border-b border-rig-dim/20 flex items-center gap-2">
        <Activity size={14} className="text-rig-accent" />
        <span className="text-xs uppercase tracking-widest text-rig-text">Ultrasound Scan — Right Kidney</span>
        <span className="ml-auto text-[10px] text-rig-dim font-mono">Butterfly iQ3</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5">
        {/* Body diagram */}
        <div className="bg-rig-bg/60 border border-rig-dim/20 rounded p-4 flex items-center justify-center">
          <BodyDiagram />
        </div>

        {/* Steps + image */}
        <div className="flex flex-col gap-4">
          <ol className="space-y-2">
            {STEPS.map((s, i) => (
              <AnimatePresence key={i}>
                {i <= step && (
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span
                      className={clsx(
                        'shrink-0 w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px]',
                        i < step
                          ? 'bg-rig-ok/20 border-rig-ok text-rig-ok'
                          : 'bg-rig-accent/20 border-rig-accent text-rig-accent'
                      )}
                    >
                      {i < step ? <CheckCircle size={11} /> : i + 1}
                    </span>
                    <span className={i < step ? 'text-rig-dim line-through' : 'text-rig-text'}>{s}</span>
                  </motion.li>
                )}
              </AnimatePresence>
            ))}
          </ol>

          {step >= STEPS.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-rig-bg border border-rig-dim/30 rounded p-2"
            >
              <UltrasoundImage />
              <div className="text-[10px] text-rig-dim font-mono mt-1 flex justify-between">
                <span>RENAL R · SAG</span>
                <span>Depth 12 cm · Gain 60</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Confirmation buttons */}
      {step >= STEPS.length && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="px-5 pb-5"
        >
          <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2">Confirm Finding</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <ConfirmBtn
              onClick={() => onConfirm('no_hydronephrosis', 'No swelling in the kidney')}
              tone="ok"
              icon={<CheckCircle size={14} />}
              label="Kidney looks normal (no dark space)"
            />
            <ConfirmBtn
              onClick={() => onConfirm('mild_hydronephrosis', 'Small amount of swelling')}
              tone="accent"
              icon={<AlertTriangle size={14} />}
              label="A small dark space — slight swelling"
            />
            <ConfirmBtn
              onClick={() => onConfirm('mod_severe_hydronephrosis', 'Severe swelling — likely blockage')}
              tone="critical"
              icon={<AlertTriangle size={14} />}
              label="A clear large dark area — likely blockage"
            />
            <ConfirmBtn
              onClick={() => onConfirm('unclear', 'Could not tell — try again in 30 minutes')}
              tone="dim"
              icon={<RotateCcw size={14} />}
              label="Not sure — try again in 30 min"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ConfirmBtn({
  onClick,
  tone,
  icon,
  label,
}: {
  onClick: () => void;
  tone: 'ok' | 'accent' | 'critical' | 'dim';
  icon: React.ReactNode;
  label: string;
}) {
  const palette = {
    ok: 'bg-rig-ok/15 border-rig-ok/40 text-rig-ok hover:bg-rig-ok/25',
    accent: 'bg-rig-accent/15 border-rig-accent/40 text-rig-accent hover:bg-rig-accent/25',
    critical: 'bg-rig-critical/15 border-rig-critical/40 text-rig-critical hover:bg-rig-critical/25',
    dim: 'bg-rig-surface border-rig-dim/40 text-rig-text hover:bg-rig-bg',
  }[tone];
  return (
    <button onClick={onClick} className={clsx('px-3 py-3 rounded border text-xs text-left flex items-center gap-2', palette)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BodyDiagram() {
  return (
    <svg viewBox="0 0 200 320" width="200" height="320">
      {/* Simplified anterior human silhouette */}
      <g stroke="#6b7280" strokeWidth="1.2" fill="#1f2937">
        {/* head */}
        <circle cx="100" cy="38" r="22" />
        {/* neck */}
        <rect x="92" y="58" width="16" height="14" />
        {/* torso */}
        <path d="M60 75 L140 75 L150 200 L130 240 L70 240 L50 200 Z" />
        {/* arms */}
        <path d="M60 78 L30 160 L40 200" fill="none" />
        <path d="M140 78 L170 160 L160 200" fill="none" />
        {/* legs */}
        <path d="M75 240 L65 320" fill="none" />
        <path d="M125 240 L135 320" fill="none" />
      </g>

      {/* Kidneys (subtle) */}
      <ellipse cx="80" cy="135" rx="8" ry="18" fill="#a78bfa" fillOpacity="0.25" stroke="#a78bfa" strokeOpacity="0.5" />
      <ellipse cx="120" cy="135" rx="8" ry="18" fill="#a78bfa" fillOpacity="0.45" stroke="#a78bfa" strokeOpacity="0.8" />

      {/* Probe placement target on right flank */}
      <g>
        <circle cx="148" cy="138" r="14" fill="none" stroke="#fb923c" strokeWidth="1.5" />
        <circle cx="148" cy="138" r="6" fill="#fb923c" fillOpacity="0.7">
          <animate attributeName="r" values="5;9;5" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <line x1="148" y1="120" x2="148" y2="156" stroke="#fb923c" strokeWidth="1" strokeDasharray="2 2" />
      </g>

      {/* Label */}
      <line x1="155" y1="138" x2="180" y2="118" stroke="#fb923c" strokeWidth="0.8" />
      <text x="155" y="115" fontSize="9" fill="#fb923c" fontFamily="ui-monospace">
        Probe — R flank
      </text>
      <text x="155" y="125" fontSize="7" fill="#fb923c" fontFamily="ui-monospace">
        post-axillary, sag
      </text>

      <line x1="115" y1="135" x2="58" y2="105" stroke="#a78bfa" strokeWidth="0.8" />
      <text x="2" y="100" fontSize="8" fill="#a78bfa" fontFamily="ui-monospace">
        R kidney
      </text>
    </svg>
  );
}

function UltrasoundImage() {
  return (
    <svg viewBox="0 0 320 240" width="100%" preserveAspectRatio="xMidYMid meet" style={{ background: '#000', borderRadius: 2 }}>
      <defs>
        <radialGradient id="usCone" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#666" />
          <stop offset="80%" stopColor="#111" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <radialGradient id="kidneyGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#999" />
          <stop offset="60%" stopColor="#444" />
          <stop offset="100%" stopColor="#222" />
        </radialGradient>
      </defs>

      {/* US cone */}
      <polygon points="160,0 30,240 290,240" fill="url(#usCone)" opacity="0.65" />

      {/* Kidney outline */}
      <ellipse cx="160" cy="130" rx="78" ry="48" fill="url(#kidneyGrad)" opacity="0.85" />
      {/* Hyperechoic capsule */}
      <ellipse cx="160" cy="130" rx="78" ry="48" fill="none" stroke="#dcdcdc" strokeWidth="2" />
      {/* Medullary pyramids */}
      {[-50, -25, 0, 25, 50].map((dx, i) => (
        <ellipse key={i} cx={160 + dx} cy={140} rx="8" ry="14" fill="#222" opacity="0.85" />
      ))}
      {/* Renal sinus — bright fat */}
      <ellipse cx="160" cy="130" rx="34" ry="14" fill="#e5e5e5" opacity="0.7" />

      {/* Caliper measurement */}
      <g stroke="#22d3ee" strokeWidth="1.2" fill="#22d3ee">
        <line x1="82" y1="130" x2="238" y2="130" />
        <text x="160" y="118" fontSize="9" textAnchor="middle" fontFamily="ui-monospace">
          10.4 cm
        </text>
        <circle cx="82" cy="130" r="2.5" />
        <circle cx="238" cy="130" r="2.5" />
      </g>

      {/* Header overlay */}
      <text x="8" y="14" fontSize="9" fill="#9ca3af" fontFamily="ui-monospace">
        BUTTERFLY iQ3
      </text>
      <text x="8" y="26" fontSize="9" fill="#9ca3af" fontFamily="ui-monospace">
        RENAL R · SAG
      </text>
      <text x="312" y="14" fontSize="9" fill="#9ca3af" fontFamily="ui-monospace" textAnchor="end">
        Frz 02:14
      </text>
    </svg>
  );
}

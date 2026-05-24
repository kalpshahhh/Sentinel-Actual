import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ZoomIn, ZoomOut, X } from 'lucide-react';
import type { BodyRegion } from '../types';

type Props = {
  regions: BodyRegion[];
  onChange: (regions: BodyRegion[]) => void;
  /** When true, allow only one selection (used in legacy code paths). Default: multi-select. */
  single?: boolean;
};

type View = 'front' | 'back';

type ZoneShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

type Zone = {
  id: BodyRegion;
  label: string;
  view: View;
  shape: ZoneShape;
  /** Color group for visual differentiation. */
  group: 'head' | 'torso' | 'belly' | 'pelvis' | 'arm' | 'leg' | 'back' | 'flank';
};

const G_COLOR = {
  head: '#a78bfa',
  torso: '#ef4444',
  belly: '#3b82f6',
  pelvis: '#22d3ee',
  arm: '#fb923c',
  leg: '#fb923c',
  back: '#9ca3af',
  flank: '#3b82f6',
} as const;

// === ZONES — front view ===
// Patient faces viewer: patient's RIGHT side appears on viewer's LEFT (medical convention).
const FRONT_ZONES: Zone[] = [
  // Head
  { id: 'head_forehead', label: 'Forehead', view: 'front', group: 'head', shape: { kind: 'ellipse', cx: 160, cy: 38, rx: 26, ry: 14 } },
  { id: 'head_temple', label: 'Side of head', view: 'front', group: 'head', shape: { kind: 'ellipse', cx: 160, cy: 60, rx: 32, ry: 8 } },
  { id: 'eye_right', label: 'Right eye', view: 'front', group: 'head', shape: { kind: 'circle', cx: 148, cy: 52, r: 5 } },
  { id: 'eye_left', label: 'Left eye', view: 'front', group: 'head', shape: { kind: 'circle', cx: 172, cy: 52, r: 5 } },
  { id: 'ear_right', label: 'Right ear', view: 'front', group: 'head', shape: { kind: 'circle', cx: 126, cy: 60, r: 5 } },
  { id: 'ear_left', label: 'Left ear', view: 'front', group: 'head', shape: { kind: 'circle', cx: 194, cy: 60, r: 5 } },
  { id: 'mouth_jaw', label: 'Mouth & jaw', view: 'front', group: 'head', shape: { kind: 'ellipse', cx: 160, cy: 78, rx: 16, ry: 8 } },
  { id: 'neck_front', label: 'Front of neck', view: 'front', group: 'head', shape: { kind: 'rect', x: 148, y: 92, w: 24, h: 22 } },

  // Chest
  { id: 'chest_upper_right', label: 'Upper right chest', view: 'front', group: 'torso', shape: { kind: 'rect', x: 100, y: 116, w: 56, h: 70 } },
  { id: 'chest_upper_left', label: 'Upper left chest', view: 'front', group: 'torso', shape: { kind: 'rect', x: 164, y: 116, w: 56, h: 70 } },
  { id: 'chest_center', label: 'Center chest (sternum)', view: 'front', group: 'torso', shape: { kind: 'rect', x: 152, y: 116, w: 16, h: 80 } },

  // Belly — 4 quadrants + periumbilical
  // Patient's RUQ = viewer's LEFT upper
  { id: 'belly_ruq', label: 'Upper right belly (RUQ)', view: 'front', group: 'belly', shape: { kind: 'rect', x: 100, y: 196, w: 60, h: 46 } },
  { id: 'belly_luq', label: 'Upper left belly (LUQ)', view: 'front', group: 'belly', shape: { kind: 'rect', x: 160, y: 196, w: 60, h: 46 } },
  { id: 'belly_rlq', label: 'Lower right belly (RLQ)', view: 'front', group: 'belly', shape: { kind: 'rect', x: 100, y: 242, w: 60, h: 46 } },
  { id: 'belly_llq', label: 'Lower left belly (LLQ)', view: 'front', group: 'belly', shape: { kind: 'rect', x: 160, y: 242, w: 60, h: 46 } },
  { id: 'belly_periumbilical', label: 'Around the belly button', view: 'front', group: 'belly', shape: { kind: 'circle', cx: 160, cy: 240, r: 14 } },

  // Pelvis
  { id: 'pelvis_groin', label: 'Groin', view: 'front', group: 'pelvis', shape: { kind: 'rect', x: 124, y: 288, w: 72, h: 32 } },
  { id: 'hip_right', label: 'Right hip', view: 'front', group: 'pelvis', shape: { kind: 'circle', cx: 110, cy: 305, r: 12 } },
  { id: 'hip_left', label: 'Left hip', view: 'front', group: 'pelvis', shape: { kind: 'circle', cx: 210, cy: 305, r: 12 } },

  // Right arm (viewer's left)
  { id: 'shoulder_right', label: 'Right shoulder', view: 'front', group: 'arm', shape: { kind: 'circle', cx: 92, cy: 130, r: 16 } },
  { id: 'upper_arm_right', label: 'Right upper arm', view: 'front', group: 'arm', shape: { kind: 'rect', x: 64, y: 144, w: 36, h: 64 } },
  { id: 'elbow_right', label: 'Right elbow', view: 'front', group: 'arm', shape: { kind: 'circle', cx: 80, cy: 210, r: 12 } },
  { id: 'forearm_right', label: 'Right forearm', view: 'front', group: 'arm', shape: { kind: 'rect', x: 62, y: 224, w: 36, h: 62 } },
  { id: 'wrist_right', label: 'Right wrist', view: 'front', group: 'arm', shape: { kind: 'rect', x: 60, y: 286, w: 36, h: 14 } },
  { id: 'hand_right', label: 'Right hand', view: 'front', group: 'arm', shape: { kind: 'rect', x: 54, y: 300, w: 46, h: 34 } },

  // Left arm (viewer's right)
  { id: 'shoulder_left', label: 'Left shoulder', view: 'front', group: 'arm', shape: { kind: 'circle', cx: 228, cy: 130, r: 16 } },
  { id: 'upper_arm_left', label: 'Left upper arm', view: 'front', group: 'arm', shape: { kind: 'rect', x: 220, y: 144, w: 36, h: 64 } },
  { id: 'elbow_left', label: 'Left elbow', view: 'front', group: 'arm', shape: { kind: 'circle', cx: 240, cy: 210, r: 12 } },
  { id: 'forearm_left', label: 'Left forearm', view: 'front', group: 'arm', shape: { kind: 'rect', x: 222, y: 224, w: 36, h: 62 } },
  { id: 'wrist_left', label: 'Left wrist', view: 'front', group: 'arm', shape: { kind: 'rect', x: 224, y: 286, w: 36, h: 14 } },
  { id: 'hand_left', label: 'Left hand', view: 'front', group: 'arm', shape: { kind: 'rect', x: 220, y: 300, w: 46, h: 34 } },

  // Right leg
  { id: 'thigh_right', label: 'Right thigh', view: 'front', group: 'leg', shape: { kind: 'rect', x: 110, y: 326, w: 48, h: 88 } },
  { id: 'knee_right', label: 'Right knee', view: 'front', group: 'leg', shape: { kind: 'circle', cx: 134, cy: 420, r: 14 } },
  { id: 'shin_right', label: 'Right shin', view: 'front', group: 'leg', shape: { kind: 'rect', x: 112, y: 434, w: 44, h: 80 } },
  { id: 'ankle_right', label: 'Right ankle', view: 'front', group: 'leg', shape: { kind: 'rect', x: 116, y: 514, w: 38, h: 18 } },
  { id: 'foot_right', label: 'Right foot', view: 'front', group: 'leg', shape: { kind: 'rect', x: 104, y: 532, w: 54, h: 20 } },

  // Left leg
  { id: 'thigh_left', label: 'Left thigh', view: 'front', group: 'leg', shape: { kind: 'rect', x: 162, y: 326, w: 48, h: 88 } },
  { id: 'knee_left', label: 'Left knee', view: 'front', group: 'leg', shape: { kind: 'circle', cx: 186, cy: 420, r: 14 } },
  { id: 'shin_left', label: 'Left shin', view: 'front', group: 'leg', shape: { kind: 'rect', x: 164, y: 434, w: 44, h: 80 } },
  { id: 'ankle_left', label: 'Left ankle', view: 'front', group: 'leg', shape: { kind: 'rect', x: 166, y: 514, w: 38, h: 18 } },
  { id: 'foot_left', label: 'Left foot', view: 'front', group: 'leg', shape: { kind: 'rect', x: 162, y: 532, w: 54, h: 20 } },
];

// === ZONES — back view ===
// Patient's back to viewer: patient's RIGHT is on viewer's RIGHT.
const BACK_ZONES: Zone[] = [
  { id: 'head_forehead', label: 'Back of head', view: 'back', group: 'head', shape: { kind: 'ellipse', cx: 160, cy: 50, rx: 28, ry: 18 } },
  { id: 'ear_right', label: 'Right ear (back)', view: 'back', group: 'head', shape: { kind: 'circle', cx: 194, cy: 60, r: 5 } },
  { id: 'ear_left', label: 'Left ear (back)', view: 'back', group: 'head', shape: { kind: 'circle', cx: 126, cy: 60, r: 5 } },
  { id: 'neck_back', label: 'Back of neck', view: 'back', group: 'head', shape: { kind: 'rect', x: 148, y: 92, w: 24, h: 22 } },

  { id: 'back_upper', label: 'Upper back / shoulders', view: 'back', group: 'back', shape: { kind: 'rect', x: 100, y: 116, w: 120, h: 70 } },
  { id: 'back_mid', label: 'Middle back', view: 'back', group: 'back', shape: { kind: 'rect', x: 110, y: 186, w: 100, h: 50 } },
  { id: 'back_lower', label: 'Lower back', view: 'back', group: 'back', shape: { kind: 'rect', x: 110, y: 236, w: 100, h: 56 } },
  { id: 'flank_right', label: 'Right side / flank', view: 'back', group: 'flank', shape: { kind: 'rect', x: 196, y: 196, w: 24, h: 60 } },
  { id: 'flank_left', label: 'Left side / flank', view: 'back', group: 'flank', shape: { kind: 'rect', x: 100, y: 196, w: 24, h: 60 } },

  // Right arm BACK (viewer's right)
  { id: 'shoulder_right', label: 'Right shoulder (back)', view: 'back', group: 'arm', shape: { kind: 'circle', cx: 228, cy: 130, r: 16 } },
  { id: 'upper_arm_right', label: 'Right upper arm (back)', view: 'back', group: 'arm', shape: { kind: 'rect', x: 220, y: 144, w: 36, h: 64 } },
  { id: 'elbow_right', label: 'Right elbow (back)', view: 'back', group: 'arm', shape: { kind: 'circle', cx: 240, cy: 210, r: 12 } },
  { id: 'forearm_right', label: 'Right forearm (back)', view: 'back', group: 'arm', shape: { kind: 'rect', x: 222, y: 224, w: 36, h: 62 } },
  { id: 'hand_right', label: 'Right hand (back)', view: 'back', group: 'arm', shape: { kind: 'rect', x: 220, y: 300, w: 46, h: 34 } },

  // Left arm BACK (viewer's left)
  { id: 'shoulder_left', label: 'Left shoulder (back)', view: 'back', group: 'arm', shape: { kind: 'circle', cx: 92, cy: 130, r: 16 } },
  { id: 'upper_arm_left', label: 'Left upper arm (back)', view: 'back', group: 'arm', shape: { kind: 'rect', x: 64, y: 144, w: 36, h: 64 } },
  { id: 'elbow_left', label: 'Left elbow (back)', view: 'back', group: 'arm', shape: { kind: 'circle', cx: 80, cy: 210, r: 12 } },
  { id: 'forearm_left', label: 'Left forearm (back)', view: 'back', group: 'arm', shape: { kind: 'rect', x: 62, y: 224, w: 36, h: 62 } },
  { id: 'hand_left', label: 'Left hand (back)', view: 'back', group: 'arm', shape: { kind: 'rect', x: 54, y: 300, w: 46, h: 34 } },

  // Right leg BACK
  { id: 'thigh_right', label: 'Right thigh (back)', view: 'back', group: 'leg', shape: { kind: 'rect', x: 162, y: 326, w: 48, h: 88 } },
  { id: 'knee_right', label: 'Right knee (back)', view: 'back', group: 'leg', shape: { kind: 'circle', cx: 186, cy: 420, r: 14 } },
  { id: 'shin_right', label: 'Right calf', view: 'back', group: 'leg', shape: { kind: 'rect', x: 164, y: 434, w: 44, h: 80 } },
  { id: 'foot_right', label: 'Right foot (back)', view: 'back', group: 'leg', shape: { kind: 'rect', x: 162, y: 532, w: 54, h: 20 } },

  // Left leg BACK
  { id: 'thigh_left', label: 'Left thigh (back)', view: 'back', group: 'leg', shape: { kind: 'rect', x: 110, y: 326, w: 48, h: 88 } },
  { id: 'knee_left', label: 'Left knee (back)', view: 'back', group: 'leg', shape: { kind: 'circle', cx: 134, cy: 420, r: 14 } },
  { id: 'shin_left', label: 'Left calf', view: 'back', group: 'leg', shape: { kind: 'rect', x: 112, y: 434, w: 44, h: 80 } },
  { id: 'foot_left', label: 'Left foot (back)', view: 'back', group: 'leg', shape: { kind: 'rect', x: 104, y: 532, w: 54, h: 20 } },
];

const ALL_ZONES = [...FRONT_ZONES, ...BACK_ZONES];

function zoneCenter(z: Zone): { x: number; y: number } {
  if (z.shape.kind === 'rect') return { x: z.shape.x + z.shape.w / 2, y: z.shape.y + z.shape.h / 2 };
  if (z.shape.kind === 'circle') return { x: z.shape.cx, y: z.shape.cy };
  return { x: z.shape.cx, y: z.shape.cy };
}

function zoneLabelFor(region: BodyRegion, view: View): string {
  const z = ALL_ZONES.find((zz) => zz.id === region && zz.view === view) ?? ALL_ZONES.find((zz) => zz.id === region);
  return z?.label ?? region;
}

export function InteractiveBody({ regions, onChange, single = false }: Props) {
  const [view, setView] = useState<View>('front');
  const [hoverId, setHoverId] = useState<{ id: BodyRegion; view: View } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomCenter, setZoomCenter] = useState<{ x: number; y: number } | null>(null);

  const visibleZones = useMemo(() => (view === 'front' ? FRONT_ZONES : BACK_ZONES), [view]);

  const isSelected = (id: BodyRegion) => regions.includes(id);

  const toggle = (z: Zone) => {
    if (single) {
      onChange([z.id]);
    } else {
      if (regions.includes(z.id)) {
        onChange(regions.filter((r) => r !== z.id));
      } else {
        onChange([...regions, z.id]);
      }
    }
  };

  const vbWidth = 320 / zoom;
  const vbHeight = 580 / zoom;
  let vbX = (320 - vbWidth) / 2;
  let vbY = (580 - vbHeight) / 2;
  if (zoomCenter && zoom > 1) {
    vbX = Math.max(0, Math.min(320 - vbWidth, zoomCenter.x - vbWidth / 2));
    vbY = Math.max(0, Math.min(580 - vbHeight, zoomCenter.y - vbHeight / 2));
  }

  const handleZoomIn = () => {
    if (regions.length > 0) {
      // center on most recent
      const last = regions[regions.length - 1];
      const z = visibleZones.find((zz) => zz.id === last);
      if (z) setZoomCenter(zoneCenter(z));
    }
    setZoom((z) => Math.min(3.5, z + 0.5));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1, z - 0.5);
      if (next === 1) setZoomCenter(null);
      return next;
    });
  };

  return (
    <div className="bg-rig-bg/60 border border-rig-dim/20 rounded-md p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest text-rig-accent">
          {regions.length === 0 ? 'Tap where it hurts' : `${regions.length} location${regions.length > 1 ? 's' : ''} selected`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView((v) => (v === 'front' ? 'back' : 'front'))}
            className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-rig-dim/30 hover:bg-rig-surface flex items-center gap-1"
            title="Flip front / back"
          >
            <RotateCcw size={11} />
            {view === 'front' ? 'Front' : 'Back'}
          </button>
          <button
            onClick={handleZoomIn}
            className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-rig-dim/30 hover:bg-rig-surface"
            title="Zoom in"
          >
            <ZoomIn size={11} />
          </button>
          <button
            onClick={handleZoomOut}
            className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-rig-dim/30 hover:bg-rig-surface"
            title="Zoom out"
          >
            <ZoomOut size={11} />
          </button>
        </div>
      </div>

      {/* Selected pills */}
      {regions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => onChange(regions.filter((rr) => rr !== r))}
              className="text-[10px] px-2 py-0.5 rounded-full bg-rig-accent/20 border border-rig-accent/50 text-rig-accent flex items-center gap-1 hover:bg-rig-accent/35"
            >
              {zoneLabelFor(r, view)}
              <X size={10} />
            </button>
          ))}
          {regions.length > 1 && (
            <button
              onClick={() => onChange([])}
              className="text-[10px] px-2 py-0.5 rounded-full bg-rig-surface border border-rig-dim/40 text-rig-dim hover:text-rig-text"
            >
              clear
            </button>
          )}
        </div>
      )}

      <div className="relative mx-auto" style={{ width: 280, height: 500 }}>
        <motion.svg
          viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Silhouette outline */}
          <g stroke="#6b7280" strokeWidth="1" fill="#111827">
            <ellipse cx="160" cy="55" rx="36" ry="38" />
            <rect x="148" y="92" width="24" height="14" />
            <path d="M 90 120 Q 160 110 230 120 L 215 325 L 105 325 Z" />
            <path d="M 88 124 Q 56 200 60 290 L 100 330 L 110 130 Z" />
            <path d="M 232 124 Q 264 200 260 290 L 220 330 L 210 130 Z" />
            <path d="M 110 325 L 158 325 L 152 552 L 122 552 Z" />
            <path d="M 162 325 L 210 325 L 198 552 L 168 552 Z" />
          </g>

          {/* Zone hit-targets */}
          {visibleZones.map((z) => {
            const sel = isSelected(z.id);
            const hover = hoverId?.id === z.id && hoverId.view === view;
            const fill = G_COLOR[z.group];
            const fillOpacity = sel ? 0.55 : hover ? 0.28 : 0.0;
            const stroke = sel ? fill : hover ? fill : 'transparent';

            const onClick = () => toggle(z);
            const onEnter = () => setHoverId({ id: z.id, view });
            const onLeave = () => setHoverId(null);

            const common = {
              fill,
              fillOpacity,
              stroke,
              strokeWidth: 1.2,
              onClick,
              onMouseEnter: onEnter,
              onMouseLeave: onLeave,
              style: { cursor: 'pointer' as const },
            };

            const key = `${z.view}_${z.id}`;
            if (z.shape.kind === 'rect') {
              return <rect key={key} x={z.shape.x} y={z.shape.y} width={z.shape.w} height={z.shape.h} {...common} />;
            }
            if (z.shape.kind === 'circle') {
              return <circle key={key} cx={z.shape.cx} cy={z.shape.cy} r={z.shape.r} {...common} />;
            }
            return <ellipse key={key} cx={z.shape.cx} cy={z.shape.cy} rx={z.shape.rx} ry={z.shape.ry} {...common} />;
          })}

          {/* Pulsing pins on selected regions */}
          {regions.map((r, idx) => {
            const z = visibleZones.find((zz) => zz.id === r);
            if (!z) return null;
            const c = zoneCenter(z);
            return (
              <g key={`pin_${r}_${idx}`} pointerEvents="none">
                <circle cx={c.x} cy={c.y} r="9" fill="#fb923c" fillOpacity="0.4">
                  <animate attributeName="r" values="7;14;7" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" values="0.65;0.1;0.65" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <circle cx={c.x} cy={c.y} r="4" fill="#fb923c" />
              </g>
            );
          })}
        </motion.svg>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoverId && (
            <motion.div
              key={hoverId.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-rig-bg/95 border border-rig-accent/40 rounded px-2 py-1 text-[11px] text-rig-accent font-mono pointer-events-none"
            >
              {visibleZones.find((zz) => zz.id === hoverId.id)?.label ?? hoverId.id}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-rig-dim font-mono">
        <span>{view.toUpperCase()} VIEW · ZOOM {zoom.toFixed(1)}×</span>
        <span className="text-rig-dim">{regions.length === 0 ? 'Click any spot' : 'Click again to remove'}</span>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-mono">
        {(Object.entries(G_COLOR) as Array<[keyof typeof G_COLOR, string]>).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1 px-1.5 py-0.5 bg-rig-surface/60 rounded border border-rig-dim/20">
            <span className="w-2 h-2 rounded-full" style={{ background: v }} />
            <span className="text-rig-dim uppercase">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { zoneLabelFor };

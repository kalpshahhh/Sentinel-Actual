import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Scenario, ScenarioCategory } from '../types';

type Props = {
  scenarios: Scenario[];
  animate?: boolean;
  width?: number;
  height?: number;
};

const CATEGORY_COLOR: Record<ScenarioCategory, string> = {
  cardiovascular: '#ef4444',
  trauma: '#fb923c',
  infection: '#eab308',
  gu: '#3b82f6',
  gi: '#a78bfa',
  respiratory: '#22d3ee',
  neuro: '#ec4899',
  other: '#9ca3af',
  endocrine: '#f0abfc',
  neurological: '#c084fc',
  environmental: '#34d399',
};

function categoryFor(s: Scenario): ScenarioCategory {
  if (s.category) return s.category;
  const c = s.condition.toLowerCase();
  if (c.includes('cardiac') || c.includes('coronary')) return 'cardiovascular';
  if (c.includes('fracture') || c.includes('laceration') || c.includes('burn') || c.includes('trauma')) return 'trauma';
  if (c.includes('sepsis') || c.includes('infection') || c.includes('cellulitis') || c.includes('outbreak') || c.includes('influenza')) return 'infection';
  if (c.includes('renal') || c.includes('ureteric') || c.includes('stone')) return 'gu';
  if (c.includes('appendicitis') || c.includes('abdomen') || c.includes('gi')) return 'gi';
  if (c.includes('anaphylaxis') || c.includes('asthma') || c.includes('respiratory')) return 'respiratory';
  return 'other';
}

export function DecisionGraph({ scenarios, animate = true, width = 720, height = 560 }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const layout = useMemo(() => {
    const cx = width / 2;
    const cy = height / 2;
    const ringR = Math.min(width, height) * 0.32;
    const branchLen = 60;

    const items = scenarios.map((s, i) => {
      const angle = (i / scenarios.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * ringR;
      const y = cy + Math.sin(angle) * ringR;
      const cat = categoryFor(s);

      const tCount = Math.min(s.treatment.length, 4);
      const treatments = s.treatment.slice(0, tCount).map((t, ti) => {
        const sub = ((ti - (tCount - 1) / 2) / tCount) * 0.55;
        const a = angle + sub;
        const tx = x + Math.cos(a) * branchLen;
        const ty = y + Math.sin(a) * branchLen;
        return { id: t.id, x: tx, y: ty, action: t.action, drug: t.drug ?? null };
      });

      return { id: s.id, condition: s.condition, likelihood: s.likelihoodPercent, x, y, cat, treatments };
    });

    return { cx, cy, items };
  }, [scenarios, width, height]);

  const hovered = hoverId ? scenarios.find((s) => s.id === hoverId) : null;

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <radialGradient id="vesselGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* edges: vessel -> scenarios */}
        {layout.items.map((it, i) => (
          <motion.line
            key={`e_${it.id}`}
            x1={layout.cx}
            y1={layout.cy}
            x2={it.x}
            y2={it.y}
            stroke={CATEGORY_COLOR[it.cat]}
            strokeOpacity="0.45"
            strokeWidth={1.5}
            initial={animate ? { pathLength: 0, opacity: 0 } : false}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
          />
        ))}

        {/* edges: scenario -> treatment */}
        {layout.items.flatMap((it, i) =>
          it.treatments.map((t, ti) => (
            <motion.line
              key={`te_${t.id}_${ti}`}
              x1={it.x}
              y1={it.y}
              x2={t.x}
              y2={t.y}
              stroke={CATEGORY_COLOR[it.cat]}
              strokeOpacity="0.25"
              strokeWidth={1}
              initial={animate ? { pathLength: 0, opacity: 0 } : false}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.08 + ti * 0.05, duration: 0.3, ease: 'easeOut' }}
            />
          ))
        )}

        {/* treatment nodes */}
        {layout.items.flatMap((it, i) =>
          it.treatments.map((t, ti) => (
            <motion.g
              key={`tn_${t.id}_${ti}`}
              initial={animate ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08 + ti * 0.05, duration: 0.25, ease: 'backOut' }}
            >
              <circle cx={t.x} cy={t.y} r={5} fill={CATEGORY_COLOR[it.cat]} fillOpacity="0.85" />
            </motion.g>
          ))
        )}

        {/* scenario nodes */}
        {layout.items.map((it, i) => (
          <motion.g
            key={`sn_${it.id}`}
            initial={animate ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.3, ease: 'backOut' }}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoverId(it.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            <circle
              cx={it.x}
              cy={it.y}
              r={30}
              fill={CATEGORY_COLOR[it.cat]}
              fillOpacity="0.18"
              stroke={CATEGORY_COLOR[it.cat]}
              strokeWidth={hoverId === it.id ? 2.5 : 1.5}
            />
            <text
              x={it.x}
              y={it.y - 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e5e7eb"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
              style={{ pointerEvents: 'none' }}
            >
              {it.likelihood}%
            </text>
            <text
              x={it.x}
              y={it.y + 10}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={CATEGORY_COLOR[it.cat]}
              fontSize="8"
              fontFamily="ui-monospace, monospace"
              style={{ pointerEvents: 'none' }}
            >
              {abbreviate(it.condition)}
            </text>
          </motion.g>
        ))}

        {/* vessel node (center) */}
        <motion.g
          initial={animate ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, ease: 'backOut' }}
        >
          <circle cx={layout.cx} cy={layout.cy} r={42} fill="url(#vesselGrad)" stroke="#fb923c" strokeWidth={2} />
          <text
            x={layout.cx}
            y={layout.cy - 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fb923c"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
            fontWeight={700}
          >
            VESSEL
          </text>
          <text
            x={layout.cx}
            y={layout.cy + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e5e7eb"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
          >
            {scenarios.length} protocols
          </text>
        </motion.g>
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute top-2 left-2 bg-rig-bg/95 backdrop-blur border border-rig-dim/30 rounded p-2 text-xs max-w-[280px] pointer-events-none">
          <div className="font-bold text-rig-text">{hovered.condition}</div>
          <div className="text-rig-accent font-mono text-[10px]">Likelihood {hovered.likelihoodPercent}%</div>
          {hovered.treatment[0] && (
            <div className="text-rig-dim mt-1 text-[10px]">
              First-line: {hovered.treatment[0].action}
              {hovered.treatment[0].drug ? ` (${hovered.treatment[0].drug} ${hovered.treatment[0].dose ?? ''})` : ''}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 text-[10px] font-mono">
        {(Object.entries(CATEGORY_COLOR) as Array<[ScenarioCategory, string]>)
          .filter(([cat]) => layout.items.some((it) => it.cat === cat))
          .map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1 px-1.5 py-0.5 bg-rig-surface/60 rounded border border-rig-dim/20">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-rig-dim uppercase tracking-wider">{cat}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function abbreviate(s: string): string {
  if (s.length <= 14) return s;
  const parts = s.split(/[\s/]+/);
  if (parts.length === 1) return s.slice(0, 12) + '…';
  return parts
    .slice(0, 2)
    .map((p) => p.slice(0, 7))
    .join(' ');
}

// Re-export the color helper so other components can match
export { CATEGORY_COLOR, categoryFor };

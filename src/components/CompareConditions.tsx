import { ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { Scenario } from '../types';

type Props = {
  top: Array<{ scenario: Scenario; probability: number }>;
  onChoose: (s: Scenario) => void;
  onBack: () => void;
};

/**
 * Side-by-side compare-and-contrast for the top 2-3 possible conditions when
 * the deterministic ranker can't pick a clear winner. Shows distinguishing
 * questions (tieBreakers) so the operator can pick the right one.
 */
export function CompareConditions({ top, onChoose, onBack }: Props) {
  const a = top[0];
  const b = top[1];
  const c = top[2];

  // Find the distinguishing tie-breaker questions
  const breakerSet = new Set<string>();
  for (const t of top) for (const tb of t.scenario.tieBreakers ?? []) breakerSet.add(tb);
  const breakers = Array.from(breakerSet).slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-4">
        <div className="text-[11px] uppercase tracking-widest text-rig-dim font-mono">Two possibilities are close — let's compare</div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-rig-text mt-1">
          Which one is it? Use these questions to decide.
        </h1>
      </div>

      {breakers.length > 0 && (
        <div className="bg-rig-surface border border-rig-dim/30 rounded-md p-4 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2">Tie-breakers</div>
          <ul className="space-y-1.5 text-sm text-rig-text">
            {breakers.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rig-accent shrink-0">•</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CompareCard data={a} onChoose={onChoose} highlight />
        {b && <CompareCard data={b} onChoose={onChoose} />}
      </div>

      {c && c.probability > 0.05 && (
        <div className="mt-3">
          <CompareCard data={c} onChoose={onChoose} />
        </div>
      )}

      <button onClick={onBack} className="mt-4 text-[11px] uppercase tracking-widest text-rig-dim hover:text-rig-text flex items-center gap-1">
        <ArrowLeft size={11} /> back to questions
      </button>
    </div>
  );
}

function CompareCard({
  data,
  onChoose,
  highlight,
}: {
  data: { scenario: Scenario; probability: number };
  onChoose: (s: Scenario) => void;
  highlight?: boolean;
}) {
  const pct = Math.round(data.probability * 100);
  const ta = data.scenario.timeAction;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'bg-rig-surface border rounded-md p-4 flex flex-col gap-3',
        highlight ? 'border-rig-accent/60' : 'border-rig-dim/30'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-rig-dim">{highlight ? 'Top match' : 'Also possible'}</div>
          <div className="text-lg font-bold tracking-wide text-rig-text">{data.scenario.shortHeadline ?? data.scenario.condition}</div>
        </div>
        <div className="text-rig-accent font-mono text-xl">{pct}%</div>
      </div>

      {data.scenario.layExplanation && (
        <p className="text-xs text-rig-text leading-relaxed">{data.scenario.layExplanation}</p>
      )}

      {ta && (
        <div
          className={clsx(
            'text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded',
            ta.tier === 'tier1_immediate'
              ? 'bg-rig-critical/15 text-rig-critical'
              : ta.tier === 'tier2_urgent'
              ? 'bg-rig-critical/10 text-rig-critical'
              : ta.tier === 'tier3_today'
              ? 'bg-rig-accent/15 text-rig-accent'
              : 'bg-rig-ok/15 text-rig-ok'
          )}
        >
          If this: {ta.label}
        </div>
      )}

      {data.scenario.tieBreakers && data.scenario.tieBreakers.length > 0 && (
        <details className="text-[11px] text-rig-dim">
          <summary className="cursor-pointer hover:text-rig-text">Tells us this is {data.scenario.condition.toLowerCase()} if…</summary>
          <ul className="mt-1 space-y-0.5 pl-3">
            {data.scenario.tieBreakers.map((q, i) => (
              <li key={i} className="list-disc">{q}</li>
            ))}
          </ul>
        </details>
      )}

      <button
        onClick={() => onChoose(data.scenario)}
        className={clsx(
          'mt-auto px-4 py-3 rounded font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2',
          highlight
            ? 'bg-rig-accent text-rig-bg hover:bg-rig-accent/85'
            : 'bg-rig-surface border border-rig-dim/40 text-rig-text hover:bg-rig-bg'
        )}
      >
        <CheckCircle size={14} />
        Choose this
      </button>
    </motion.div>
  );
}

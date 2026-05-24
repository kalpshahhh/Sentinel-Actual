import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ArrowLeft, Hourglass, HelpCircle, CheckCircle } from 'lucide-react';

type Props = {
  onSubmit: (hours: number | 'unknown') => void;
  onBack: () => void;
};

const PRESETS: Array<{ label: string; hours: number | 'unknown' }> = [
  { label: 'Within 1 hour', hours: 1 },
  { label: 'Within 2 hours', hours: 2 },
  { label: '4 hours', hours: 4 },
  { label: '8 hours', hours: 8 },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: "Don't know yet", hours: 'unknown' },
];

export function WhenHelpArrives({ onSubmit, onBack }: Props) {
  const [selected, setSelected] = useState<number | 'unknown' | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-2 text-[11px] uppercase tracking-widest text-rig-ok font-mono">
        <CheckCircle className="inline mr-1" size={11} />
        Pressing actions done · they're stable
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-rig-text text-center mb-2">
        When is help arriving?
      </h1>
      <p className="text-rig-dim text-center text-sm max-w-xl mx-auto mb-6">
        Ask the captain or coastguard. We'll build a timed plan with exact dose schedules so you know what to do until evacuation gets here.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {PRESETS.map((p) => {
          const sel = selected === p.hours;
          return (
            <button
              key={String(p.hours)}
              onClick={() => setSelected(p.hours)}
              className={clsx(
                'px-3 py-4 rounded border text-sm font-bold uppercase tracking-widest',
                sel
                  ? 'bg-rig-accent text-rig-bg border-rig-accent'
                  : 'bg-rig-surface border-rig-dim/30 text-rig-text hover:bg-rig-bg'
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {selected === 'unknown' && (
        <div className="bg-rig-accent/10 border border-rig-accent/30 rounded p-3 mb-4 text-xs text-rig-text leading-relaxed">
          <HelpCircle className="inline mr-1.5" size={12} />
          We'll plan for 24 hours by default. Re-open this screen and update once the captain has an ETA.
        </div>
      )}

      <button
        disabled={selected === null}
        onClick={() => onSubmit(selected ?? 'unknown')}
        className={clsx(
          'w-full px-6 py-5 rounded-md font-bold uppercase tracking-widest text-base flex items-center justify-center gap-2',
          selected !== null
            ? 'bg-rig-accent text-rig-bg hover:bg-rig-accent/85 glow-accent'
            : 'bg-rig-surface text-rig-dim border border-rig-dim/30 cursor-not-allowed'
        )}
      >
        <Hourglass size={18} />
        Build the waiting plan
      </button>

      <button
        onClick={onBack}
        className="mt-3 text-[11px] uppercase tracking-widest text-rig-dim hover:text-rig-text flex items-center gap-1"
      >
        <ArrowLeft size={11} /> back
      </button>
    </motion.div>
  );
}

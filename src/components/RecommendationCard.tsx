import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Syringe, AlertTriangle, CheckCircle, DollarSign, Pill, Tablet } from 'lucide-react';
import type { CaseDecision, TreatmentStep } from '../types';
import { CitationChip, CitationProvider } from './CitationChip';
import { findDrugLocation } from '../data/equipment-lookup';

type Props = {
  decision: CaseDecision;
  condition?: string;
  layExplanation?: string;
  rationale: string;
  steps: TreatmentStep[];
  evacuateIf: string[];
  costSavings: number;
  onCitationLookup?: (id: string) => void;
};

export function RecommendationCard({
  decision,
  condition,
  layExplanation,
  rationale,
  steps,
  evacuateIf,
  costSavings,
  onCitationLookup,
}: Props) {
  const onboard = decision === 'onboard';
  return (
    <CitationProvider>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-rig-surface border border-rig-dim/30 rounded-md overflow-hidden"
    >
      <div
        className={clsx(
          'px-5 py-4 flex items-center gap-3',
          onboard ? 'bg-rig-ok/15 border-b border-rig-ok/30 glow-ok' : 'bg-rig-critical/15 border-b border-rig-critical/30 glow-critical'
        )}
      >
        {onboard ? (
          <CheckCircle size={26} className="text-rig-ok shrink-0" />
        ) : (
          <AlertTriangle size={26} className="text-rig-critical shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className={clsx('text-xs uppercase tracking-widest', onboard ? 'text-rig-ok' : 'text-rig-critical')}>
            {onboard ? 'Treat onboard' : 'Evacuate'}
          </div>
          <div className={clsx('text-xl font-bold uppercase tracking-wider', onboard ? 'text-rig-ok' : 'text-rig-critical')}>
            {condition ?? (onboard ? 'Manage onboard' : 'Evacuate now')}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {layExplanation && (
          <div className="bg-rig-bg/40 border border-rig-dim/20 rounded p-3 text-sm text-rig-text">
            <span className="text-[10px] uppercase tracking-widest text-rig-dim mr-2">What this is:</span>
            {layExplanation}
          </div>
        )}

        <div>
          <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1">Why</div>
          <div className="text-sm text-rig-text leading-relaxed">{rationale}</div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
            <Syringe size={11} />
            What to do — follow in order
          </div>
          <ol className="space-y-2">
            {steps.map((s, i) => {
              const drugInfo = s.drug ? findDrugLocation(s.drug) : null;
              return (
                <li key={s.id} className="bg-rig-bg/40 border border-rig-dim/20 rounded p-3 flex gap-3">
                  <span className="text-rig-accent font-bold font-mono text-sm shrink-0 mt-0.5">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-rig-text">{s.action}</div>
                    {(s.drug || s.dose || s.route || s.frequency) && (
                      <div className="text-[12px] font-mono text-rig-accent mt-1 flex items-start gap-1.5">
                        <Pill size={11} className="mt-0.5 shrink-0" />
                        <span>{[s.drug, s.dose, s.route, s.frequency].filter(Boolean).join(' · ')}</span>
                      </div>
                    )}
                    {drugInfo && (
                      <div className="text-[11px] text-rig-ok mt-1 flex items-center gap-1.5">
                        <Tablet size={10} />
                        Where to find it: <span className="font-mono">{drugInfo.location}</span>
                        {drugInfo.locked && (
                          <span className="px-1.5 py-0.5 bg-rig-critical/20 border border-rig-critical/40 rounded text-[9px] text-rig-critical">
                            LOCKED — ask the captain
                          </span>
                        )}
                        {drugInfo.quantityOnboard !== undefined && (
                          <span className="text-rig-dim">· {drugInfo.quantityOnboard} in stock</span>
                        )}
                      </div>
                    )}
                    {s.citationIds.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.citationIds.map((cid) => (
                          <CitationChip key={cid} citationId={cid} onLookup={onCitationLookup} />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {evacuateIf.length > 0 && (
          <div className="border border-rig-critical/30 bg-rig-critical/10 rounded p-3">
            <div className="text-[10px] uppercase tracking-widest text-rig-critical mb-1 flex items-center gap-1.5">
              <AlertTriangle size={11} /> Call for evacuation if any of these happen
            </div>
            <ul className="text-xs text-rig-text space-y-1 list-disc pl-5">
              {evacuateIf.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {onboard && costSavings > 0 && (
          <div className="border border-rig-accent/30 bg-rig-accent/10 rounded p-3 flex items-start gap-2">
            <DollarSign size={16} className="text-rig-accent mt-0.5 shrink-0" />
            <div className="text-xs">
              <div className="uppercase tracking-widest text-[10px] text-rig-accent">Cost avoided</div>
              <div className="text-lg font-bold text-rig-text font-mono">
                ${costSavings.toLocaleString()} <span className="text-xs font-normal text-rig-dim">vs helicopter evacuation</span>
              </div>
              <div className="text-[10px] text-rig-dim mt-0.5 leading-relaxed">
                Helicopter ETA 6h. Includes mobilisation + medical transport + landing fees. Source: industry average North Sea medevac 2024.
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
    </CitationProvider>
  );
}

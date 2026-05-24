import { useState } from 'react';
import clsx from 'clsx';
import { Activity, ChevronsRight, Snowflake, Anchor } from 'lucide-react';
import type { ArchitectureCounters, InventoryPreset, Scenario } from '../types';

type Props = {
  counters: ArchitectureCounters;
  scenarios: Scenario[];
  casesThisVoyage: number;
  preset: InventoryPreset;
};

export function ArchitecturePanel({ counters, scenarios, casesThisVoyage, preset }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const symptomPathEdges = scenarios.reduce((sum, s) => sum + (s.regions?.length ?? 0) + s.triggerSymptoms.length, 0);

  return (
    <div className="p-4 flex flex-col gap-4">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-rig-dim">Deployment Status</div>
        <div className="flex items-center gap-2 mt-1">
          {preset === 'polar' ? <Snowflake size={14} className="text-rig-accent" /> : <Anchor size={14} className="text-rig-accent" />}
          <span className="uppercase tracking-wider text-sm text-rig-text">
            {preset === 'polar' ? 'Polar Station' : 'Offshore Vessel'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Counter label="Emergencies Compiled" value={counters.protocolsCompiled} />
        <Counter label="Treatment Steps" value={scenarios.reduce((s, x) => s + x.treatment.length, 0)} />
        <Counter label="Symptom-Path Edges" value={symptomPathEdges} />
        <CounterEmphasis label="Runtime AI Calls" value={counters.runtimeAI} />
        <Counter label="Cloud Calls (session)" value={counters.cloudCalls} />
        <Counter label="Audit Entries" value={counters.auditEntries} />
      </div>

      <div className="text-[10px] text-rig-dim font-mono leading-relaxed">
        Cases this voyage: <span className="text-rig-text">{casesThisVoyage}</span>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2">Pre-compiled Emergencies</div>
        {scenarios.length === 0 ? (
          <div className="text-xs text-rig-dim italic px-2 py-3 border border-dashed border-rig-dim/30 rounded">
            Nothing compiled yet — connect to the satellite uplink and run the install audit.
          </div>
        ) : (
          <ul className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
            {scenarios.map((s) => {
              const isOpen = expandedId === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className={clsx(
                      'w-full text-left px-2 py-1.5 rounded border border-rig-dim/20 bg-rig-surface/60 hover:bg-rig-surface flex items-center justify-between gap-2',
                      isOpen && 'border-rig-accent/50'
                    )}
                  >
                    <span className="text-xs text-rig-text truncate">{s.condition}</span>
                    <span className="text-[10px] text-rig-accent font-mono">{s.likelihoodPercent}%</span>
                  </button>
                  {isOpen && (
                    <ul className="mt-1 pl-2 space-y-0.5 text-[10px] text-rig-dim font-mono">
                      {s.treatment.slice(0, 4).map((t) => (
                        <li key={t.id} className="flex items-start gap-1">
                          <ChevronsRight size={10} className="mt-[2px] shrink-0 text-rig-accent/60" />
                          <span className="truncate">
                            {t.action}
                            {t.drug ? ` — ${t.drug} ${t.dose ?? ''}` : ''}
                          </span>
                        </li>
                      ))}
                      {s.treatment.length > 4 && (
                        <li className="pl-3 italic text-rig-dim/70">+{s.treatment.length - 4} more steps</li>
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-rig-dim/20">
        <div className="flex items-center gap-1.5 text-[10px] text-rig-dim font-mono">
          <Activity size={11} className="text-rig-ok" />
          <span>OFFLINE — Last sync 6h 22m ago</span>
        </div>
      </div>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-rig-surface/50 rounded px-2 py-1.5 border border-rig-dim/20">
      <div className="text-[9px] uppercase tracking-wider text-rig-dim leading-tight">{label}</div>
      <div className="text-2xl font-bold text-rig-text leading-none mt-1 font-mono">{value}</div>
    </div>
  );
}

function CounterEmphasis({ label, value }: { label: string; value: number }) {
  return (
    <div
      className={clsx(
        'rounded px-2 py-1.5 border',
        value === 0
          ? 'bg-rig-ok/10 border-rig-ok/40 glow-ok'
          : 'bg-rig-critical/10 border-rig-critical/40'
      )}
    >
      <div className="text-[9px] uppercase tracking-wider text-rig-ok leading-tight">{label}</div>
      <div className={clsx('text-2xl font-bold leading-none mt-1 font-mono', value === 0 ? 'text-rig-ok' : 'text-rig-critical')}>
        {value}
      </div>
    </div>
  );
}

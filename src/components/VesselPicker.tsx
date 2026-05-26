import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Ship,
  Snowflake,
  Plus,
  ChevronRight,
  Package,
  Pill,
  Cpu,
  Clock,
  ClipboardList,
} from 'lucide-react';
import clsx from 'clsx';
import type { VesselRecord } from '../lib/vessels';
import type { AppSessionMode } from './ModeSelector';

type Props = {
  vessels: VesselRecord[];
  sessionMode: AppSessionMode;
  onSelect: (vessel: VesselRecord) => void;
  onGoToOnboarding: () => void;
};

export function VesselPicker({ vessels, sessionMode, onSelect, onGoToOnboarding }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const modeLabel = sessionMode === 'demo' ? 'Demo' : 'Live';
  const modeColor = sessionMode === 'demo' ? 'text-rig-accent' : 'text-rig-critical';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-rig-bg flex flex-col items-center justify-center p-6 z-50 scanlines"
    >
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className={clsx('text-xs uppercase tracking-widest font-mono mb-2', modeColor)}>
            Sentinel · {modeLabel} Mode
          </div>
          <h2 className="text-3xl font-bold uppercase tracking-widest text-rig-text">Select location</h2>
          <p className="text-sm text-rig-dim mt-2">Which location are you currently at?</p>
        </div>

        {/* Vessel cards */}
        {vessels.length === 0 ? (
          <div className="text-center py-10 text-rig-dim">
            <Ship size={40} className="mx-auto mb-3 opacity-30" />
            <div className="text-sm mb-1">No locations configured yet</div>
            <div className="text-xs">Run Onboarding to set up a location profile.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {vessels.map((v) => {
              const deviceCount = v.manifest?.devices.length ?? 0;
              const medCount = v.manifest?.medications.length ?? 0;
              const compiled = (v.compiledScenarios?.length ?? 0) > 0;
              const isHovered = hovered === v.id;

              return (
                <motion.button
                  key={v.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(v)}
                  onMouseEnter={() => setHovered(v.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={clsx(
                    'w-full text-left p-5 rounded-lg border transition-all',
                    isHovered
                      ? 'bg-rig-surface border-rig-accent/60 shadow-[0_0_0_1px_rgb(var(--rig-accent)/0.3)]'
                      : 'bg-rig-surface/50 border-rig-dim/30'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={clsx('shrink-0', isHovered ? 'text-rig-accent' : 'text-rig-dim')}>
                      {v.preset === 'polar' ? <Snowflake size={22} /> : <Ship size={22} />}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {compiled ? (
                        <span className="text-[9px] uppercase tracking-wider bg-rig-ok/15 text-rig-ok border border-rig-ok/30 rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Cpu size={9} /> Protocols ready
                        </span>
                      ) : (
                        <span className="text-[9px] uppercase tracking-wider bg-rig-dim/15 text-rig-dim border border-rig-dim/20 rounded px-1.5 py-0.5">
                          No protocols
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-base font-bold uppercase tracking-wide text-rig-text mb-0.5">{v.name}</div>
                  <div className="text-xs text-rig-dim mb-3 capitalize">
                    {v.preset === 'polar' ? 'Polar research' : 'Offshore supply'} ·{' '}
                    {v.capabilityProfile?.region?.replace(/_/g, ' ') ?? 'Region not set'}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-rig-dim">
                    <span className="flex items-center gap-1">
                      <Package size={11} /> {deviceCount} devices
                    </span>
                    <span className="flex items-center gap-1">
                      <Pill size={11} /> {medCount} meds
                    </span>
                    {v.lastUpdated && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock size={11} /> {formatAge(v.lastUpdated)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end mt-3">
                    <span className={clsx(
                      'text-[11px] uppercase tracking-widest flex items-center gap-1',
                      isHovered ? 'text-rig-accent' : 'text-rig-dim'
                    )}>
                      Select <ChevronRight size={13} />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Add new location */}
        <button
          onClick={onGoToOnboarding}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-dashed border-rig-dim/40 hover:border-rig-accent/50 text-rig-dim hover:text-rig-accent transition-colors group"
        >
          <Plus size={18} className="shrink-0" />
          <div className="text-left">
            <div className="text-sm font-bold uppercase tracking-wider">Add new location</div>
            <div className="text-xs">Set up equipment, medications and protocols via Onboarding</div>
          </div>
          <ClipboardList size={16} className="ml-auto shrink-0 opacity-60 group-hover:opacity-100" />
        </button>
      </div>
    </motion.div>
  );
}

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

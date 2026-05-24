import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Hourglass, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import type { TimeAction } from '../types';

type Props = { action: TimeAction };

const META: Record<TimeAction['tier'], { tone: 'critical' | 'warn' | 'accent' | 'ok'; icon: React.ReactNode; tierLabel: string }> = {
  tier1_immediate: { tone: 'critical', icon: <AlertTriangle size={28} />, tierLabel: 'TIER 1 — IMMEDIATE' },
  tier2_urgent: { tone: 'warn', icon: <Activity size={28} />, tierLabel: 'TIER 2 — URGENT' },
  tier3_today: { tone: 'accent', icon: <Hourglass size={28} />, tierLabel: 'TIER 3 — TODAY' },
  tier4_onboard: { tone: 'ok', icon: <CheckCircle size={28} />, tierLabel: 'TIER 4 — TREAT ONBOARD' },
};

export function EmergencyTierBadge({ action }: Props) {
  const meta = META[action.tier];
  const styles = {
    critical: 'border-rig-critical bg-rig-critical/15 text-rig-critical glow-critical',
    warn: 'border-rig-critical/60 bg-rig-critical/10 text-rig-critical',
    accent: 'border-rig-accent bg-rig-accent/15 text-rig-accent glow-accent',
    ok: 'border-rig-ok bg-rig-ok/15 text-rig-ok glow-ok',
  }[meta.tone];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={clsx('rounded-md border-2 p-4 flex items-start gap-3', styles)}
    >
      <div className="shrink-0">{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-widest opacity-80">{meta.tierLabel}</div>
        <div className="text-2xl font-bold tracking-wider mt-0.5">{action.label}</div>
        <div className="text-sm text-rig-text mt-1 opacity-90">{action.detail}</div>
        {action.windowMinutes > 0 && (
          <div className="text-[11px] mt-1 opacity-70 font-mono">
            Target window: {action.windowMinutes >= 60 ? `${Math.round(action.windowMinutes / 60)} hour${action.windowMinutes >= 120 ? 's' : ''}` : `${action.windowMinutes} minutes`}
          </div>
        )}
      </div>
    </motion.div>
  );
}

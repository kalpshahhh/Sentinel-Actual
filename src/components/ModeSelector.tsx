import { motion } from 'framer-motion';
import { ClipboardList, FlaskConical, Siren } from 'lucide-react';

export type AppSessionMode = 'demo' | 'live' | 'onboarding';

type Props = {
  onSelect: (mode: AppSessionMode) => void;
};

export function ModeSelector({ onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-rig-bg flex flex-col items-center justify-center p-6 z-50 scanlines"
    >
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="text-xs uppercase tracking-widest text-rig-accent font-mono mb-3">
          SENTINEL MEDICAL SYSTEM · v2
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold uppercase tracking-widest text-rig-text">
          Select Mode
        </h1>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        <ModeCard
          icon={<ClipboardList size={36} />}
          title="Onboarding"
          subtitle="First-time vessel setup"
          badge="SETUP"
          badgeTone="ok"
          cta="Set up vessel"
          tone="ok"
          onClick={() => onSelect('onboarding')}
        />
        <ModeCard
          icon={<FlaskConical size={36} />}
          title="Demo"
          subtitle="Practice & familiarisation"
          badge="SIMULATED"
          badgeTone="accent"
          cta="Enter Demo"
          tone="accent"
          onClick={() => onSelect('demo')}
        />
        <ModeCard
          icon={<Siren size={36} />}
          title="Live"
          subtitle="Real emergency"
          badge="REAL DATA"
          badgeTone="critical"
          cta="Enter Live Mode"
          tone="critical"
          onClick={() => onSelect('live')}
        />
      </div>

      <p className="mt-10 text-[10px] uppercase tracking-widest text-rig-dim font-mono text-center">
        All core incident logic works fully offline · No cloud dependency in active emergency mode
      </p>
    </motion.div>
  );
}

type Tone = 'ok' | 'accent' | 'critical';

function ModeCard({
  icon, title, subtitle, badge, badgeTone, cta, tone, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: Tone;
  cta: string;
  tone: Tone;
  onClick: () => void;
}) {
  const border: Record<Tone, string> = {
    ok: 'border-rig-ok/40 hover:border-rig-ok',
    accent: 'border-rig-accent/40 hover:border-rig-accent',
    critical: 'border-rig-critical/40 hover:border-rig-critical',
  };
  const iconCol: Record<Tone, string> = {
    ok: 'text-rig-ok',
    accent: 'text-rig-accent',
    critical: 'text-rig-critical',
  };
  const badgeCol: Record<Tone, string> = {
    ok: 'text-rig-ok border-rig-ok/40',
    accent: 'text-rig-accent border-rig-accent/40',
    critical: 'text-rig-critical border-rig-critical/40',
  };
  const btnCol: Record<Tone, string> = {
    ok: 'bg-rig-ok hover:bg-rig-ok/85 text-rig-bg',
    accent: 'bg-rig-accent hover:bg-rig-accent/85 text-rig-bg',
    critical: 'bg-rig-critical hover:bg-rig-critical/85 text-rig-text',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`bg-rig-surface border rounded-xl p-6 flex flex-col gap-4 cursor-pointer transition-colors ${border[tone]}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <span className={iconCol[tone]}>{icon}</span>
        <span className={`text-[9px] uppercase tracking-widest border rounded px-2 py-0.5 font-bold ${badgeCol[badgeTone]}`}>
          {badge}
        </span>
      </div>
      <div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-rig-text">{title}</h2>
        <div className="text-[11px] uppercase tracking-widest text-rig-dim mt-1">{subtitle}</div>
      </div>
      <button className={`mt-auto w-full py-3 rounded font-bold uppercase tracking-widest text-sm ${btnCol[tone]}`}>
        {cta}
      </button>
    </motion.div>
  );
}

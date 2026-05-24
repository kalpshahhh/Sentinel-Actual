import clsx from 'clsx';
import { Waves, Moon, Hand, ChevronsRight, Zap, Volume2, VolumeX } from 'lucide-react';
import type { UseEnvironmentReturn } from '../hooks/useEnvironment';
import { useGyro } from '../hooks/useGyro';

type Props = {
  envApi: UseEnvironmentReturn;
  muted: boolean;
  onToggleMute: () => void;
};

export function EnvironmentControls({ envApi, muted, onToggleMute }: Props) {
  const { env, toggleRoughSeas, toggleNightMode, toggleGloved, cycleOneHanded, stressTest } = envApi;
  const gyro = useGyro();

  return (
    <div className="bg-rig-bg/80 backdrop-blur border-t border-rig-dim/20 p-3 space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest text-rig-dim">Environment</span>
        <button
          onClick={onToggleMute}
          className="text-rig-dim hover:text-rig-text"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      </div>

      {/* Real gyro level indicator */}
      {gyro.supported && (
        <div className="bg-rig-surface/40 border border-rig-dim/20 rounded p-2">
          <div className="flex items-center justify-between text-[10px] text-rig-dim uppercase tracking-widest mb-1">
            <span>Device level</span>
            {gyro.needsPermission && gyro.permissionState !== 'granted' && (
              <button
                onClick={() => void gyro.enable()}
                className="px-1.5 py-0.5 bg-rig-accent/15 border border-rig-accent/40 text-rig-accent rounded text-[9px]"
              >
                Enable
              </button>
            )}
          </div>
          <div className="relative h-10 bg-rig-bg rounded border border-rig-dim/30 overflow-hidden">
            {/* horizon line — shifted by pitch, rotated by roll */}
            <div
              className="absolute inset-x-0 top-1/2 h-px bg-rig-ok"
              style={{
                transform: `translateY(${gyro.pitch * 0.3}px) rotate(${gyro.roll}deg)`,
                transition: 'transform 80ms linear',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[9px] text-rig-dim font-mono pointer-events-none">
              pitch {Math.round(gyro.pitch)}° · roll {Math.round(gyro.roll)}° · m {gyro.motionLevel}
            </div>
          </div>
        </div>
      )}

      <ToggleRow icon={<Waves size={14} />} label="Rough Seas" active={env.roughSeas} onClick={toggleRoughSeas} hotkey="R" />
      <ToggleRow icon={<Moon size={14} />} label="Night Vision" active={env.nightMode} onClick={toggleNightMode} hotkey="N" />
      <ToggleRow icon={<Hand size={14} />} label="Gloved Hands" active={env.gloved} onClick={toggleGloved} hotkey="G" />
      <ToggleRow
        icon={<ChevronsRight size={14} />}
        label={`One-Handed: ${env.oneHanded === 'off' ? 'Off' : env.oneHanded === 'right' ? 'Right' : 'Left'}`}
        active={env.oneHanded !== 'off'}
        onClick={cycleOneHanded}
        hotkey="H"
      />

      <button
        onClick={stressTest}
        className="mt-2 w-full text-[10px] uppercase tracking-widest py-1.5 bg-rig-accent/15 hover:bg-rig-accent/25 border border-rig-accent/40 text-rig-accent rounded flex items-center justify-center gap-1.5"
      >
        <Zap size={12} /> Stress Test [S]
      </button>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  active,
  onClick,
  hotkey,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  hotkey?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded border text-xs',
        active
          ? 'bg-rig-accent/15 border-rig-accent/50 text-rig-accent'
          : 'bg-rig-surface/40 border-rig-dim/20 text-rig-text hover:bg-rig-surface'
      )}
    >
      <span className="flex items-center gap-2 truncate">
        <span className={clsx(active ? 'text-rig-accent' : 'text-rig-dim')}>{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        {hotkey && <span className="text-[9px] text-rig-dim font-mono">[{hotkey}]</span>}
        <span
          className={clsx(
            'inline-block w-7 h-3.5 rounded-full relative transition-colors',
            active ? 'bg-rig-accent' : 'bg-rig-dim/40'
          )}
        >
          <span
            className={clsx(
              'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-rig-bg transition-all',
              active ? 'left-3.5' : 'left-0.5'
            )}
          />
        </span>
      </span>
    </button>
  );
}

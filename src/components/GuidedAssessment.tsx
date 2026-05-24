import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Activity, CheckCircle, Heart, Hourglass, Thermometer, Eye } from 'lucide-react';

export type Alertness = 'alert' | 'drowsy' | 'confused' | 'unresponsive';
export type Breathing = 'normal' | 'fast' | 'slow' | 'labored';
export type SkinColor = 'pink' | 'pale' | 'blue' | 'flushed';
export type SkinTemp = 'warm' | 'cool' | 'cold' | 'clammy';
export type PulseBucket = 'slow' | 'normal' | 'fast' | 'very_fast';

export type AssessmentResult = {
  alertness: Alertness | null;
  breathing: Breathing | null;
  breathsIn15s: number | null;
  pulseBeatsIn15s: number | null;
  pulseBucket: PulseBucket | null;
  skinColor: SkinColor | null;
  skinTemp: SkinTemp | null;
  pain_0_10: number;
  temperatureC: number | null;
};

type Props = {
  hasThermometer: boolean;
  result: AssessmentResult;
  onChange: (r: AssessmentResult) => void;
  onStepComplete?: (label: string, value: string | number) => void;
};

const DEFAULT: AssessmentResult = {
  alertness: null,
  breathing: null,
  breathsIn15s: null,
  pulseBeatsIn15s: null,
  pulseBucket: null,
  skinColor: null,
  skinTemp: null,
  pain_0_10: 5,
  temperatureC: null,
};

export function GuidedAssessment({ hasThermometer, result, onChange, onStepComplete }: Props) {
  return (
    <div className="space-y-3">
      <Step
        index={1}
        title="Are they awake and talking normally?"
        helper="Speak to them. Tap their shoulder. If they don't respond, shout their name."
        complete={result.alertness !== null}
      >
        <OptionGrid
          options={[
            { value: 'alert', label: 'Wide awake, talking normally' },
            { value: 'drowsy', label: 'Sleepy, hard to keep awake' },
            { value: 'confused', label: 'Awake but confused' },
            { value: 'unresponsive', label: "Won't wake up" },
          ]}
          selected={result.alertness}
          onSelect={(v) => {
            onChange({ ...result, alertness: v as Alertness });
            onStepComplete?.('Alertness', v);
          }}
          tone={(v) => (v === 'unresponsive' ? 'critical' : v === 'confused' ? 'warn' : 'ok')}
        />
      </Step>

      <Step
        index={2}
        title="Count their breaths for 15 seconds"
        helper="Watch their chest rise and fall. One breath in + out counts as one. We'll multiply by 4 for you."
        complete={result.breathing !== null}
      >
        <BreathingCounter
          value={result.breathsIn15s}
          onSet={(beats) => {
            const rate = beats * 4;
            const bucket: Breathing = rate < 12 ? 'slow' : rate > 24 ? 'fast' : 'normal';
            onChange({ ...result, breathsIn15s: beats, breathing: bucket });
            onStepComplete?.('Breathing', `${rate}/min (${bucket})`);
          }}
        />
        {result.breathing && (
          <BreathingNote breathing={result.breathing} rate={(result.breathsIn15s ?? 0) * 4} />
        )}
      </Step>

      <Step
        index={3}
        title="Feel their pulse at the wrist for 15 seconds"
        helper="Place two fingers (not your thumb) on the inside of their wrist below the thumb. Count each beat."
        complete={result.pulseBucket !== null}
      >
        <PulseCounter
          value={result.pulseBeatsIn15s}
          onSet={(beats) => {
            const rate = beats * 4;
            const bucket: PulseBucket =
              rate < 50 ? 'slow' : rate > 120 ? 'very_fast' : rate > 100 ? 'fast' : 'normal';
            onChange({ ...result, pulseBeatsIn15s: beats, pulseBucket: bucket });
            onStepComplete?.('Pulse', `${rate}/min (${bucket.replace('_', ' ')})`);
          }}
        />
        {result.pulseBucket && (
          <PulseNote bucket={result.pulseBucket} rate={(result.pulseBeatsIn15s ?? 0) * 4} />
        )}
      </Step>

      <Step
        index={4}
        title="What does their skin look and feel like?"
        helper="Look at the lips and fingernail beds. Touch the back of their hand."
        complete={result.skinColor !== null && result.skinTemp !== null}
      >
        <div className="space-y-2">
          <SubField label="Colour">
            <OptionGrid
              options={[
                { value: 'pink', label: 'Pink / normal' },
                { value: 'pale', label: 'Pale / white' },
                { value: 'blue', label: 'Blue around lips' },
                { value: 'flushed', label: 'Red / flushed' },
              ]}
              selected={result.skinColor}
              onSelect={(v) => {
                onChange({ ...result, skinColor: v as SkinColor });
                onStepComplete?.('Skin color', v);
              }}
              tone={(v) => (v === 'blue' ? 'critical' : v === 'pale' ? 'warn' : 'ok')}
            />
          </SubField>
          <SubField label="Temperature & moisture">
            <OptionGrid
              options={[
                { value: 'warm', label: 'Warm & dry' },
                { value: 'cool', label: 'Cool & dry' },
                { value: 'cold', label: 'Cold' },
                { value: 'clammy', label: 'Sweaty / clammy' },
              ]}
              selected={result.skinTemp}
              onSelect={(v) => {
                onChange({ ...result, skinTemp: v as SkinTemp });
                onStepComplete?.('Skin temp', v);
              }}
              tone={(v) => (v === 'cold' || v === 'clammy' ? 'warn' : 'ok')}
            />
          </SubField>
        </div>
      </Step>

      <Step
        index={5}
        title="How bad is the pain — 0 to 10?"
        helper="0 = no pain, 10 = worst pain ever felt"
        complete
      >
        <PainSlider value={result.pain_0_10} onChange={(v) => onChange({ ...result, pain_0_10: v })} />
      </Step>

      <Step
        index={6}
        title={hasThermometer ? 'Point the infrared thermometer at their forehead' : 'Feel their forehead'}
        helper={hasThermometer ? 'Hold 2-5 cm from forehead. Press the button. Wait for the beep.' : 'Use the back of your hand against their forehead.'}
        complete={result.temperatureC !== null}
      >
        {hasThermometer ? (
          <TemperatureInput
            value={result.temperatureC}
            onSet={(c) => {
              onChange({ ...result, temperatureC: c });
              onStepComplete?.('Temperature', `${c.toFixed(1)}°C`);
            }}
          />
        ) : (
          <OptionGrid
            options={[
              { value: '36.8', label: 'Normal — same as yours' },
              { value: '38', label: 'Warm — feels hot' },
              { value: '39.5', label: 'Burning hot' },
              { value: '35', label: 'Cold' },
            ]}
            selected={result.temperatureC ? String(result.temperatureC) : null}
            onSelect={(v) => {
              const c = parseFloat(v);
              onChange({ ...result, temperatureC: c });
              onStepComplete?.('Temperature (felt)', `~${c}°C`);
            }}
            tone={(v) => {
              const c = parseFloat(v);
              return c >= 38.5 ? 'warn' : c < 36 ? 'warn' : 'ok';
            }}
          />
        )}
      </Step>
    </div>
  );
}

GuidedAssessment.DEFAULT = DEFAULT;

// ============ Sub-components ============

function Step({
  index,
  title,
  helper,
  complete,
  children,
}: {
  index: number;
  title: string;
  helper: string;
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'border rounded-md p-3',
        complete ? 'border-rig-ok/40 bg-rig-ok/5' : 'border-rig-dim/30 bg-rig-surface/40'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className={clsx(
            'w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-mono shrink-0',
            complete
              ? 'border-rig-ok bg-rig-ok/20 text-rig-ok'
              : 'border-rig-accent bg-rig-accent/20 text-rig-accent'
          )}
        >
          {complete ? <CheckCircle size={12} /> : index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-rig-text">{title}</div>
          <div className="text-[11px] text-rig-dim mt-0.5">{helper}</div>
        </div>
      </div>
      <div className="ml-8">{children}</div>
    </div>
  );
}

function SubField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-1">{label}</div>
      {children}
    </div>
  );
}

function OptionGrid<T extends string>({
  options,
  selected,
  onSelect,
  tone,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T | null;
  onSelect: (v: T) => void;
  tone?: (v: T) => 'ok' | 'warn' | 'critical';
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {options.map((o) => {
        const isSel = selected === o.value;
        const t = tone ? tone(o.value) : 'ok';
        const selColor =
          t === 'critical'
            ? 'bg-rig-critical text-rig-text border-rig-critical'
            : t === 'warn'
            ? 'bg-rig-accent text-rig-bg border-rig-accent'
            : 'bg-rig-ok text-rig-bg border-rig-ok';
        return (
          <button
            key={o.value}
            onClick={() => onSelect(o.value)}
            className={clsx(
              'px-3 py-2 rounded border text-xs text-left transition-colors',
              isSel ? selColor : 'bg-rig-surface border-rig-dim/30 text-rig-text hover:bg-rig-bg'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function BreathingCounter({ value, onSet }: { value: number | null; onSet: (beats: number) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);

  const start = useCallback(() => {
    setRunning(true);
    setCount(0);
    setElapsed(0);
    startTime.current = Date.now();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!startTime.current) return;
      const e = (Date.now() - startTime.current) / 1000;
      setElapsed(e);
      if (e >= 15) {
        setRunning(false);
        onSet(count);
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, count, onSet]);

  const tap = () => {
    if (running) setCount((c) => c + 1);
  };

  return (
    <div className="flex items-center gap-2">
      {!running && value === null && (
        <button
          onClick={start}
          className="px-3 py-2 bg-rig-accent text-rig-bg text-xs uppercase tracking-widest rounded font-bold flex items-center gap-1.5"
        >
          <Hourglass size={12} /> Start 15-sec timer
        </button>
      )}
      {running && (
        <>
          <div className="text-[10px] text-rig-dim font-mono">
            {(15 - elapsed).toFixed(1)}s left
          </div>
          <button
            onClick={tap}
            className="px-4 py-3 bg-rig-accent text-rig-bg text-sm uppercase tracking-widest rounded font-bold"
          >
            TAP per breath ({count})
          </button>
        </>
      )}
      {!running && value !== null && (
        <div className="flex items-center gap-2">
          <div className="text-xs text-rig-text">
            <span className="font-mono text-rig-accent">{value * 4}</span>/min
          </div>
          <button
            onClick={start}
            className="text-[10px] text-rig-dim hover:text-rig-text underline"
          >
            redo
          </button>
        </div>
      )}
    </div>
  );
}

function BreathingNote({ breathing, rate }: { breathing: Breathing; rate: number }) {
  const map: Record<Breathing, { label: string; tone: 'ok' | 'warn' | 'critical' }> = {
    normal: { label: 'Normal breathing rate.', tone: 'ok' },
    fast: { label: 'Breathing fast. Watch for distress.', tone: 'warn' },
    slow: { label: 'Breathing slowly. Watch closely.', tone: 'warn' },
    labored: { label: 'Breathing is labored — concerning.', tone: 'critical' },
  };
  const info = map[breathing];
  return (
    <div
      className={clsx(
        'mt-2 text-[11px] flex items-center gap-1.5',
        info.tone === 'critical' ? 'text-rig-critical' : info.tone === 'warn' ? 'text-rig-accent' : 'text-rig-ok'
      )}
    >
      <Activity size={11} />
      {rate}/min — {info.label}
    </div>
  );
}

function PulseCounter({ value, onSet }: { value: number | null; onSet: (beats: number) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);

  const start = useCallback(() => {
    setRunning(true);
    setCount(0);
    setElapsed(0);
    startTime.current = Date.now();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!startTime.current) return;
      const e = (Date.now() - startTime.current) / 1000;
      setElapsed(e);
      if (e >= 15) {
        setRunning(false);
        onSet(count);
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, count, onSet]);

  const tap = () => {
    if (running) setCount((c) => c + 1);
  };

  return (
    <div className="flex items-center gap-2">
      {!running && value === null && (
        <button
          onClick={start}
          className="px-3 py-2 bg-rig-accent text-rig-bg text-xs uppercase tracking-widest rounded font-bold flex items-center gap-1.5"
        >
          <Heart size={12} /> Start 15-sec timer
        </button>
      )}
      {running && (
        <>
          <div className="text-[10px] text-rig-dim font-mono">{(15 - elapsed).toFixed(1)}s left</div>
          <button
            onClick={tap}
            className="px-4 py-3 bg-rig-accent text-rig-bg text-sm uppercase tracking-widest rounded font-bold"
          >
            TAP per beat ({count})
          </button>
        </>
      )}
      {!running && value !== null && (
        <div className="flex items-center gap-2">
          <div className="text-xs text-rig-text">
            <span className="font-mono text-rig-accent">{value * 4}</span>/min
          </div>
          <button onClick={start} className="text-[10px] text-rig-dim hover:text-rig-text underline">
            redo
          </button>
        </div>
      )}
    </div>
  );
}

function PulseNote({ bucket, rate }: { bucket: PulseBucket; rate: number }) {
  const map: Record<PulseBucket, { label: string; tone: 'ok' | 'warn' | 'critical' }> = {
    slow: { label: 'Pulse is slow.', tone: 'warn' },
    normal: { label: 'Pulse is normal.', tone: 'ok' },
    fast: { label: 'Pulse is fast — pain or fear can do this. Watch closely.', tone: 'warn' },
    very_fast: { label: 'Pulse is very fast — major concern.', tone: 'critical' },
  };
  const info = map[bucket];
  return (
    <div
      className={clsx(
        'mt-2 text-[11px] flex items-center gap-1.5',
        info.tone === 'critical' ? 'text-rig-critical' : info.tone === 'warn' ? 'text-rig-accent' : 'text-rig-ok'
      )}
    >
      <Heart size={11} />
      {rate}/min — {info.label}
    </div>
  );
}

function PainSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-rig-accent"
      />
      <div className="grid grid-cols-11 gap-0.5 mt-1 text-[9px] font-mono">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            className={clsx('text-center py-0.5 rounded', i === value ? 'bg-rig-accent text-rig-bg' : 'text-rig-dim')}
          >
            {i}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-rig-dim mt-1">
        <span>no pain</span>
        <span>worst pain</span>
      </div>
    </div>
  );
}

function TemperatureInput({ value, onSet }: { value: number | null; onSet: (c: number) => void }) {
  const [reading, setReading] = useState<number | null>(value);
  const [scanning, setScanning] = useState(false);

  const scan = () => {
    setScanning(true);
    setTimeout(() => {
      // Simulated thermometer reading (37.1°C with jitter — matches our renal-colic demo)
      const c = 37.1 + (Math.random() * 0.4 - 0.2);
      const rounded = Math.round(c * 10) / 10;
      setReading(rounded);
      setScanning(false);
      onSet(rounded);
    }, 1200);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={scan}
        disabled={scanning}
        className={clsx(
          'px-3 py-2 text-xs uppercase tracking-widest rounded font-bold flex items-center gap-1.5',
          scanning
            ? 'bg-rig-dim/30 text-rig-dim cursor-wait'
            : 'bg-rig-accent text-rig-bg hover:bg-rig-accent/85'
        )}
      >
        <Thermometer size={12} />
        {scanning ? 'Reading…' : reading !== null ? 'Re-scan' : 'Scan now'}
      </button>
      <AnimatePresence>
        {reading !== null && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 text-rig-text"
          >
            <Eye size={11} className="text-rig-accent" />
            <span className="font-mono text-base text-rig-accent">{reading.toFixed(1)}°C</span>
            <span className="text-[10px] text-rig-dim">
              ({reading >= 38.5 ? 'fever' : reading < 36 ? 'low' : 'normal'})
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

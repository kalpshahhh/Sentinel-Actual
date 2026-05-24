import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ArrowLeft, CheckCircle, Clock, Hourglass, AlertTriangle, Pill } from 'lucide-react';
import type { Scenario } from '../types';
import { buildDoseSchedule, type DoseSchedule } from '../data/protocols';
import { findDrugLocation } from '../data/equipment-lookup';

type Props = {
  scenario: Scenario;
  helpInHours: number;
  startedAt: Date;
  onFinish: () => void;
  onBack: () => void;
};

function fmtClock(d: Date): string {
  return d.toTimeString().slice(0, 5);
}
function fmtRelative(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < -60_000) {
    const mins = Math.round(-diffMs / 60_000);
    return mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
  }
  if (diffMs < 60_000) return 'NOW';
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `in ${hours} h` : `in ${hours} h ${rem} min`;
}

export function WaitChecklist({ scenario, helpInHours, startedAt, onFinish, onBack }: Props) {
  const schedules = buildDoseSchedule(scenario, helpInHours, startedAt);
  const [now, setNow] = useState(new Date());
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const helpArrival = new Date(startedAt.getTime() + helpInHours * 3600_000);
  const helpInMin = Math.max(0, Math.round((helpArrival.getTime() - now.getTime()) / 60_000));

  // Build a flat timeline of all events (doses + check-ins)
  const events: Array<{ key: string; time: Date; scheduleIdx: number; doseIdx: number; isCheckIn?: boolean }> = [];
  schedules.forEach((sch, scheduleIdx) => {
    sch.doseTimes.forEach((t, doseIdx) => {
      events.push({ key: `${sch.step.id}_${doseIdx}`, time: t, scheduleIdx, doseIdx });
    });
  });
  // Add check-in events every 30 min
  const checkInterval = 30 * 60_000;
  let t = startedAt.getTime() + checkInterval;
  let n = 1;
  while (t < helpArrival.getTime()) {
    events.push({ key: `checkin_${n}`, time: new Date(t), scheduleIdx: -1, doseIdx: 0, isCheckIn: true });
    t += checkInterval;
    n++;
  }
  events.sort((a, b) => a.time.getTime() - b.time.getTime());

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      {/* Heading */}
      <div className="text-center mb-2 text-[11px] uppercase tracking-widest text-rig-ok font-mono">
        <CheckCircle className="inline mr-1" size={11} />
        Immediate treatment done · waiting for evacuation
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-rig-text text-center">
        While we wait for help
      </h1>
      <p className="text-rig-dim text-center text-sm mt-1">
        Help arrives at <span className="text-rig-accent font-mono">{fmtClock(helpArrival)}</span> ({helpInMin} min from now). Here's the timed plan.
      </p>

      {/* Help countdown banner */}
      <div className="mt-4 bg-rig-accent/10 border border-rig-accent/40 rounded-md p-3 flex items-center gap-3 glow-accent">
        <Hourglass size={20} className="text-rig-accent shrink-0" />
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-widest text-rig-accent">ETA help</div>
          <div className="text-lg font-bold text-rig-text font-mono">
            {fmtClock(helpArrival)} · {helpInMin} min
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-rig-dim">started</div>
          <div className="text-sm font-mono text-rig-text">{fmtClock(startedAt)}</div>
        </div>
      </div>

      {/* Per-drug schedule summary */}
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
          <Pill size={11} /> Computed schedule (based on when help arrives)
        </div>
        <ul className="space-y-2">
          {schedules.filter((s) => s.totalDoses > 0).map((sch, i) => (
            <ScheduleSummary key={i} sch={sch} />
          ))}
        </ul>
      </div>

      {/* Timed event timeline */}
      <div className="mt-6">
        <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
          <Clock size={11} /> Timeline — tick off each item as you do it
        </div>
        <ol className="relative space-y-2 pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-rig-dim/30" />
          {events.map((ev) => {
            const isChecked = !!checked[ev.key];
            const isPast = ev.time.getTime() < now.getTime() - 60_000;
            const isNow = !isPast && ev.time.getTime() < now.getTime() + 60_000;
            if (ev.isCheckIn) {
              return (
                <li key={ev.key} className="relative">
                  <span
                    className={clsx(
                      'absolute -left-[18px] top-2 w-3 h-3 rounded-full border bg-rig-bg',
                      isNow ? 'border-rig-accent' : 'border-rig-dim/50'
                    )}
                  />
                  <label className="flex items-start gap-2 bg-rig-surface/40 border border-rig-dim/20 rounded p-2 cursor-pointer hover:bg-rig-surface">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => setChecked((c) => ({ ...c, [ev.key]: !c[ev.key] }))}
                      className="mt-1 accent-rig-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={clsx('font-mono text-xs', isNow ? 'text-rig-accent' : 'text-rig-dim')}>
                          {fmtClock(ev.time)}
                        </span>
                        <span className={clsx('text-[10px] font-mono', isNow ? 'text-rig-accent' : 'text-rig-dim')}>
                          {fmtRelative(ev.time, now)}
                        </span>
                      </div>
                      <div className="text-xs text-rig-text mt-0.5">
                        Quick check: ask how the pain is now, feel forehead for fever, check pulse, check breathing.
                      </div>
                    </div>
                  </label>
                </li>
              );
            }
            const sch = schedules[ev.scheduleIdx];
            const step = sch.step;
            const drugLoc = step.drug ? findDrugLocation(step.drug) : null;
            return (
              <li key={ev.key} className="relative">
                <span
                  className={clsx(
                    'absolute -left-[19px] top-2 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    isChecked
                      ? 'bg-rig-ok/40 border-rig-ok'
                      : isNow
                      ? 'bg-rig-accent/30 border-rig-accent'
                      : 'bg-rig-bg border-rig-dim/50'
                  )}
                >
                  {isChecked && <CheckCircle size={10} className="text-rig-ok" />}
                </span>
                <label
                  className={clsx(
                    'flex items-start gap-2 rounded p-2 cursor-pointer',
                    isChecked
                      ? 'bg-rig-ok/10 border border-rig-ok/30'
                      : isNow
                      ? 'bg-rig-accent/10 border border-rig-accent/40'
                      : 'bg-rig-surface/40 border border-rig-dim/20 hover:bg-rig-surface'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => setChecked((c) => ({ ...c, [ev.key]: !c[ev.key] }))}
                    className="mt-1 accent-rig-ok"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={clsx('font-mono text-xs font-bold', isNow ? 'text-rig-accent' : 'text-rig-text')}>
                        {fmtClock(ev.time)}
                      </span>
                      <span className={clsx('text-[10px] font-mono', isNow ? 'text-rig-accent' : 'text-rig-dim')}>
                        {fmtRelative(ev.time, now)}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-rig-dim font-mono">
                        Dose {ev.doseIdx + 1} of {sch.totalDoses}
                      </span>
                    </div>
                    <div className="text-sm text-rig-text mt-0.5">{step.action}</div>
                    {step.drug && (
                      <div className="text-[12px] font-mono text-rig-accent mt-1">
                        {step.drug} · {step.dose} · {step.route}
                      </div>
                    )}
                    {drugLoc && (
                      <div className="text-[11px] text-rig-ok mt-0.5 flex items-center gap-1">
                        <CheckCircle size={10} /> {drugLoc.location}
                        {drugLoc.locked && (
                          <span className="ml-1 px-1 py-0.5 bg-rig-critical/20 border border-rig-critical/40 rounded text-[9px] text-rig-critical">
                            LOCKED
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </li>
            );
          })}

          {/* Help-arrives marker */}
          <li className="relative">
            <span className="absolute -left-[18px] top-2 w-3 h-3 rounded-full border-2 border-rig-ok bg-rig-ok/30" />
            <div className="bg-rig-ok/15 border border-rig-ok/40 rounded p-2 flex items-baseline gap-2">
              <span className="font-mono text-xs font-bold text-rig-ok">{fmtClock(helpArrival)}</span>
              <span className="text-sm text-rig-text font-bold">HELP ARRIVES — hand over the patient + this app's audit log</span>
            </div>
          </li>
        </ol>
      </div>

      {/* Red flags reminder */}
      <div className="mt-6 bg-rig-critical/10 border border-rig-critical/30 rounded p-3">
        <div className="text-[10px] uppercase tracking-widest text-rig-critical mb-1 flex items-center gap-1.5">
          <AlertTriangle size={11} /> Call the captain immediately if any of these happen
        </div>
        <ul className="text-xs text-rig-text space-y-1 list-disc pl-5">
          {scenario.evacuateIf.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-3 text-xs uppercase tracking-widest text-rig-dim hover:text-rig-text flex items-center gap-1"
        >
          <ArrowLeft size={11} /> change ETA
        </button>
        <button
          onClick={onFinish}
          className="flex-1 px-5 py-4 bg-rig-ok text-rig-bg rounded font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-rig-ok/85"
        >
          <CheckCircle size={16} />
          Plan locked — generate handoff note for the on-shore doctor
        </button>
      </div>
    </motion.div>
  );
}

function ScheduleSummary({ sch }: { sch: DoseSchedule }) {
  return (
    <li className="bg-rig-surface/40 border border-rig-dim/20 rounded p-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm text-rig-text font-bold">{sch.step.drug ?? sch.step.action}</span>
        {sch.step.dose && <span className="text-xs font-mono text-rig-accent">{sch.step.dose}</span>}
      </div>
      <div className="text-[11px] text-rig-dim mt-1">{sch.summary}</div>
      {sch.intervalHours !== null && (
        <div className="text-[10px] font-mono text-rig-dim mt-0.5">
          Times: {sch.doseTimes.map((d) => d.toTimeString().slice(0, 5)).join(' · ')}
        </div>
      )}
    </li>
  );
}

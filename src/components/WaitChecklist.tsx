import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ArrowLeft, CheckCircle, Clock, Hourglass, AlertTriangle, Pill, ChevronRight } from 'lucide-react';
import type { Scenario } from '../types';
import { buildDoseSchedule } from '../data/protocols';
import { findDrugLocation } from '../data/equipment-lookup';

type Props = {
  scenario: Scenario;
  helpInHours: number;
  startedAt: Date;
  onFinish: () => void;
  onBack: () => void;
};

type Event = {
  key: string;
  time: Date;
  scheduleIdx: number;
  doseIdx: number;
  isCheckIn?: boolean;
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

  // Build sorted event list
  const events: Event[] = [];
  schedules.forEach((sch, scheduleIdx) => {
    sch.doseTimes.forEach((t, doseIdx) => {
      events.push({ key: `${sch.step.id}_${doseIdx}`, time: t, scheduleIdx, doseIdx });
    });
  });
  const checkInterval = 30 * 60_000;
  let t = startedAt.getTime() + checkInterval;
  let n = 1;
  while (t < helpArrival.getTime()) {
    events.push({ key: `checkin_${n}`, time: new Date(t), scheduleIdx: -1, doseIdx: 0, isCheckIn: true });
    t += checkInterval;
    n++;
  }
  events.sort((a, b) => a.time.getTime() - b.time.getTime());

  // The hero item: first unchecked item, or next upcoming
  const heroIdx = events.findIndex((ev) => !checked[ev.key]);
  const heroEvent = heroIdx >= 0 ? events[heroIdx] : null;

  const toggle = (key: string) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">

      {/* Help countdown banner */}
      <div className="bg-rig-accent/10 border border-rig-accent/40 rounded-md p-3 flex items-center gap-3 glow-accent mb-4">
        <Hourglass size={20} className="text-rig-accent shrink-0" />
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-widest text-rig-accent">Help arrives at</div>
          <div className="text-lg font-bold text-rig-text font-mono">
            {fmtClock(helpArrival)} · {helpInMin > 0 ? `${helpInMin} min` : 'now'}
          </div>
        </div>
        <div className="text-right text-[10px] font-mono text-rig-dim">
          <div>Started {fmtClock(startedAt)}</div>
          <div>{scenario.shortHeadline ?? scenario.condition}</div>
        </div>
      </div>

      {/* HERO — next action */}
      <AnimatePresence mode="wait">
        {heroEvent ? (
          <motion.div
            key={heroEvent.key}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              'rounded-lg border-2 p-5 mb-5',
              heroEvent.isCheckIn
                ? 'border-rig-accent/60 bg-rig-accent/8'
                : 'border-rig-accent/80 bg-rig-accent/10 glow-accent'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest text-rig-accent font-mono">Next action</span>
              <span className="ml-auto font-mono text-sm font-bold text-rig-accent">{fmtClock(heroEvent.time)}</span>
              <span className="text-[10px] font-mono text-rig-accent">{fmtRelative(heroEvent.time, now)}</span>
            </div>
            {heroEvent.isCheckIn ? (
              <>
                <h3 className="text-xl font-bold text-rig-text mb-1">Quick check-in</h3>
                <p className="text-sm text-rig-dim">Ask how the pain is (0-10 scale) · Feel forehead for fever · Check pulse and breathing rate · Ask when they last urinated.</p>
              </>
            ) : (
              (() => {
                const sch = schedules[heroEvent.scheduleIdx];
                const step = sch?.step;
                const drugLoc = step?.drug ? findDrugLocation(step.drug) : null;
                return (
                  <>
                    <h3 className="text-xl font-bold text-rig-text mb-1">{step?.action}</h3>
                    {step?.drug && (
                      <div className="mt-2 flex items-center gap-2 font-mono text-rig-accent text-sm">
                        <Pill size={13} />
                        {step.drug} · {step.dose} · {step.route}
                        <span className="text-rig-dim text-[10px]">
                          (dose {heroEvent.doseIdx + 1} of {sch.totalDoses})
                        </span>
                      </div>
                    )}
                    {drugLoc && (
                      <div className="text-[12px] text-rig-ok mt-1 flex items-center gap-1">
                        <CheckCircle size={11} /> {drugLoc.location}
                        {drugLoc.locked && <span className="ml-1 px-1 py-0.5 bg-rig-critical/20 border border-rig-critical/40 rounded text-[9px] text-rig-critical">LOCKED</span>}
                      </div>
                    )}
                  </>
                );
              })()
            )}
            <button
              onClick={() => toggle(heroEvent.key)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-rig-ok text-rig-bg rounded font-bold uppercase tracking-widest text-sm hover:bg-rig-ok/85"
            >
              <CheckCircle size={16} /> Mark done — next step
              <ChevronRight size={16} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="all_done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border-2 border-rig-ok/60 bg-rig-ok/10 p-5 mb-5 text-center"
          >
            <CheckCircle size={32} className="text-rig-ok mx-auto mb-2" />
            <div className="text-lg font-bold text-rig-text">All actions done</div>
            <p className="text-sm text-rig-dim mt-1">Help arrives at {fmtClock(helpArrival)}. Stay with the patient.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full timeline — compact, scrollable */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-widest text-rig-dim mb-2 flex items-center gap-1.5">
          <Clock size={11} /> Full timeline — tick off as you go
        </div>
        <ol className="relative space-y-1.5 pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-rig-dim/30" />
          {events.map((ev) => {
            const isChecked = !!checked[ev.key];
            const isHero = ev.key === heroEvent?.key;
            const isPast = ev.time.getTime() < now.getTime() - 60_000;

            return (
              <li key={ev.key} className="relative">
                <span className={clsx(
                  'absolute -left-[19px] top-2.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
                  isChecked ? 'bg-rig-ok/40 border-rig-ok' : isHero ? 'bg-rig-accent/40 border-rig-accent' : 'bg-rig-bg border-rig-dim/50'
                )}>
                  {isChecked && <CheckCircle size={9} className="text-rig-ok" />}
                </span>
                <label className={clsx(
                  'flex items-start gap-2 rounded p-2 cursor-pointer transition-colors',
                  isChecked ? 'bg-rig-ok/8 border border-rig-ok/20 opacity-60' : isHero ? 'bg-rig-accent/5 border border-rig-accent/20' : 'bg-rig-surface/30 border border-transparent hover:bg-rig-surface/60'
                )}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(ev.key)}
                    className="mt-0.5 accent-rig-ok"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={clsx('font-mono text-[11px] font-bold', isHero ? 'text-rig-accent' : isPast ? 'text-rig-dim' : 'text-rig-text')}>
                        {fmtClock(ev.time)}
                      </span>
                      <span className={clsx('text-[10px] font-mono', isHero ? 'text-rig-accent' : 'text-rig-dim')}>
                        {fmtRelative(ev.time, now)}
                      </span>
                      {!ev.isCheckIn && (
                        <span className="text-[9px] text-rig-dim uppercase tracking-widest">
                          Dose {ev.doseIdx + 1}/{schedules[ev.scheduleIdx]?.totalDoses}
                        </span>
                      )}
                    </div>
                    <div className={clsx('text-xs mt-0.5', isChecked ? 'line-through text-rig-dim' : 'text-rig-text')}>
                      {ev.isCheckIn ? 'Quick check-in' : schedules[ev.scheduleIdx]?.step.action}
                    </div>
                    {!ev.isCheckIn && schedules[ev.scheduleIdx]?.step.drug && (
                      <div className="text-[10px] font-mono text-rig-accent">
                        {schedules[ev.scheduleIdx].step.drug} · {schedules[ev.scheduleIdx].step.dose}
                      </div>
                    )}
                  </div>
                </label>
              </li>
            );
          })}

          {/* Help arrives */}
          <li className="relative">
            <span className="absolute -left-[18px] top-2 w-3 h-3 rounded-full border-2 border-rig-ok bg-rig-ok/30" />
            <div className="bg-rig-ok/15 border border-rig-ok/40 rounded p-2 flex items-baseline gap-2">
              <span className="font-mono text-xs font-bold text-rig-ok">{fmtClock(helpArrival)}</span>
              <span className="text-xs text-rig-text font-bold">HELP ARRIVES — hand over the patient + this app's audit log</span>
            </div>
          </li>
        </ol>
      </div>

      {/* Red flags */}
      <div className="bg-rig-critical/10 border border-rig-critical/30 rounded p-3 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-rig-critical mb-1 flex items-center gap-1.5">
          <AlertTriangle size={11} /> Call the captain immediately if any of these happen
        </div>
        <ul className="text-xs text-rig-text space-y-1 list-disc pl-5">
          {scenario.evacuateIf.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>

      <div className="flex gap-3">
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
          Generate handoff note for the doctor
        </button>
      </div>
    </motion.div>
  );
}

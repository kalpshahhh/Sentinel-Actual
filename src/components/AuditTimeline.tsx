import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clipboard,
  FileText,
  Radio,
  Stethoscope,
} from 'lucide-react';
import type { AuditEntry, AuditEntryType } from '../types';

type Props = {
  entries: AuditEntry[];
};

const TYPE_META: Record<AuditEntryType, { color: string; label: string; icon: React.ReactNode }> = {
  input: { color: 'text-rig-text', label: 'INPUT', icon: <Clipboard size={11} /> },
  decision: { color: 'text-rig-accent', label: 'DECISION', icon: <CheckCircle size={11} /> },
  llm_call: { color: 'text-rig-accent', label: 'LLM CALL', icon: <Radio size={11} /> },
  citation_lookup: { color: 'text-rig-ok', label: 'CITATION', icon: <FileText size={11} /> },
  override_available: { color: 'text-rig-critical', label: 'OVERRIDE', icon: <AlertTriangle size={11} /> },
  recommendation: { color: 'text-rig-accent', label: 'RECO', icon: <Stethoscope size={11} /> },
};

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  } catch {
    return iso;
  }
}

export function AuditTimeline({ entries }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [entries]
  );

  if (sorted.length === 0) {
    return (
      <div className="text-xs text-rig-dim italic p-4 border border-dashed border-rig-dim/30 rounded">
        No audit entries yet.
      </div>
    );
  }

  return (
    <ol className="relative">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-rig-dim/20" />
      {sorted.map((e) => {
        const meta = TYPE_META[e.type];
        const isOpen = expandedId === e.id;
        return (
          <li key={e.id} className="relative pl-8 pr-2 py-1.5">
            <span
              className={clsx(
                'absolute left-1.5 top-2 w-3 h-3 rounded-full border bg-rig-bg',
                meta.color === 'text-rig-text' ? 'border-rig-dim/50' : meta.color.replace('text-', 'border-')
              )}
            >
              <span className={clsx('absolute inset-0.5 rounded-full', meta.color.replace('text-', 'bg-'), 'opacity-70')} />
            </span>
            <button
              onClick={() => setExpandedId(isOpen ? null : e.id)}
              className="w-full text-left"
            >
              <div className="flex items-baseline gap-2 text-[10px] font-mono">
                <span className="text-rig-dim">{fmtTime(e.timestamp)}</span>
                <span className={clsx('uppercase tracking-widest flex items-center gap-1', meta.color)}>
                  {meta.icon}
                  {meta.label}
                </span>
                <span className="text-[9px] text-rig-dim uppercase tracking-wider">{e.mode}</span>
              </div>
              <div className={clsx('text-xs mt-0.5', isOpen ? 'text-rig-text' : 'text-rig-text/90')}>
                {e.description}
              </div>
              {isOpen && e.data !== undefined && (
                <pre className="mt-1 text-[10px] text-rig-dim font-mono bg-rig-bg/60 border border-rig-dim/20 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(e.data, null, 2)}
                </pre>
              )}
            </button>
          </li>
        );
      })}
      <div className="pl-8 pt-2 text-[10px] text-rig-dim font-mono flex items-center gap-1.5 border-t border-rig-dim/20 mt-2">
        <Activity size={11} className="text-rig-ok" />
        {sorted.length} entries · regulatory chain-of-custody
      </div>
    </ol>
  );
}

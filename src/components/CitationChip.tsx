import { createContext, useCallback, useContext, useState } from 'react';
import { FileText, X } from 'lucide-react';
import clsx from 'clsx';
import { getCitation } from '../data/citations';

type CitationCtx = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const Ctx = createContext<CitationCtx | null>(null);

/**
 * Wrap a region of citation chips with this so only ONE chip can be expanded at a time.
 * Inside the provider, opening one chip auto-closes any other.
 */
export function CitationProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return <Ctx.Provider value={{ openId, setOpenId }}>{children}</Ctx.Provider>;
}

type Props = {
  citationId: string;
  onLookup?: (id: string) => void;
};

export function CitationChip({ citationId, onLookup }: Props) {
  const ctx = useContext(Ctx);
  const fallback = useState<string | null>(null);
  const openId = ctx ? ctx.openId : fallback[0];
  const setOpenId = ctx ? ctx.setOpenId : fallback[1];
  const open = openId === citationId;

  const cit = getCitation(citationId);

  const handleClick = useCallback(() => {
    if (open) {
      setOpenId(null);
    } else {
      setOpenId(citationId);
      onLookup?.(citationId);
    }
  }, [open, setOpenId, citationId, onLookup]);

  if (!cit) {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded border border-rig-dim/30 text-rig-dim font-mono">
        [{citationId}]
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <button
        onClick={handleClick}
        className={clsx(
          'text-[9px] px-1.5 py-0.5 rounded border font-mono inline-flex items-center gap-1 transition-colors',
          open
            ? 'bg-rig-accent text-rig-bg border-rig-accent'
            : 'border-rig-accent/40 text-rig-accent hover:bg-rig-accent/15'
        )}
        title={`${cit.source} ${cit.section}`}
      >
        <FileText size={9} />[{cit.source} {cit.section}]
      </button>
      {open && (
        <div
          className="absolute z-40 mt-1 left-0 w-[320px] max-w-[80vw] bg-rig-bg border border-rig-accent/40 rounded p-3 text-[11px] shadow-2xl"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="text-rig-accent font-bold">{cit.source}</div>
              <div className="text-rig-dim text-[10px]">{cit.section}</div>
            </div>
            <button
              onClick={() => setOpenId(null)}
              className="text-rig-dim hover:text-rig-text -mr-1 -mt-1 p-1"
              aria-label="Close citation"
            >
              <X size={11} />
            </button>
          </div>
          {cit.quote && <div className="text-rig-text italic">&ldquo;{cit.quote}&rdquo;</div>}
        </div>
      )}
    </span>
  );
}

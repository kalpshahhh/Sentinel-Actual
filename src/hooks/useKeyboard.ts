import { useEffect } from 'react';

export type KeyboardHandlers = {
  onResetDeploy?: () => void;
  onTriggerIncident?: () => void;
  onFastForwardHandoff?: () => void;
  onTogglePreset?: () => void;
  onToggleRoughSeas?: () => void;
  onToggleNightMode?: () => void;
  onToggleGloved?: () => void;
  onCycleOneHanded?: () => void;
  onStressTest?: () => void;
  onShowShortcuts?: () => void;
  onToggleMute?: () => void;
  onEscape?: () => void;
};

export function useKeyboard(handlers: KeyboardHandlers) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case '1':
          handlers.onResetDeploy?.();
          break;
        case '2':
          handlers.onTriggerIncident?.();
          break;
        case '3':
          handlers.onFastForwardHandoff?.();
          break;
        case 'p':
        case 'P':
          handlers.onTogglePreset?.();
          break;
        case 'r':
        case 'R':
          handlers.onToggleRoughSeas?.();
          break;
        case 'n':
        case 'N':
          handlers.onToggleNightMode?.();
          break;
        case 'g':
        case 'G':
          handlers.onToggleGloved?.();
          break;
        case 'h':
        case 'H':
          handlers.onCycleOneHanded?.();
          break;
        case 's':
        case 'S':
          handlers.onStressTest?.();
          break;
        case '?':
        case '/':
          if (e.key === '?' || e.shiftKey) handlers.onShowShortcuts?.();
          break;
        case 'm':
        case 'M':
          handlers.onToggleMute?.();
          break;
        case 'Escape':
          handlers.onEscape?.();
          break;
        default:
          return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}

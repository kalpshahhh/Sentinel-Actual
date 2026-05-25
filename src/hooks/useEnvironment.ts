import { useCallback, useEffect, useState } from 'react';
import type { EnvironmentState, OneHandedMode } from '../types';

const ENV_STORAGE_KEY = 'sentinel-env-v1';

const DEFAULT_ENV: EnvironmentState = {
  roughSeas: false,
  nightMode: false,
  gloved: false,
  oneHanded: 'off',
  motionLevel: 0,
};

function loadPersistedEnv(): EnvironmentState {
  try {
    const raw = localStorage.getItem(ENV_STORAGE_KEY);
    if (!raw) return DEFAULT_ENV;
    const p = JSON.parse(raw) as Partial<EnvironmentState>;
    return {
      roughSeas: p.roughSeas === true,
      nightMode: p.nightMode === true,
      gloved: p.gloved === true,
      oneHanded: p.oneHanded === 'right' || p.oneHanded === 'left' ? p.oneHanded : 'off',
      motionLevel: 0, // never persist — always start calm
    };
  } catch {
    return DEFAULT_ENV;
  }
}

export function useEnvironment() {
  const [env, setEnv] = useState<EnvironmentState>(() => loadPersistedEnv());

  // Persist toggleable settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        ENV_STORAGE_KEY,
        JSON.stringify({ roughSeas: env.roughSeas, nightMode: env.nightMode, gloved: env.gloved, oneHanded: env.oneHanded })
      );
    } catch {}
  }, [env.roughSeas, env.nightMode, env.gloved, env.oneHanded]);

  const toggleRoughSeas = useCallback(() => {
    setEnv((p) => ({ ...p, roughSeas: !p.roughSeas, motionLevel: !p.roughSeas ? Math.max(p.motionLevel, 6) : 0 }));
  }, []);

  const toggleNightMode = useCallback(() => {
    setEnv((p) => ({ ...p, nightMode: !p.nightMode }));
  }, []);

  const toggleGloved = useCallback(() => {
    setEnv((p) => ({ ...p, gloved: !p.gloved }));
  }, []);

  const cycleOneHanded = useCallback(() => {
    setEnv((p) => {
      const next: OneHandedMode = p.oneHanded === 'off' ? 'right' : p.oneHanded === 'right' ? 'left' : 'off';
      return { ...p, oneHanded: next };
    });
  }, []);

  // Motion level is informational only — does NOT auto-enable rough seas.
  // User must explicitly toggle rough seas. This prevents a gyro spike on load
  // from unexpectedly enabling the simulation effect.
  const setMotionLevel = useCallback((level: number) => {
    setEnv((p) => ({ ...p, motionLevel: level }));
  }, []);

  const stressTest = useCallback(() => {
    setEnv({ roughSeas: true, nightMode: true, gloved: true, oneHanded: 'right', motionLevel: 10 });
  }, []);

  const reset = useCallback(() => setEnv(DEFAULT_ENV), []);

  return { env, toggleRoughSeas, toggleNightMode, toggleGloved, cycleOneHanded, setMotionLevel, stressTest, reset };
}

export type UseEnvironmentReturn = ReturnType<typeof useEnvironment>;

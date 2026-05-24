import { useCallback, useState } from 'react';
import type { EnvironmentState, OneHandedMode } from '../types';

const DEFAULT_ENV: EnvironmentState = {
  roughSeas: false,
  nightMode: false,
  gloved: false,
  oneHanded: 'off',
  motionLevel: 0,
};

export function useEnvironment() {
  const [env, setEnv] = useState<EnvironmentState>(DEFAULT_ENV);

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

  const setMotionLevel = useCallback((level: number) => {
    setEnv((p) => ({
      ...p,
      motionLevel: level,
      roughSeas: level > 5 ? true : p.roughSeas,
    }));
  }, []);

  const stressTest = useCallback(() => {
    setEnv({
      roughSeas: true,
      nightMode: true,
      gloved: true,
      oneHanded: 'right',
      motionLevel: 10,
    });
  }, []);

  const reset = useCallback(() => setEnv(DEFAULT_ENV), []);

  return {
    env,
    toggleRoughSeas,
    toggleNightMode,
    toggleGloved,
    cycleOneHanded,
    setMotionLevel,
    stressTest,
    reset,
  };
}

export type UseEnvironmentReturn = ReturnType<typeof useEnvironment>;

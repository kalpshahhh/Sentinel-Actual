import { useCallback, useRef, useState } from 'react';

type WebkitWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as WebkitWindow;
  const Ctor = window.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = getAudioContext();
    if (ctxRef.current && ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const beep = useCallback(
    (freq: number, durationMs: number, delayMs: number = 0, type: OscillatorType = 'sine', volume = 0.15) => {
      if (muted) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      const start = ctx.currentTime + delayMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.linearRampToValueAtTime(0, start + durationMs / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + durationMs / 1000 + 0.02);
    },
    [ensureCtx, muted]
  );

  const playAlert = useCallback(() => {
    beep(880, 200, 0);
    beep(880, 200, 280);
    beep(880, 200, 560);
  }, [beep]);

  const playSuccess = useCallback(() => {
    beep(440, 140, 0);
    beep(554, 140, 160);
    beep(659, 220, 320);
  }, [beep]);

  const playSatLink = useCallback(() => {
    if (muted) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2 * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  }, [ensureCtx, muted]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return { playAlert, playSuccess, playSatLink, muted, toggleMute };
}

export type UseSoundReturn = ReturnType<typeof useSound>;

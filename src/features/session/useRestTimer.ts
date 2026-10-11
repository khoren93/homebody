import { useCallback, useEffect, useRef, useState } from 'react';

/** What the timer says is coming after the rest. */
export type RestTarget = { title: string; detail: string };

export type RestTimerState = {
  /** Seconds left; zero or below once the rest is over. */
  remaining: number;
  /** Length of the rest as started or adjusted, in seconds. */
  total: number;
  target: RestTarget;
} | null;

/** How long the "go" state stays on screen before the timer hides itself. */
const LINGER_SECONDS = 30;

let audio: AudioContext | null = null;

/** Must be called from a user gesture so the browser allows sound later. */
function unlockAudio(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}

/** Two short beeps and a higher one. */
function beep(): void {
  if (!audio) return;
  try {
    [0, 0.35, 0.7].forEach((offset, index) => {
      if (!audio) return;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + offset;
      oscillator.frequency.value = index === 2 ? 1320 : 880;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });
  } catch {
    // Sound is a nicety; the timer also changes visibly and vibrates.
  }
}

function vibrate(): void {
  try {
    navigator.vibrate?.([300, 120, 300]);
  } catch {
    // Not supported on this device.
  }
}

/**
 * The rest countdown between sets. It is based on a wall-clock end time, so
 * it stays correct when the phone sleeps or the tab is in the background.
 */
export function useRestTimer(now: () => number = Date.now) {
  const [timer, setTimer] = useState<{ endsAt: number; total: number; target: RestTarget } | null>(
    null,
  );
  const [, setTick] = useState(0);
  const signalled = useRef(false);

  const remaining = timer ? Math.ceil((timer.endsAt - now()) / 1000) : 0;

  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => {
      const left = Math.ceil((timer.endsAt - now()) / 1000);
      if (left <= 0 && !signalled.current) {
        signalled.current = true;
        beep();
        vibrate();
      }
      if (left > 0) signalled.current = false;
      if (left < -LINGER_SECONDS) setTimer(null);
      else setTick((n) => n + 1);
    }, 250);
    return () => clearInterval(interval);
  }, [timer, now]);

  const start = useCallback(
    (seconds: number, target: RestTarget) => {
      unlockAudio();
      signalled.current = false;
      setTimer({ endsAt: now() + seconds * 1000, total: seconds, target });
    },
    [now],
  );

  /** Adds or removes seconds; the rest never drops below one second by adjusting. */
  const adjust = useCallback(
    (seconds: number) => {
      setTimer((current) => {
        if (!current) return current;
        const endsAt = Math.max(now() + 1000, current.endsAt + seconds * 1000);
        return { ...current, endsAt, total: Math.max(1, current.total + seconds) };
      });
    },
    [now],
  );

  const stop = useCallback(() => setTimer(null), []);

  const state: RestTimerState = timer
    ? { remaining, total: timer.total, target: timer.target }
    : null;
  return { state, start, adjust, stop };
}

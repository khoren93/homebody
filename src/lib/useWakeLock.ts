import { useEffect } from 'react';

/**
 * Keeps the screen awake while `active` is true, where the browser supports
 * it. The lock is released by the browser whenever the tab is hidden, so it
 * is requested again when the tab becomes visible.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== 'visible' || lock) return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        lock = sentinel;
        sentinel.addEventListener('release', () => {
          lock = null;
        });
      } catch {
        // Denied, for example in battery saver mode. The workout still works.
      }
    };

    const onVisibilityChange = () => void request();
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void lock?.release();
    };
  }, [active]);
}

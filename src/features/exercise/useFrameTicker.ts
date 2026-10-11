import { useEffect } from 'react';

/** How long each photo frame stays on screen, in milliseconds. */
export const FRAME_MS = 1300;

/**
 * Drives the start/end animation of every exercise photo on the page from a
 * single timer: it flips `data-frame` on <html> and the photos follow in CSS,
 * so they all move in sync and nothing re-renders. Paused while the tab is
 * hidden and switched off for people who prefer reduced motion.
 */
export function useFrameTicker(): void {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    let frame = 0;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      frame = 1 - frame;
      root.dataset.frame = String(frame);
    }, FRAME_MS);
    return () => {
      clearInterval(timer);
      delete root.dataset.frame;
    };
  }, []);
}

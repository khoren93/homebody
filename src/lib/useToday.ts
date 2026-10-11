import { useEffect, useState } from 'react';

import { type IsoDate, toIsoDate } from '@/engine';

function now(): IsoDate {
  return toIsoDate(new Date());
}

/**
 * Today's date in the device time zone. Updates when the day changes while
 * the app is open and when the app comes back to the foreground.
 */
export function useToday(): IsoDate {
  const [today, setToday] = useState(now);

  useEffect(() => {
    const refresh = () => setToday(now());
    // Check once a minute rather than scheduling a timer for midnight:
    // timers drift and are suspended while a phone sleeps.
    const interval = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}

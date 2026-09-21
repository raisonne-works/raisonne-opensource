'use client';

import { useEffect, useState } from 'react';

/**
 * The clock, for the parts of a drop page that change by themselves.
 *
 * A drop page is prerendered, so its first HTML carries the time the build
 * ran. The hook starts from that same value, which keeps hydration quiet,
 * then corrects to the real time and keeps ticking, so a page left open
 * moves from "opens in 2 minutes" to "live" without a reload.
 */
export function useNow(initial: number, interval = 1000): number {
  const [now, setNow] = useState(initial);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    // The first correction is scheduled rather than run on the spot, so
    // hydration finishes with the same markup the server sent.
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, interval);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [interval]);

  return now;
}

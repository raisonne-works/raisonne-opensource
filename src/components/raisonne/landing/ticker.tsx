'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { usePrefersReducedMotion } from '@/components/raisonne/works/use-prefers-reduced-motion';
import type { Landing } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Studio time, where the studio is, and what is on the bench: the small line
 * that says a person is at the other end of the catalogue.
 *
 * The clock is the studio's own zone from the data, not the visitor's, so it
 * reads as "it is ten past nine where the work is made". Nothing renders
 * until the browser has a clock, because the server and the visitor rarely
 * agree on the minute. The phrases rotate on a slow interval and hold still
 * for a visitor who asks for less motion, where the whole list is shown
 * instead.
 */
export function Ticker({ ticker, className }: { ticker: NonNullable<Landing['ticker']>; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const time = useStudioTime(ticker.timezone);
  const [index, setIndex] = useState(0);
  const phrases = ticker.phrases.filter(phrase => phrase.trim().length > 0);

  useEffect(() => {
    if (reducedMotion || phrases.length < 2) return undefined;
    const id = window.setInterval(() => setIndex(current => (current + 1) % phrases.length), 4000);
    return () => window.clearInterval(id);
  }, [reducedMotion, phrases.length]);

  const place = [ticker.city, ticker.coordinates].filter(Boolean).join(' · ');
  if (!place && !time && phrases.length === 0) return null;

  return (
    <p
      data-slot="ticker"
      className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted-foreground', className)}
    >
      {time ? (
        <span className="font-mono tabular-nums">
          <span className="sr-only">Studio time: </span>
          {time}
        </span>
      ) : null}
      {place ? <span>{place}</span> : null}
      {phrases.length > 0 ? (
        reducedMotion ? (
          <span>{phrases.join(' · ')}</span>
        ) : (
          <span aria-live="off" className="text-foreground/80">
            {phrases[index]}
          </span>
        )
      ) : null}
    </p>
  );
}

/**
 * The wall clock in the studio's own zone, read as an external source rather
 * than copied into state: the server has no clock to agree with, so it
 * renders nothing and the browser fills it in.
 */
function useStudioTime(timeZone: string | null): string | null {
  const subscribe = useCallback((onChange: () => void) => {
    const id = window.setInterval(onChange, 15_000);
    return () => window.clearInterval(id);
  }, []);

  const read = useCallback(() => {
    // No zone means no clock. A time in UTC beside "San Francisco" is worse
    // than no time at all.
    if (!timeZone) return null;
    try {
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
      }).format(new Date());
    } catch {
      // An unknown zone should not take the home page down.
      return null;
    }
  }, [timeZone]);

  return useSyncExternalStore(subscribe, read, () => null);
}

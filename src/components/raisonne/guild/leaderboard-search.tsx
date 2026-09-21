'use client';

import { useRouter } from 'next/navigation';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { LEADERBOARD_PATH, leaderboardHref, type LeaderboardState } from './lib';

/** How long to wait after the last keystroke before the list reloads. */
const DEBOUNCE_MS = 300;

/**
 * Find a wallet on the leaderboard by address, ENS name or tier.
 *
 * A real GET form first, so it works with no JavaScript and the tier filter
 * rides along as a hidden field. With JavaScript it stops reloading the whole
 * page: typing replaces the URL after a short pause and the server sends back
 * the matching page of rows. The same control the catalogue uses, doing the
 * same job, so a visitor only learns it once.
 */
export function LeaderboardSearch({
  state,
  className,
}: {
  state: LeaderboardState;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);

  // While a search of ours is in flight the field keeps what was typed; when
  // the URL changes to something we did not send (the back button, a cleared
  // filter) the URL wins.
  const [draft, setDraft] = useState({ sent: state.q, text: state.q });
  const value = pending || state.q === draft.sent ? draft.text : state.q;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function go(next: string) {
    window.clearTimeout(timer.current);
    setDraft(current => ({ sent: next, text: current.text }));
    startTransition(() => {
      router.replace(leaderboardHref(state, { q: next }), { scroll: false });
    });
  }

  function onChange(next: string) {
    setDraft(current => ({ sent: current.sent, text: next }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => go(next), DEBOUNCE_MS);
  }

  return (
    <form
      action={LEADERBOARD_PATH}
      method="get"
      role="search"
      className={cn('w-full min-w-0 sm:w-auto sm:max-w-80 sm:flex-1', className)}
      onSubmit={event => {
        event.preventDefault();
        go(value);
      }}
    >
      {state.tier ? <input type="hidden" name="tier" value={state.tier} /> : null}
      <InputGroup>
        <InputGroupAddon>{pending ? <Spinner aria-hidden /> : <SearchIcon aria-hidden />}</InputGroupAddon>
        <InputGroupInput
          type="search"
          name="q"
          value={value}
          aria-label="Search the leaderboard by address, name or tier"
          placeholder="Address, ENS name or tier"
          autoComplete="off"
          spellCheck={false}
          onChange={event => onChange(event.target.value)}
        />
        {value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Clear the search"
              onClick={() => {
                setDraft(current => ({ sent: current.sent, text: '' }));
                go('');
              }}
            >
              <XIcon aria-hidden />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </form>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { DEFAULT_DIRECTORY_SORT, DIRECTORY_PATH, directoryHref, type DirectoryState } from './lib';

/** How long to wait after the last keystroke before the list reloads. */
const DEBOUNCE_MS = 300;

/**
 * Search over the collectors, deep-linkable as ?q=.
 *
 * A real GET form first, so the directory works with no JavaScript and the
 * series filter and the order ride along as hidden fields. With JavaScript
 * it stops reloading the page: typing replaces the URL after a pause and the
 * server sends back the matching page of rows.
 *
 * The same shape as the catalogue's search, because a visitor who has used
 * one list on this site has used them all.
 */
export function DirectorySearch({ state, className }: { state: DirectoryState; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);

  const [draft, setDraft] = useState({ sent: state.q, text: state.q });
  const value = pending || state.q === draft.sent ? draft.text : state.q;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function go(next: string) {
    window.clearTimeout(timer.current);
    setDraft(current => ({ sent: next, text: current.text }));
    startTransition(() => {
      router.replace(directoryHref(state, { q: next }), { scroll: false });
    });
  }

  function onChange(next: string) {
    setDraft(current => ({ sent: current.sent, text: next }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => go(next), DEBOUNCE_MS);
  }

  return (
    <form
      action={DIRECTORY_PATH}
      method="get"
      role="search"
      className={cn('w-full min-w-0 sm:w-auto sm:max-w-80 sm:flex-1', className)}
      onSubmit={event => {
        event.preventDefault();
        go(value);
      }}
    >
      {state.series ? <input type="hidden" name="series" value={state.series} /> : null}
      {state.sort !== DEFAULT_DIRECTORY_SORT ? <input type="hidden" name="sort" value={state.sort} /> : null}
      <InputGroup>
        <InputGroupAddon>{pending ? <Spinner aria-hidden /> : <SearchIcon aria-hidden />}</InputGroupAddon>
        <InputGroupInput
          type="search"
          name="q"
          value={value}
          aria-label="Search collectors by address or ENS name"
          placeholder="Search by address or ENS"
          autoComplete="off"
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

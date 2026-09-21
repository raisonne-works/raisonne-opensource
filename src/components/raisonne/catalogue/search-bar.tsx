'use client';

import { useRouter } from 'next/navigation';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { catalogueHref, type CatalogueConfig, type CatalogueState } from './lib';

/** How long to wait after the last keystroke before the list reloads. */
const DEBOUNCE_MS = 300;

/**
 * Free-text search over the list, deep-linkable as ?q=.
 *
 * It is a real GET form first, so it works with no JavaScript at all and the
 * other filters ride along as hidden fields. With JavaScript it stops
 * reloading the whole page: typing replaces the URL after a short pause and
 * the server sends back the matching page of rows.
 */
export function CatalogueSearch({
  state,
  config,
  className,
}: {
  state: CatalogueState;
  config: CatalogueConfig;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);

  /**
   * What is in the field, and the last search we sent. While a search of
   * ours is on its way, or once it has landed, the field keeps what was
   * typed. When ?q= changes to something we did not send (a chip taken off,
   * the filters cleared, the back button) the URL wins, which is what keeps
   * the two in step without an effect that copies one into the other.
   */
  const [draft, setDraft] = useState({ sent: state.q, text: state.q });
  const value = pending || state.q === draft.sent ? draft.text : state.q;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function go(next: string) {
    window.clearTimeout(timer.current);
    setDraft(current => ({ sent: next, text: current.text }));
    startTransition(() => {
      router.replace(catalogueHref(config, state, { q: next }), { scroll: false });
    });
  }

  function onChange(next: string) {
    setDraft(current => ({ sent: current.sent, text: next }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => go(next), DEBOUNCE_MS);
  }

  return (
    <form
      action={config.basePath}
      method="get"
      role="search"
      className={cn('w-full min-w-0 sm:w-auto sm:max-w-80 sm:flex-1', className)}
      onSubmit={event => {
        event.preventDefault();
        go(value);
      }}
    >
      {hiddenFields(state, config).map(field => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <InputGroup>
        <InputGroupAddon>
          {pending ? <Spinner aria-hidden /> : <SearchIcon aria-hidden />}
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          name="q"
          value={value}
          aria-label={config.searchPlaceholder}
          placeholder={config.searchPlaceholder}
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

/**
 * Everything else that is in the URL, so submitting the form without
 * JavaScript keeps the section, the facets, the sort and the view.
 */
function hiddenFields(state: CatalogueState, config: CatalogueConfig): { name: string; value: string }[] {
  const fields: { name: string; value: string }[] = [];
  if (state.type) fields.push({ name: 'type', value: state.type });
  for (const key of ['kind', 'chain', 'year', 'medium', 'platform'] as const) {
    if (state[key].length > 0) fields.push({ name: key, value: state[key].join(',') });
  }
  if (state.sort !== config.defaultSort) fields.push({ name: 'sort', value: state.sort });
  if (state.view !== config.defaultView) fields.push({ name: 'view', value: state.view });
  return fields;
}

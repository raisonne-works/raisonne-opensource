'use client';

import { type FormEvent, useId, useState } from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { NEWSLETTER_HONEYPOT_FIELD } from '@/lib/newsletter';
import { cn } from '@/lib/utils';

/**
 * What the artist is told when this install has nowhere to send an address.
 *
 * It names a variable, so it is written for the one person who can set it,
 * and the block it sits in renders only for the owner session. It lives here
 * rather than being handed in as a prop so it never reaches the page source
 * of a site nobody has signed into.
 */
const SETUP_NOTE =
  'Set RAISONNE_NEWSLETTER_URL to collect addresses. Until then this block is shown to you alone, and the form is not rendered for visitors.';

type State = { status: 'idle' | 'sending' | 'done' } | { status: 'failed'; message: string };

const GENERIC_ERROR = 'That did not go through. Please try again in a moment.';

/**
 * The sign-up form, posted to /api/newsletter with the source that asked for
 * it ("footer", a drop's slug), so an install can see where a subscriber
 * came from.
 *
 * It never claims success it did not get: an error from the route is shown
 * as an error, the field keeps what was typed, and the message is announced.
 * The hidden field is a honeypot; a real person leaves it empty.
 */
export function NewsletterForm({
  title,
  description,
  source = 'footer',
  setupNote,
  className,
}: {
  title: string;
  description?: string | null;
  /** Tags the sign-up, so the artist knows which page it came from. */
  source?: string;
  /**
   * Renders the block switched off, with this line under it. Used where the
   * module is on but no endpoint is set, so the person installing the site
   * can see what is missing instead of wondering where the form went.
   */
  /**
   * True when this install has nowhere to send an address, and the person
   * looking is the artist.
   *
   * A flag rather than the sentence, because a client component's props are
   * serialized into the page every browser receives, whether the component
   * renders them or not. Passing the text meant the name of an environment
   * variable travelled to every visitor of every page carrying this footer,
   * which is the thing gating the block on the owner session was meant to
   * stop. The sentence itself lives below, in the bundle, like every other
   * piece of copy.
   */
  setupNote?: boolean;
  className?: string;
}) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Switched off: there is nowhere to send an address, so nothing is sent.
    if (setupNote || state.status === 'sending') return;

    const form = event.currentTarget;
    const trap = new FormData(form).get(NEWSLETTER_HONEYPOT_FIELD);
    setState({ status: 'sending' });

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source, [NEWSLETTER_HONEYPOT_FIELD]: trap ?? '' }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setState({
          status: 'failed',
          message:
            response.status === 429
              ? 'Too many attempts just now. Please try again in a minute.'
              : (body?.error ?? GENERIC_ERROR),
        });
        return;
      }
      setEmail('');
      setState({ status: 'done' });
    } catch {
      setState({ status: 'failed', message: GENERIC_ERROR });
    }
  }

  const failed = state.status === 'failed';
  const disabled = Boolean(setupNote) || state.status === 'sending';

  return (
    <div data-slot="newsletter-form" className={cn('flex max-w-[36rem] flex-col gap-3', className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? <p className="text-sm text-pretty text-muted-foreground">{description}</p> : null}
        {setupNote ? <p className="text-sm text-pretty text-muted-foreground">{SETUP_NOTE}</p> : null}
      </div>

      {state.status === 'done' ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground" role="status">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          Thank you. Please confirm the address in the message that has just been sent.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
          <Label htmlFor={`${id}-email`} className="sr-only">
            Email address
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              aria-invalid={failed || undefined}
              aria-describedby={failed ? `${id}-error` : undefined}
              disabled={disabled}
              className="sm:max-w-72"
            />
            <Button type="submit" variant="outline" disabled={disabled}>
              {state.status === 'sending' ? <Spinner aria-hidden data-icon="inline-start" /> : null}
              {state.status === 'sending' ? 'Signing up' : 'Sign up'}
            </Button>
          </div>

          {/* Honeypot: off screen, not announced, never filled by a person. */}
          <div aria-hidden className="sr-only">
            <label htmlFor={`${id}-trap`}>Company</label>
            <input
              id={`${id}-trap`}
              name={NEWSLETTER_HONEYPOT_FIELD}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          <p id={`${id}-error`} role="alert" className="flex min-h-0 items-start gap-2 text-sm text-destructive empty:hidden">
            {failed ? (
              <>
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {state.message}
              </>
            ) : null}
          </p>
        </form>
      )}
    </div>
  );
}

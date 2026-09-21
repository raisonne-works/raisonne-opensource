'use client';

import { useEffect, useSyncExternalStore } from 'react';

import type { SessionRole } from '@/lib/types';

import { onSessionChange } from './session-events';

/**
 * Who is signed in, for the parts of the page that only the browser can ask.
 *
 * The session is an httpOnly cookie, so reading it in the root layout would
 * make every page on the site dynamic, and this catalogue prerenders
 * thousands of them. So the header, and anything else that changes with the
 * viewer, asks once per visit through /api/auth/session.
 *
 * Once, not once per component: the answer is shared between every caller in
 * this module, so the header chip, the footer's artist block and a setup
 * panel are one request between them. It is re-read when a sign-in or
 * sign-out happens and when the tab is focused again.
 */

export type SessionState =
  | { status: 'unknown' }
  | { status: 'signed-out'; configured: boolean }
  | {
      status: 'signed-in';
      address: string;
      ens: string | null;
      role: SessionRole;
      expiresAt: number;
      /** Whether this install publishes a page per wallet. */
      publicProfiles: boolean;
    };

interface SessionBody {
  signedIn?: boolean;
  configured?: boolean;
  address?: string;
  ens?: string | null;
  role?: SessionRole;
  expiresAt?: number;
  publicProfiles?: boolean;
}

/**
 * A plain external store, read through useSyncExternalStore.
 *
 * It is one on purpose: the answer is shared between every component on the
 * page, it changes outside React (a fetch, a sign-out in another tab, the
 * window regaining focus), and React has a hook for exactly that shape.
 * Copying it into component state in an effect instead would set state
 * during the effect and cascade a second render on every mount.
 */
const UNKNOWN: SessionState = { status: 'unknown' };

let current: SessionState = UNKNOWN;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: SessionState): void {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): SessionState {
  return current;
}

/** The server renders the same thing for everybody, which is "we do not know yet". */
function serverSnapshot(): SessionState {
  return UNKNOWN;
}

async function read(): Promise<void> {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    const body = (await response.json().catch(() => null)) as SessionBody | null;
    if (body?.signedIn && typeof body.address === 'string' && typeof body.expiresAt === 'number') {
      publish({
        status: 'signed-in',
        address: body.address,
        ens: body.ens ?? null,
        role: body.role === 'owner' ? 'owner' : 'collector',
        expiresAt: body.expiresAt,
        publicProfiles: body.publicProfiles === true,
      });
      return;
    }
    publish({ status: 'signed-out', configured: body?.configured === true });
  } catch {
    // A failed fetch is not something to report in the header. Unknown shows
    // nothing, which is honest.
    publish({ status: 'unknown' });
  }
}

/** Reads the session, sharing one request between every caller. */
export function refreshSession(): Promise<void> {
  inFlight ??= read().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function useSession(enabled = true): SessionState {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  useEffect(() => {
    if (!enabled) return;

    const recheck = () => void refreshSession();
    recheck();
    const stop = onSessionChange(recheck);
    window.addEventListener('focus', recheck);

    return () => {
      stop();
      window.removeEventListener('focus', recheck);
    };
  }, [enabled]);

  return enabled ? state : UNKNOWN;
}

/** Lets a sign-out tell every subscriber at once without a round trip. */
export function setSignedOut(): void {
  publish({ status: 'signed-out', configured: true });
}

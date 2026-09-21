/**
 * One browser event that says "the session just changed".
 *
 * The account slot in the header lives in the root layout and stays mounted
 * across navigation, so it would otherwise go on showing an address after a
 * sign-out, or nothing at all after a sign-in. Rather than re-asking the
 * server on every page view, the two places that change a session say so.
 *
 * Pure and client safe. On the server both functions are no-ops.
 */

export const SESSION_EVENT = 'raisonne:session';

/** Call after a sign-in or a sign-out has actually happened. */
export function announceSessionChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Returns the unsubscribe function, for a useEffect cleanup. */
export function onSessionChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SESSION_EVENT, listener);
  return () => window.removeEventListener(SESSION_EVENT, listener);
}

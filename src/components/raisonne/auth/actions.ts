'use server';

import { redirect } from 'next/navigation';

import { endSession } from '@/lib/auth/guards';

import { safeReturnPath } from './routes';

/**
 * Signing out.
 *
 * A server action rather than a link, so it is a POST. A GET that ends a
 * session can be fired by any page that can put an image on screen, and
 * being signed out by somebody else's <img> is a small thing that should
 * still not happen.
 *
 * The cookie is cleared and the visitor lands somewhere sensible: where they
 * came from when that is a public page, the home page otherwise.
 *
 * Nothing is revalidated. The header's account slot reads the session in the
 * browser precisely so that the layout does not depend on it, and calling
 * revalidatePath('/', 'layout') here would throw away the cached render of
 * every page in the catalogue, thousands of them, each time one person
 * signed out.
 */
async function signOut(next: string | null): Promise<never> {
  await endSession();
  const back = safeReturnPath(next);
  redirect(back && !back.startsWith('/collector') ? back : '/');
}

/** For a plain <form action={signOutAction}>, which works with no JavaScript. */
export async function signOutAction(formData: FormData): Promise<void> {
  const next = formData.get('next');
  await signOut(typeof next === 'string' ? next : null);
}

/** For the account menu, which calls it from a transition. */
export async function signOutTo(next?: string | null): Promise<void> {
  await signOut(next ?? null);
}

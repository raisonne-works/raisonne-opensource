import { redirectToSignIn } from '@/app/auth/redirect-to-sign-in';

/** An alias for /auth. See redirect-to-sign-in.ts. */
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return redirectToSignIn(request);
}

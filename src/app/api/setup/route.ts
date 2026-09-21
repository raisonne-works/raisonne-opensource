import { getSession, ownerIsConfigured } from '@/lib/auth/guards';
import { ENV_DOCS, featureReport, isProductionBuild, type FeatureId } from '@/lib/config';

/**
 * GET /api/setup
 *
 * What this install still needs, in the words the setup panels print.
 *
 * Only the artist may read it. The names of environment variables are not a
 * secret in the sense a key is, but they are deployment notes, and a
 * collector arriving from a link should meet the work rather than a panel
 * telling them to edit .env.local. So the detail lives behind this route and
 * the public surfaces carry the visitor's sentence instead, which is short
 * and true: this shop cannot take a payment yet.
 *
 * Development is open, because the person running the dev server is the
 * installer and asking them to sign in with a wallet to be told which
 * variable is missing would be absurd.
 */

export const dynamic = 'force-dynamic';

const SURFACE_FEATURES: Record<string, FeatureId[]> = {
  store: ['payments', 'orders', 'pod'],
  accounts: ['accounts', 'owner'],
  chain: ['chain'],
  newsletter: [],
};

export async function GET(request: Request) {
  const open = !isProductionBuild();
  const session = await getSession();
  const isOwner = session?.role === 'owner';

  if (!open && !isOwner) {
    // 404 rather than 403: an install's configuration gaps are not something
    // to confirm the existence of to anyone who asks.
    return Response.json({ error: 'Not found' }, { status: 404, headers: { 'cache-control': 'no-store' } });
  }

  const surface = new URL(request.url).searchParams.get('surface');
  const wanted = surface ? (SURFACE_FEATURES[surface] ?? []) : null;

  const features = featureReport()
    .filter(status => !wanted || wanted.includes(status.id))
    .map(status => ({
      id: status.id,
      configured: status.configured,
      summary: status.summary,
      detail: status.detail,
      missing: status.missing.map(name => ({ name, doc: ENV_DOCS[name] ?? null })),
      notes: status.notes,
    }));

  return Response.json(
    {
      // So the panel can say "only you can see this" and be telling the truth.
      audience: isOwner ? 'owner' : 'development',
      ownerConfigured: ownerIsConfigured(),
      features,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

import { featureStatus } from '@/lib/config';
import { getPodProvider } from '@/lib/store/pod';

/**
 * POST /api/pod/webhook
 *
 * Where a print-on-demand service would tell this install that an order has
 * been printed and posted, with its tracking number.
 *
 * It is deliberately a refusal.
 *
 * This is the endpoint that marks an order shipped and, in an install that
 * sends email, tells the buyer their parcel is on its way. Accepting an
 * unsigned body here means anyone who knows the URL can do both. Prodigi,
 * Printful and Gelato each sign their callbacks differently, no adapter in
 * this release verifies any of them, and an endpoint that trusts an
 * unverified body is worse than no endpoint at all. So it answers 501 and
 * the artist marks orders shipped themselves, from the order page.
 *
 * TODO(wave-3-pod): when an adapter implements readWebhook, this route
 * verifies the signature through it, matches fulfilment.providerOrderId,
 * records the tracking number and moves the order to shipped through
 * canTransition. Until then it must stay shut.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const provider = getPodProvider();

  // Read and discard, so a provider testing the endpoint gets a clean answer
  // rather than a connection reset.
  await request.text().catch(() => '');

  const verified = provider?.readWebhook('', request.headers.get('x-signature')) ?? null;

  return Response.json(
    {
      error: 'Shipment webhooks are not accepted by this install.',
      detail:
        'No print-on-demand adapter in this release verifies a provider signature, and an unverified shipment update can mark any order shipped. The artist records shipping by hand from the order page.',
      provider: provider?.id ?? null,
      missing: featureStatus('pod').missing,
      verified: verified !== null,
    },
    { status: 501 },
  );
}

export function GET() {
  const provider = getPodProvider();
  return Response.json({
    endpoint: 'print-on-demand shipment webhook',
    provider: provider?.id ?? null,
    implemented: false,
  });
}

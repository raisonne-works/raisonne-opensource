import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CheckoutFlow } from '@/components/raisonne/checkout/checkout-flow';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { InstallerPanel } from '@/components/raisonne/shell/installer-panel';
import { getSiteData } from '@/fixtures';
import { getSession } from '@/lib/auth/guards';
import { surfaceState } from '@/lib/config';
import { isModuleEnabled } from '@/lib/records';
import { NO_INDEX } from '@/lib/seo/metadata';
import { getPaymentProvider } from '@/lib/store/payments';
import { probeOrderStore } from '@/lib/store/orders';

/**
 * Checkout: contact, where it goes, how it is sent, and the handover to the
 * payment provider.
 *
 * The cart is in the browser, so the work happens in a client component. The
 * two things only the server can know are settled here: whether this install
 * can take a payment at all, and whether the keys it has are test keys.
 *
 * An install with no payment keys still shows the basket. The page used to
 * replace the whole checkout with a panel naming Stripe's variables, so the
 * header said four items and the page showed none of them, under a sentence
 * promising nothing in the basket was lost. Now the order summary renders
 * either way and the reason sits where the pay button would be.
 *
 * Never indexed. A checkout page in a search result is a page somebody lands
 * on with an empty basket and no idea what site they are on.
 */

export const metadata: Metadata = {
  title: 'Checkout',
  robots: NO_INDEX,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  // Probed here as well as in the checkout route, so a store that cannot be
  // written to says so before a buyer fills a form in rather than after.
  await probeOrderStore();

  const { settings, artist } = getSiteData();
  const state = surfaceState(settings, 'store');
  if (state === 'off') notFound();

  const params = await searchParams;
  const session = await getSession();
  const provider = getPaymentProvider();
  const configured = state === 'on';

  const studioHref = isModuleEnabled(settings, 'commissions')
    ? '/commissions/request'
    : artist.email
      ? `mailto:${artist.email}`
      : null;

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        title="Checkout"
        description={
          configured
            ? 'Two things to fill in, then the payment page.'
            : 'This shop cannot take a payment yet. Your basket is below, exactly as you left it, and everything else on the site works as it should.'
        }
      />
      <CheckoutFlow
        testMode={provider?.testMode ?? false}
        cancelled={params.cancelled === '1'}
        signedIn={session !== null}
        configured={configured}
        studioHref={studioHref}
      />
      {configured ? null : <InstallerPanel surface="store" className="mt-10" />}
    </Container>
  );
}

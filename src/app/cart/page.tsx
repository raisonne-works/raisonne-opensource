import type { Metadata } from 'next';

import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { InstallerPanel } from '@/components/raisonne/shell/installer-panel';
import { CartContents } from '@/components/raisonne/store/cart-contents';
import { storeIsConfigured } from '@/components/raisonne/store/setup';
import { getSiteData } from '@/fixtures';
import { NO_INDEX, pageMetadata } from '@/lib/seo/metadata';

/**
 * The cart as a page, for anyone who would rather have one than a panel: a
 * wider view of the same basket, the same server-priced totals, and the same
 * way on to checkout.
 *
 * Data-led, so it uses the same centred column as checkout and the
 * dashboards rather than running edge to edge: a basket of three lines
 * stretched across 2,560 px puts a title and its price a screen apart.
 *
 * It is not indexed. A cart is one visitor's basket in one browser, it has
 * no content of its own, and it is different for everybody who opens it.
 */

export function generateMetadata(): Metadata {
  return {
    ...pageMetadata('cart', { title: 'Your cart', description: 'What you have picked out.', path: '/cart' }),
    robots: NO_INDEX,
  };
}

export default function CartPage() {
  const { settings } = getSiteData();
  const configured = storeIsConfigured(settings);

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader title="Your cart" description="Kept in this browser between visits, and priced by the site." />
      {/* The buyer-facing sentence is not repeated here. It now sits in the
          checkout button's own slot inside the summary, which is where the
          reader looks when the action does not happen, rather than in a
          panel filling the top of the page before the basket. What stays is
          the installer's detail, which only the artist and a development
          server can see. */}
      {configured ? null : (
        <div className="mb-8">
          <InstallerPanel surface="store" />
        </div>
      )}
      <CartContents variant="page" />
    </Container>
  );
}

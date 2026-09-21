import { KeyRoundIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * The one sentence a visitor gets when this install cannot take a payment.
 *
 * Nothing in Wave 3 is configured by default, and that is a working state,
 * not a broken one: the catalogue keeps working, products and prices are
 * real, and the only thing missing is the ability to take money.
 *
 * There used to be a second panel here that named STRIPE_SECRET_KEY and told
 * the reader to edit .env.local. That is the right information for the
 * installer and the wrong thing to publish: a collector arriving from a link
 * met somebody else's deployment notes above the first product. The variable
 * names now live behind /api/setup and render through InstallerPanel, which
 * only the artist and a development server can see. This is what everybody
 * else gets, and it says the same thing everywhere it appears.
 */
export function StoreSetupNotice({ className }: { className?: string }) {
  return (
    <Alert className={className}>
      <KeyRoundIcon aria-hidden="true" />
      <AlertTitle>Checkout is not open yet</AlertTitle>
      <AlertDescription>
        <p>
          This shop can be browsed, and the cart works, but payment is not configured on this install, so no order can
          be placed.
        </p>
      </AlertDescription>
    </Alert>
  );
}

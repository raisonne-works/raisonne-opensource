import { CheckoutSkeleton } from '@/components/raisonne/checkout/checkout-flow';
import { Container, PageHeader } from '@/components/raisonne/shell/page';

/** Shown while the checkout page loads. The same shape the form takes, so nothing jumps. */
export default function CheckoutLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <PageHeader title="Checkout" description="Two things to fill in, then the payment page." />
      <CheckoutSkeleton />
    </Container>
  );
}

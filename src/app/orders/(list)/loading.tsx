import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while the order store is read. */
export default function OrdersLoading() {
  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader title="Orders" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </Container>
  );
}

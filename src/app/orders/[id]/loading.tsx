import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while one order is read back. */
export default function OrderLoading() {
  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader title="Order" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </Container>
  );
}

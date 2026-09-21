import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while the commission form and, for a signed-in collector, their holdings load. */
export default function CommissionRequestLoading() {
  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader title="Start a commission" />
      <div className="flex max-w-[46rem] flex-col gap-8">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-40" />
      </div>
    </Container>
  );
}

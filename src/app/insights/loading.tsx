import { MetricGridSkeleton } from '@/components/raisonne/insights/metric-grid';
import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The shape of an insights page while its figures are being read, so the
 * layout does not jump when they arrive.
 *
 * Nothing here is named. It stands in for three pages with different
 * headings, and a skeleton that says "Insights" while /insights/activity is
 * loading would have to be corrected a moment later.
 */
export default function InsightsLoading() {
  return (
    <Container size="editorial" className="pb-16 md:pb-24" aria-busy="true">
      <div role="status" aria-label="Loading the figures" className="flex flex-col gap-4 py-8 md:py-12">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-full max-w-[40rem]" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="flex flex-col gap-6 py-10 md:py-12">
        <Skeleton className="h-4 w-80" />
        <MetricGridSkeleton />
      </div>
      <div className="flex flex-col gap-6 py-10 md:py-12">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    </Container>
  );
}

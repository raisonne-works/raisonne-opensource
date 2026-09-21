import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * A collector page while it loads. A live chain read can take a second, and
 * this is the shape that comes back: identity, six tiles, then the works.
 */
export default function CollectorLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <div className="flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between md:py-12">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-7 w-44" />
      </div>
      <div role="status" aria-label="Loading this collection" className="flex flex-col gap-10">
        <div aria-hidden className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <div aria-hidden className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2.5">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

import { DropHeroSkeleton } from '@/components/raisonne/drops/drop-hero';
import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while a drop page loads: the hero and the countdown, then the details. */
export default function DropLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <DropHeroSkeleton />
      <div className="flex flex-col gap-6 py-10 md:py-12" role="status" aria-label="Loading the release details">
        <Skeleton className="h-6 w-40" />
        <div className="flex flex-wrap gap-8">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
        <div className="flex max-w-2xl flex-col gap-2">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </Container>
  );
}

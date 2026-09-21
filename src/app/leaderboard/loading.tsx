import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The leaderboard while it loads: the header, the four figures, then a page of
 * rows at the height they will actually be, so nothing jumps when the real
 * list arrives.
 */
export default function LeaderboardLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <div role="status" aria-label="Loading the leaderboard" className="sr-only" />
      <div className="flex flex-col gap-4 py-8 md:gap-8 md:py-12">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-[40rem]" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>

      <div className="flex flex-col gap-4 py-10 md:py-12">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-20 rounded-4xl" />
          <Skeleton className="h-6 w-20 rounded-4xl" />
        </div>
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </Container>
  );
}

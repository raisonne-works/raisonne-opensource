import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocsLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <div aria-hidden className="flex flex-col gap-3 py-8 md:py-12">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-40 max-w-full sm:h-10" />
        <Skeleton className="h-6 w-full max-w-prose" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div
        role="status"
        aria-label="Loading docs"
        className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10"
      >
        <div className="hidden flex-col gap-2 lg:flex">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-36" />
          ))}
        </div>
        <div className="flex flex-col gap-10">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3">
              <Skeleton className="h-7 w-48 max-w-full" />
              <Skeleton className="h-4 w-full max-w-prose" />
              <Skeleton className="h-4 w-5/6 max-w-prose" />
              <Skeleton className="mt-2 h-40 w-full max-w-[48rem] rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

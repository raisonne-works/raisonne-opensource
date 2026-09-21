import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** The press page while it loads: the header, three featured cards, then the table. */
export default function PressLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <div className="flex flex-col gap-3 py-8 md:py-12">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-6 w-full max-w-[40rem]" />
      </div>
      <div role="status" aria-label="Loading the press page" className="flex flex-col gap-12">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2.5" aria-hidden>
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        <div aria-hidden className="divide-y divide-border border-y border-border">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-4 py-3">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

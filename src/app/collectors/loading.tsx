import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** The directory while it loads: the header, the toolbar, then rows. */
export default function CollectorsLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <div className="flex flex-col gap-3 py-8 md:py-12">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-6 w-full max-w-[40rem]" />
      </div>
      <div role="status" aria-label="Loading the collectors" className="flex flex-col gap-6">
        <div aria-hidden className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-full sm:w-72" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <div aria-hidden className="divide-y divide-border border-y border-border">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="grid grid-cols-[3rem_minmax(0,1fr)_4rem] items-center gap-4 py-3">
              <Skeleton className="h-4 w-6" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-4 w-8 justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

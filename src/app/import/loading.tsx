import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function ImportLoading() {
  return (
    <Container>
      <div aria-hidden className="flex flex-col gap-3 py-8 md:py-12">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-96 max-w-full sm:h-10" />
        <Skeleton className="h-6 w-full max-w-prose" />
      </div>
      <div role="status" aria-label="Loading the import" className="flex flex-col gap-6 pb-12 md:pb-16">
        <Skeleton className="h-5 w-64 max-w-full rounded-4xl" />
        <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
        <Skeleton className="h-48 max-w-6xl rounded-xl" />
      </div>
    </Container>
  );
}

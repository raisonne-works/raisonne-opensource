import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** A product while it loads: the picture, then the panel beside it. */
export default function ProductLoading() {
  return (
    <Container className="flex flex-col gap-6 pt-6 pb-16 md:pb-24" aria-hidden="true">
      <Skeleton className="h-4 w-52" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:gap-12">
        <Skeleton className="aspect-4/3 w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-56" />
        </div>
      </div>
    </Container>
  );
}

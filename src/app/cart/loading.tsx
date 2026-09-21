import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** The cart page while it loads. The basket itself is read in the browser. */
export default function CartLoading() {
  return (
    <Container className="pb-16 md:pb-24" aria-hidden="true">
      <div className="flex flex-col gap-4 py-8 md:py-12">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex gap-4">
              <Skeleton className="size-20 shrink-0 rounded-md" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </Container>
  );
}

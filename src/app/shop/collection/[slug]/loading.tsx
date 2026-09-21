import { Container } from '@/components/raisonne/shell/page';
import { ProductGridSkeleton } from '@/components/raisonne/store/product-card';
import { Skeleton } from '@/components/ui/skeleton';

/** A collection while it loads: the cover band, the words, then the grid. */
export default function ShopCollectionLoading() {
  return (
    <Container className="flex flex-col gap-6 pt-6 pb-16 md:pb-24" aria-hidden="true">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-full max-w-[40rem]" />
      </div>
      <ProductGridSkeleton count={4} />
    </Container>
  );
}

import { Container } from '@/components/raisonne/shell/page';
import { ProductGridSkeleton } from '@/components/raisonne/store/product-card';
import { Skeleton } from '@/components/ui/skeleton';

/** A shop section while it loads. */
export default function ShopCategoryLoading() {
  return (
    <Container className="flex flex-col gap-6 pt-6 pb-16 md:pb-24" aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-full max-w-[40rem]" />
      </div>
      <Skeleton className="h-8 w-64" />
      <ProductGridSkeleton />
    </Container>
  );
}

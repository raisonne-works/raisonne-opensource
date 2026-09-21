import { Container } from '@/components/raisonne/shell/page';
import { ProductGridSkeleton } from '@/components/raisonne/store/product-card';
import { Skeleton } from '@/components/ui/skeleton';

/** The shop while it loads: the header, then a grid at the same proportions. */
export default function ShopLoading() {
  return (
    <Container className="pb-16 md:pb-24" aria-hidden="true">
      <div className="flex flex-col gap-4 py-8 md:py-12">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-[40rem]" />
      </div>
      <div className="flex flex-col gap-6 py-10 md:py-12">
        <Skeleton className="aspect-4/3 w-full rounded-lg md:aspect-[21/9]" />
      </div>
      <div className="flex flex-col gap-6 py-10 md:py-12">
        <Skeleton className="h-7 w-36" />
        <ProductGridSkeleton />
      </div>
    </Container>
  );
}

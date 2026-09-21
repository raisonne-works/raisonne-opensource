import { PressDetailSkeleton } from '@/components/raisonne/records/press-detail';
import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while a press page loads. */
export default function PressLoading() {
  return (
    <Container className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <Skeleton className="h-4 w-48" />
      <PressDetailSkeleton />
    </Container>
  );
}

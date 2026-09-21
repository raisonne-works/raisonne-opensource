import { CvSkeleton } from '@/components/raisonne/profile/cv';
import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function CvLoading() {
  return (
    <Container>
      <div aria-hidden className="flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between md:py-12">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-72 max-w-full sm:h-10" />
          <Skeleton className="h-6 w-60 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <CvSkeleton className="pb-12 md:pb-16" />
    </Container>
  );
}

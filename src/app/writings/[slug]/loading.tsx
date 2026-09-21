import { WritingArticleSkeleton } from '@/components/raisonne/records/writing-article';
import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while a writing loads. */
export default function WritingLoading() {
  return (
    <Container size="text" className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <Skeleton className="h-4 w-48" />
      <WritingArticleSkeleton />
    </Container>
  );
}

import { RecordHeroSkeleton } from '@/components/raisonne/records/record-hero';
import { Container } from '@/components/raisonne/shell/page';
import { StoryBlocksSkeleton } from '@/components/raisonne/story/story-blocks';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while an installation page loads: the same shape the page will have. */
export default function InstallationLoading() {
  return (
    <Container className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <Skeleton className="h-4 w-56" />
      <RecordHeroSkeleton />
      <StoryBlocksSkeleton />
    </Container>
  );
}

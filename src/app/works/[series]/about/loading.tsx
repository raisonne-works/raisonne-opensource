import { Container } from '@/components/raisonne/shell/page';
import { SeriesHeroSkeleton } from '@/components/raisonne/works/series-hero';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while a series essay loads: the hero, then paragraphs. */
export default function SeriesAboutLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <SeriesHeroSkeleton />
      <div className="flex max-w-[36rem] flex-col gap-4 py-10 md:py-12" role="status" aria-label="Loading the story">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className={index % 4 === 3 ? 'h-4 w-2/3' : 'h-4 w-full'} />
        ))}
      </div>
    </Container>
  );
}

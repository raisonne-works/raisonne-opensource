import { Container } from '@/components/raisonne/shell/page';
import { SeriesHeaderSkeleton } from '@/components/raisonne/works/series-header';
import { WorkGridSkeleton } from '@/components/raisonne/works/work-grid';

/** Shown while a series page loads. */
export default function SeriesLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <SeriesHeaderSkeleton />
      <div className="py-10 md:py-12">
        <WorkGridSkeleton count={12} />
      </div>
    </Container>
  );
}

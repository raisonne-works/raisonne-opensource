import { Container } from '@/components/raisonne/shell/page';
import { WorkDetailSkeleton } from '@/components/raisonne/works/work-detail';

/** Shown while a work page loads. */
export default function WorkLoading() {
  return (
    <Container className="pt-6 pb-16 md:pb-24">
      <WorkDetailSkeleton />
    </Container>
  );
}

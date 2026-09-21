import { BioSkeleton } from '@/components/raisonne/profile/bio-with-counts';
import { HighlightsSkeleton } from '@/components/raisonne/profile/highlights';
import { MintingAddressesSkeleton } from '@/components/raisonne/profile/minting-addresses';
import { ResearchAreasSkeleton } from '@/components/raisonne/profile/research-areas';
import { StudioCarouselSkeleton } from '@/components/raisonne/profile/studio-carousel';
import { Container } from '@/components/raisonne/shell/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function AboutLoading() {
  return (
    <Container className="pb-12 md:pb-16">
      <div aria-hidden className="flex flex-col gap-3 py-8 md:py-12">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-80 max-w-full sm:h-10" />
        <Skeleton className="h-6 w-96 max-w-full" />
      </div>

      <div className="grid gap-x-12 gap-y-10 py-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:gap-x-16">
        <div className="flex flex-col gap-6">
          <Skeleton aria-hidden className="h-7 w-40" />
          <BioSkeleton />
        </div>
        <StudioCarouselSkeleton />
      </div>

      <div className="flex flex-col gap-6 py-10">
        <Skeleton aria-hidden className="h-7 w-56" />
        <HighlightsSkeleton />
      </div>

      <div className="flex flex-col gap-6 py-10">
        <Skeleton aria-hidden className="h-7 w-48" />
        <ResearchAreasSkeleton />
      </div>

      <div className="flex flex-col gap-6 py-10">
        <Skeleton aria-hidden className="h-7 w-64" />
        <MintingAddressesSkeleton />
      </div>
    </Container>
  );
}

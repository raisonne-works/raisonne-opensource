import { Container } from '@/components/raisonne/shell/page';
import { RichTextSkeleton } from '@/components/raisonne/shell/rich-text';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <Container size="text" className="pb-16 md:pb-24">
      <div aria-hidden className="flex flex-col gap-3 py-8 md:py-12">
        <Skeleton className="h-9 w-64 max-w-full sm:h-10" />
        <Skeleton className="h-6 w-80 max-w-full" />
      </div>
      <RichTextSkeleton lines={10} />
    </Container>
  );
}

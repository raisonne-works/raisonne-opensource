import { ClientLogosSkeleton } from '@/components/raisonne/commissions/client-logos';
import { CommissionsHeroSkeleton } from '@/components/raisonne/commissions/hero';
import { ServicesSkeleton } from '@/components/raisonne/commissions/services';
import { Container, Section } from '@/components/raisonne/shell/page';

/** Shown while the commissions page loads. */
export default function CommissionsLoading() {
  return (
    <Container className="pb-16 md:pb-24">
      <CommissionsHeroSkeleton />
      <Section title="What the studio takes on">
        <ServicesSkeleton />
      </Section>
      <Section title="Worked with">
        <ClientLogosSkeleton />
      </Section>
    </Container>
  );
}

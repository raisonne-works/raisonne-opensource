import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { awardFacts, awardFactsByCategory } from '@/components/raisonne/records/facts';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { RecordCard } from '@/components/raisonne/records/record-card';
import { RecordFacts } from '@/components/raisonne/records/record-facts';
import { RecordHero } from '@/components/raisonne/records/record-hero';
import { resolveRecordRef } from '@/components/raisonne/records/resolve';
import { BreadcrumbJsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import { StoryBlocks } from '@/components/raisonne/story/story-blocks';
import { decodeParam } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { getAward, getAwards } from '@/fixtures';
import { NO_INDEX, seoMetadata } from '@/lib/seo/metadata';
import { slot } from '@/lib/theme';

/**
 * One award: the prize, the category, where it was given, and the work it
 * was given for.
 *
 * The project is the part most sites drop. A prize means more with the work
 * beside it, so the reference is resolved and shown as a card.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = true;

export function generateStaticParams() {
  return getAwards()
    .filter(award => Boolean(award.slug))
    .map(award => ({ slug: award.slug as string }));
}

async function resolve(params: Params) {
  const { slug } = await params;
  return getAward(decodeParam(slug)) ?? getAward(slug);
}

function pathFor(slug: string): string {
  return `/awards/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const award = await resolve(params);
  if (!award) return { title: 'Not found', robots: NO_INDEX };
  return seoMetadata(award.seo, {
    title: award.organization ? `${award.title}, ${award.organization}` : award.title,
    description: award.description,
    image: award.cover?.kind === 'video' ? award.cover.poster : award.cover?.src,
    path: pathFor(award.slug ?? ''),
  });
}

export default async function AwardPage({ params }: { params: Params }) {
  slot('award');
  const award = await resolve(params);
  if (!award) notFound();

  const project = award.project ? resolveRecordRef(award.project) : null;
  const facts = awardFacts(award, project?.title, project?.href);
  const result = award.prize ?? award.result;

  return (
    <Container className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <RecordBreadcrumb parents={[{ href: '/awards', label: 'Awards' }]} current={award.title} />
      <BreadcrumbJsonLd
        items={[{ name: 'Awards', path: '/awards' }, { name: award.title, path: pathFor(award.slug ?? '') }]}
      />

      <RecordHero
        eyebrow="Award"
        title={award.title}
        subtitle={award.organization}
        description={award.description}
        cover={award.cover}
        badges={result ? <Badge variant="secondary">{result}</Badge> : null}
      />

      <StoryBlocks blocks={award.story ?? []} aside={
          <RecordFacts
            facts={facts}
            alternate={awardFactsByCategory(award, project?.title, project?.href)}
            title="The award"
          />
        } />

      {project ? (
        <Section title="Given for" className="py-0 md:py-0">
          <div className="max-w-xs">
            <RecordCard preview={project} sizes="(min-width: 640px) 20rem, 100vw" />
          </div>
        </Section>
      ) : null}
    </Container>
  );
}

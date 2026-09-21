import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckIcon } from 'lucide-react';

import { DropHero } from '@/components/raisonne/drops/drop-hero';
import { DropPhases } from '@/components/raisonne/drops/drop-phases';
import { DropSpecs } from '@/components/raisonne/drops/drop-specs';
import { NewsletterForm } from '@/components/raisonne/landing/newsletter-form';
import { BreadcrumbJsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import { StoryBlocks } from '@/components/raisonne/story/story-blocks';
import { decodeParam, dropHref, seriesHref, seriesTitle } from '@/components/raisonne/works/lib';
import { getDrop, getDrops, getSeries, getSettings } from '@/fixtures';
import { newsletterState } from '@/lib/newsletter';
import { isModuleEnabled } from '@/lib/records';
import { seoMetadata } from '@/lib/seo/metadata';

type Params = Promise<{ slug: string }>;

/**
 * When this page was rendered (build time for a prerendered page). The
 * countdown starts from it so the first paint matches the server, then
 * follows the browser's own clock.
 */
const RENDERED_AT = Date.now();

/**
 * An announced release: what is coming, when it opens, how it opens, what a
 * collector gets, and a way to be told when the date arrives.
 *
 * Drops are an optional module. With it switched off the route answers 404
 * rather than showing an empty page, and nothing links to it.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  if (!isModuleEnabled(getSettings(), 'drops')) return [];
  return getDrops().map(drop => ({ slug: drop.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const drop = getDrop(decodeParam((await params).slug));
  if (!drop) return { title: 'Not found' };
  return seoMetadata(drop.seo, {
    title: drop.title,
    description: drop.subtitle ?? drop.description?.slice(0, 200),
    image: drop.cover?.src,
    path: dropHref(drop.slug),
    keywords: drop.tags,
  });
}

export default async function DropPage({ params }: { params: Params }) {
  const settings = getSettings();
  const signUp = newsletterState(settings);
  if (!isModuleEnabled(settings, 'drops')) notFound();

  const drop = getDrop(decodeParam((await params).slug));
  if (!drop) notFound();

  const series = drop.seriesSlug ? getSeries(drop.seriesSlug) : null;
  const now = RENDERED_AT;
  // A hand-written fixture can leave a list out; a page should not crash over it.
  const phases = drop.phases ?? [];
  const perks = drop.perks ?? [];
  const story = drop.story ?? [];

  return (
    <Container className="pb-16 md:pb-24">
      <BreadcrumbJsonLd
        items={[
          { name: 'Works', path: '/works' },
          ...(series ? [{ name: seriesTitle(series), path: seriesHref(series) }] : []),
          { name: drop.title },
        ]}
      />
      <DropHero drop={drop} series={series} now={now} />

      <Section title="Release details" id="details">
        <DropSpecs drop={drop} series={series} />
      </Section>

      {phases.length > 0 ? (
        <Section
          title="How it opens"
          id="phases"
          description="Each stage, who can mint in it and at what price."
        >
          <DropPhases phases={phases} now={now} endsAt={drop.endsAt} className="max-w-2xl" />
        </Section>
      ) : null}

      {perks.length > 0 ? (
        <Section title="What collectors get" id="perks">
          <ul className="flex max-w-2xl flex-col gap-2">
            {perks.map(perk => (
              <li key={perk} className="flex items-start gap-2 text-sm text-pretty">
                <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {perk}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {story.length > 0 ? (
        <Section title="About this release" id="about">
          <StoryBlocks blocks={story} headingLevel={3} />
        </Section>
      ) : null}

      {drop.notify && signUp !== 'off' ? (
        <Section title="Get notified" id="notify">
          <NewsletterForm
            title="Get notified"
            description={
              drop.startsAt
                ? 'One email when this opens, and nothing else.'
                : 'One email when the date is set, and nothing else.'
            }
            source={`drop:${drop.slug}`}
            setupNote={signUp === 'unconfigured'}
            className="max-w-xl"
          />
        </Section>
      ) : null}
    </Container>
  );
}

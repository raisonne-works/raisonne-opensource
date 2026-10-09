import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowUpRightIcon } from 'lucide-react';

import { AboutSection } from '@/components/raisonne/records/about-section';
import { collaborationFacts } from '@/components/raisonne/records/facts';
import { PartnerList } from '@/components/raisonne/records/partner-list';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { RecordFacts } from '@/components/raisonne/records/record-facts';
import { RecordHero } from '@/components/raisonne/records/record-hero';
import { RecordIntro } from '@/components/raisonne/records/record-intro';
import { BreadcrumbJsonLd, JsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import { assetsBeyondStory } from '@/components/raisonne/story/asset-index';
import { AssetGallery } from '@/components/raisonne/story/gallery-block';
import { StoryBlocks } from '@/components/raisonne/story/story-blocks';
import { decodeParam, hostOf } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { getCollaboration, getCollaborations, getSettings } from '@/fixtures';
import { imageGalleryJsonLd } from '@/lib/seo/json-ld';
import { NO_INDEX, seoMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import type { Asset } from '@/lib/types';
import { slot } from '@/lib/theme';

/**
 * One collaboration: who it was with, what came of it, and where to see the
 * result. Partners are credited with their roles, because a project with a
 * mill, a museum and a studio in it is not the artist's alone.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = true;

export function generateStaticParams() {
  return getCollaborations().map(record => ({ slug: record.slug }));
}

async function resolve(params: Params) {
  const { slug } = await params;
  return getCollaboration(decodeParam(slug)) ?? getCollaboration(slug);
}

function pathFor(slug: string): string {
  return `/collaborations/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const collaboration = await resolve(params);
  if (!collaboration) return { title: 'Not found', robots: NO_INDEX };
  return seoMetadata(collaboration.seo, {
    title: collaboration.title,
    description: collaboration.description ?? collaboration.subtitle,
    image: collaboration.cover?.kind === 'video' ? collaboration.cover.poster : collaboration.cover?.src,
    path: pathFor(collaboration.slug),
    keywords: collaboration.tags,
  });
}

export default async function CollaborationPage({ params }: { params: Params }) {
  slot('collaboration');
  const collaboration = await resolve(params);
  if (!collaboration) notFound();

  const hasAbout = Boolean(collaboration.about && collaboration.about.length > 0);
  const documentation = assetsBeyondStory(
    [...collaboration.photos, ...collaboration.videos],
    collaboration.story,
    collaboration.cover,
  );

  const images: Asset[] = [collaboration.cover, ...collaboration.photos].filter((asset): asset is Asset =>
    Boolean(asset),
  );

  const factsNode = (
    <div className="flex flex-col gap-8">
      <RecordFacts
        facts={collaborationFacts(collaboration)}
        title="The project"
        highlights={collaboration.highlights}
        actions={
          collaboration.projectUrl ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={collaboration.projectUrl} target="_blank" rel="noopener noreferrer" />}
            >
              Visit {hostOf(collaboration.projectUrl)}
              <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
          ) : null
        }
      />
      <PartnerList partners={collaboration.partners} headingLevel={2} />
    </div>
  );

  return (
    <Container className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <RecordBreadcrumb parents={[{ href: '/collaborations', label: 'Collaborations' }]} current={collaboration.title} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Collaborations', path: '/collaborations' },
          { name: collaboration.title, path: pathFor(collaboration.slug) },
        ]}
      />
      {images.length > 1 ? (
        <JsonLd
          data={imageGalleryJsonLd({
            name: collaboration.title,
            description: collaboration.description,
            origin: siteOrigin(getSettings()),
            path: pathFor(collaboration.slug),
            images,
          })}
        />
      ) : null}

      <RecordHero
        eyebrow={collaboration.kind ?? 'Collaboration'}
        title={collaboration.title}
        subtitle={collaboration.subtitle}
        description={collaboration.description}
        cover={collaboration.cover}
        tags={collaboration.tags}
      />

      {hasAbout ? (
        <RecordIntro aside={factsNode}>
          <AboutSection title="About the project" body={collaboration.about} />
        </RecordIntro>
      ) : null}

      <StoryBlocks blocks={collaboration.story} aside={hasAbout ? undefined : factsNode} />

      {documentation.length > 0 ? (
        <Section title="Documentation" className="py-0 md:py-0">
          <AssetGallery items={documentation} />
        </Section>
      ) : null}
    </Container>
  );
}

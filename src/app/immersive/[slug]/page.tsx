import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowUpRightIcon } from 'lucide-react';

import { immersiveFacts, installationFacts, installationFactsByMaking } from '@/components/raisonne/records/facts';
import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { RecordFacts } from '@/components/raisonne/records/record-facts';
import { RecordHero } from '@/components/raisonne/records/record-hero';
import { BreadcrumbJsonLd, JsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import { assetsBeyondStory } from '@/components/raisonne/story/asset-index';
import { AssetGallery } from '@/components/raisonne/story/gallery-block';
import { StoryBlocks } from '@/components/raisonne/story/story-blocks';
import { decodeParam } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { getImmersive, getImmersives, getInstallation, getInstallations, getSettings } from '@/fixtures';
import { imageGalleryJsonLd } from '@/lib/seo/json-ld';
import { NO_INDEX, seoMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import type { Asset, Immersive, Installation } from '@/lib/types';
import { slot } from '@/lib/theme';

/**
 * One installation, or one immersive experience.
 *
 * Both live on this route on purpose: an immersive piece is an installation
 * a visitor walks into somewhere else, it is listed with them, and giving it
 * a route of its own would split one body of work across two URLs.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return [...getInstallations(), ...getImmersives()].map(record => ({ slug: record.slug }));
}

type Found = { record: Installation; kind: 'installation' } | { record: Immersive; kind: 'immersive' } | null;

async function resolve(params: Params): Promise<Found> {
  const { slug } = await params;
  const key = decodeParam(slug);
  const installation = getInstallation(key) ?? getInstallation(slug);
  if (installation) return { record: installation, kind: 'installation' };
  const immersive = getImmersive(key) ?? getImmersive(slug);
  return immersive ? { record: immersive, kind: 'immersive' } : null;
}

function pathFor(slug: string): string {
  return `/immersive/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return { title: 'Not found', robots: NO_INDEX };
  const { record } = found;
  return seoMetadata(record.seo, {
    title: record.title,
    description: record.description ?? record.subtitle,
    image: record.cover?.kind === 'video' ? record.cover.poster : record.cover?.src,
    path: pathFor(record.slug),
    keywords: record.tags,
  });
}

export default async function InstallationPage({ params }: { params: Params }) {
  slot('installation');
  const found = await resolve(params);
  if (!found) notFound();

  const { record, kind } = found;
  const facts = kind === 'immersive' ? immersiveFacts(record) : installationFacts(record);
  const documentation = assetsBeyondStory([...record.photos, ...record.videos], record.story, record.cover);
  const experienceUrl = kind === 'immersive' ? record.experienceUrl : null;
  const path = pathFor(record.slug);
  const year = record.year === null ? null : String(record.year);
  const medium = kind === 'installation' ? record.medium : null;

  const images: Asset[] = [record.cover, ...record.photos].filter((asset): asset is Asset => Boolean(asset));

  return (
    <Container className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <RecordBreadcrumb parents={[{ href: '/immersive', label: 'Immersive' }]} current={record.title} />
      <BreadcrumbJsonLd
        items={[{ name: 'Immersive', path: '/immersive' }, { name: record.title, path }]}
      />
      {images.length > 1 ? (
        <JsonLd
          data={imageGalleryJsonLd({
            name: record.title,
            description: record.description,
            origin: siteOrigin(getSettings()),
            path,
            images,
          })}
        />
      ) : null}

      <RecordHero
        eyebrow={kind === 'immersive' ? 'Immersive experience' : 'Installation'}
        title={record.title}
        subtitle={record.subtitle}
        description={record.description}
        cover={record.cover}
        tags={record.tags}
        place={kind === 'installation' ? record.location : null}
        corner={(kind === 'immersive' ? record.duration : null) ?? year}
        labels={[...(year ? [year] : []), ...(medium ? [medium.split(' ').slice(0, 3).join(' ')] : [])]}
      />

      <StoryBlocks
        blocks={record.story}
        aside={
          <RecordFacts
            facts={facts}
            alternate={kind === 'installation' ? installationFactsByMaking(record) : undefined}
            actions={
              experienceUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<a href={experienceUrl} target="_blank" rel="noopener noreferrer" />}
                >
                  Open the experience
                  <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
                  <span className="sr-only">(opens in a new tab)</span>
                </Button>
              ) : null
            }
          />
        }
      />

      {documentation.length > 0 ? (
        <Section title="Documentation" className="py-0 md:py-0">
          <AssetGallery items={documentation} />
        </Section>
      ) : null}
    </Container>
  );
}

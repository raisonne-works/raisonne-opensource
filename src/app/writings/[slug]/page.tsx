import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RecordBreadcrumb } from '@/components/raisonne/records/record-breadcrumb';
import { WritingArticle } from '@/components/raisonne/records/writing-article';
import { BreadcrumbJsonLd, JsonLd } from '@/components/raisonne/seo/json-ld';
import { Container, Section } from '@/components/raisonne/shell/page';
import { StoryBlocks } from '@/components/raisonne/story/story-blocks';
import { decodeParam } from '@/components/raisonne/works/lib';
import { getSettings, getWriting, getWritings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';
import { articleJsonLd } from '@/lib/seo/json-ld';
import { NO_INDEX, seoMetadata } from '@/lib/seo/metadata';
import { siteOrigin } from '@/lib/seo/urls';
import { slot } from '@/lib/theme';

/**
 * One paper or essay. Writings are an optional module: an install that has
 * none, or has switched them off, answers 404 here rather than showing an
 * empty page.
 */

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

function writingsEnabled(): boolean {
  return isModuleEnabled(getSettings(), 'writings');
}

export function generateStaticParams() {
  if (!writingsEnabled()) return [];
  return getWritings().map(writing => ({ slug: writing.slug }));
}

async function resolve(params: Params) {
  if (!writingsEnabled()) return null;
  const { slug } = await params;
  return getWriting(decodeParam(slug)) ?? getWriting(slug);
}

function pathFor(slug: string): string {
  return `/writings/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const writing = await resolve(params);
  if (!writing) return { title: 'Not found', robots: NO_INDEX };
  return seoMetadata(writing.seo, {
    title: writing.title,
    description: writing.description ?? writing.subtitle,
    image: writing.cover?.kind === 'video' ? writing.cover.poster : writing.cover?.src,
    path: pathFor(writing.slug),
    keywords: writing.tags,
    type: 'article',
  });
}

export default async function WritingPage({ params }: { params: Params }) {
  slot('writing');
  const writing = await resolve(params);
  if (!writing) notFound();

  return (
    <Container size="text" className="flex flex-col gap-10 pt-6 pb-16 md:gap-12 md:pb-24">
      <RecordBreadcrumb parents={[{ href: '/writings', label: 'Writings' }]} current={writing.title} />
      <BreadcrumbJsonLd
        items={[{ name: 'Writings', path: '/writings' }, { name: writing.title, path: pathFor(writing.slug) }]}
      />
      <JsonLd
        data={articleJsonLd({
          origin: siteOrigin(getSettings()),
          path: pathFor(writing.slug),
          headline: writing.title,
          description: writing.description,
          image: writing.cover?.src ?? null,
          datePublished: writing.publishedAt,
          authors: writing.authors,
          publisher: writing.publishedIn,
          section: writing.category,
          keywords: writing.tags,
        })}
      />
      <WritingArticle writing={writing} />
      {writing.story.length > 0 ? (
        <Section title="More" className="py-0 md:py-0" size="small">
          <StoryBlocks blocks={writing.story} headingLevel={3} />
        </Section>
      ) : null}
    </Container>
  );
}

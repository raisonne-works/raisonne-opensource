import Image from 'next/image';
import { Fragment } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import type { RichBlock, RichInline, RichText } from '@/lib/types';
import { cn } from '@/lib/utils';

import type { HeadingLevel } from './heading';

/**
 * The only renderer of RichText. Every CMS's rich text is turned into the
 * portable RichText shape by the importer, so this file is the single place
 * that decides how a paragraph, a heading, a quote, a list and an inline
 * image look.
 *
 * Headings are relative: `headingLevel` is what a level-2 block becomes, so
 * an essay under an h1 gets h2, h3, h4 and the outline stays correct
 * wherever the text is placed.
 *
 * There is no dangerouslySetInnerHTML here: rich text arrives as data and
 * leaves as elements, so a CMS can never inject markup into a page.
 */
export function RichTextView({
  value,
  headingLevel = 2,
  className,
}: {
  value: RichText | null | undefined;
  /** What a level-2 block renders as. Deeper blocks follow it. */
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (!value || value.length === 0) return null;

  return (
    <div data-slot="rich-text" className={cn('flex flex-col gap-4 text-base/relaxed text-pretty', className)}>
      {value.map((block, index) => (
        <RichBlockView key={index} block={block} headingLevel={headingLevel} />
      ))}
    </div>
  );
}

/** A level-2 block becomes `base`, a level-3 the one under it, and so on, never past h6. */
function headingLevelFor(level: 2 | 3 | 4, base: HeadingLevel): HeadingLevel {
  return Math.min(6, base + (level - 2)) as HeadingLevel;
}

const HEADING_CLASS: Record<2 | 3 | 4, string> = {
  2: 'pt-2 text-xl font-semibold tracking-tight text-balance',
  3: 'pt-1 text-lg font-semibold tracking-tight text-balance',
  4: 'text-base font-semibold tracking-tight text-balance',
};

function RichBlockView({ block, headingLevel }: { block: RichBlock; headingLevel: HeadingLevel }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p>
          <Inlines nodes={block.children} />
        </p>
      );
    case 'heading': {
      const Heading = `h${headingLevelFor(block.level, headingLevel)}` as const;
      return (
        <Heading className={HEADING_CLASS[block.level]}>
          <Inlines nodes={block.children} />
        </Heading>
      );
    }
    case 'quote':
      return (
        <blockquote className="border-l-2 border-border pl-4 text-pretty italic">
          <Inlines nodes={block.children} />
        </blockquote>
      );
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List className={cn('flex list-outside flex-col gap-1.5 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}>
          {block.items.map((item, index) => (
            <li key={index} className="pl-1">
              <Inlines nodes={item} />
            </li>
          ))}
        </List>
      );
    }
    case 'image': {
      const { asset } = block;
      return (
        <figure className="flex flex-col gap-2">
          <div className="relative w-full overflow-hidden rounded-lg bg-muted dark:bg-muted/40">
            <Image
              src={asset.src}
              alt={asset.alt ?? ''}
              width={asset.width ?? 1600}
              height={asset.height ?? 1200}
              sizes="(min-width: 1024px) 40rem, 100vw"
              className="h-auto w-full object-contain"
            />
          </div>
          {asset.caption ? (
            <figcaption className="text-sm text-pretty text-muted-foreground">{asset.caption}</figcaption>
          ) : null}
        </figure>
      );
    }
    default:
      return null;
  }
}

function Inlines({ nodes }: { nodes: RichInline[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>
          <InlineView node={node} />
        </Fragment>
      ))}
    </>
  );
}

function InlineView({ node }: { node: RichInline }) {
  let content: React.ReactNode = node.text;
  if (node.bold) content = <strong className="font-semibold">{content}</strong>;
  if (node.italic) content = <em>{content}</em>;

  if (!node.href) return <>{content}</>;

  const external = /^https?:\/\//i.test(node.href);
  return (
    <a
      href={node.href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="rounded-sm underline underline-offset-4 outline-none hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {content}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}

export function RichTextSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="status" aria-label="Loading text">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-4 w-full', index === lines - 1 && 'w-2/3')} />
      ))}
    </div>
  );
}

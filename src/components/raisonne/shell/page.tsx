import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { HeadingLevel } from './heading';
import { READING_CLASS, READING_LEAD_CLASS } from './measure';

/**
 * Page scaffolding shared by every route. Server-safe (no hooks, no client
 * code), so any page or component can use it.
 *
 * Density system: one gutter (px-4, px-6 from sm, px-8 from lg, px-12 from
 * 3xl), sections spaced by py-10 (py-12 from md), and gap-6 inside a section.
 */

const containerSizes = {
  /** Media and grids: uses the width, up to 2880 px of content. */
  wide: 'max-w-[180rem]',
  /**
   * The page width. Same gutter as the header, out to the edges.
   * A reading measure belongs on a paragraph, not on the page.
   */
  editorial: 'max-w-[180rem]',
  /** Reading: a single column of about 72 characters (plus the gutter at each breakpoint). */
  text: 'max-w-[calc(72ch+2rem)] sm:max-w-[calc(72ch+3rem)] lg:max-w-[calc(72ch+4rem)] 3xl:max-w-[calc(72ch+6rem)]',
} as const;

export function Container({
  children,
  className,
  size = 'wide',
}: {
  children: ReactNode;
  className?: string;
  size?: 'text' | 'editorial' | 'wide';
}) {
  return (
    <div
      data-slot="container"
      data-size={size}
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8 3xl:px-12', containerSizes[size], className)}
    >
      {children}
    </div>
  );
}

/**
 * The top of a page: an optional eyebrow, the h1, a short description capped
 * at reading width, and actions. Actions sit to the right on wide screens
 * unless `actionsBelow`, which keeps them under the text, inside its column.
 * Place it inside a Container.
 */
export function PageHeader({
  title,
  description,
  actions,
  actionsBelow = false,
  eyebrow,
  headingLevel = 1,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Keeps the actions in the text column, under the description. */
  actionsBelow?: boolean;
  eyebrow?: ReactNode;
  /** 1 on a page; deeper where a page header is shown inside another page. */
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;

  return (
    <header
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-4 py-8 md:gap-8 md:py-12',
        actions && !actionsBelow && 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
        <Heading className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</Heading>
        {description ? (
          <div className={cn('text-base text-pretty text-muted-foreground sm:text-lg', READING_LEAD_CLASS)}>
            {description}
          </div>
        ) : null}
        {actions && actionsBelow ? <div className="flex flex-wrap items-center gap-2 pt-2">{actions}</div> : null}
      </div>
      {actions && !actionsBelow ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

/**
 * A titled block of a page. The heading row carries an optional action (a
 * "View all" link, a filter) that sits to the right of the title.
 *
 * `headingLevel` defaults to 2; pass a deeper one for a nested section or
 * where the block sits inside another page. The heading's size follows
 * `size`, which follows the level unless it is given.
 */
export function Section({
  title,
  description,
  action,
  children,
  id,
  className,
  headingLevel = 2,
  size,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  headingLevel?: HeadingLevel;
  /** How big the heading looks, apart from what it means. */
  size?: 'default' | 'small';
}) {
  const Heading = `h${headingLevel}` as const;
  const titleId = id && title ? `${id}-title` : undefined;
  const hasHeader = Boolean(title || description || action);
  const large = (size ?? (headingLevel === 2 ? 'default' : 'small')) === 'default';

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      data-slot="section"
      className={cn('flex scroll-mt-20 flex-col gap-6 py-10 md:py-12', className)}
    >
      {hasHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? (
              <Heading
                id={titleId}
                className={cn('font-semibold tracking-tight text-balance', large ? 'text-xl sm:text-2xl' : 'text-lg')}
              >
                {title}
              </Heading>
            ) : null}
            {description ? (
              <div className={cn('text-sm text-pretty text-muted-foreground sm:text-base', READING_CLASS)}>
                {description}
              </div>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

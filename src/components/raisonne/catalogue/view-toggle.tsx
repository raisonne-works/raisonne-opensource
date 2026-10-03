'use client';

import Link from 'next/link';
import { GalleryHorizontalIcon, Grid3x3Icon, LayoutGridIcon, LayoutListIcon, TableIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';

import { cn } from '@/lib/utils';

import { VIEWS, VIEW_COOKIE, catalogueHref, type CatalogueConfig, type CatalogueState, type ViewId } from './lib';

const VIEW_ICONS: Record<ViewId, ComponentType<{ className?: string }>> = {
  grid: LayoutGridIcon,
  dense: Grid3x3Icon,
  sheet: LayoutListIcon,
  table: TableIcon,
  wall: GalleryHorizontalIcon,
};

/** A year, so the choice outlives the session without being permanent. */
const REMEMBER_SECONDS = 60 * 60 * 24 * 365;

/** Remembers the view for next time. A browser that refuses cookies still gets it from the URL. */
function rememberView(view: ViewId): void {
  try {
    document.cookie = `${VIEW_COOKIE}=${view}; path=/; max-age=${REMEMBER_SECONDS}; samesite=lax`;
  } catch {
    // Nothing to do: the URL carries the choice either way.
  }
}

/**
 * The views a phone offers. Five icon-only buttons crammed into what is left
 * of a 390 px row is the wrong offer on a phone; the two that read well at
 * that width are the grid and the table, and the rest come back from md up.
 * A view chosen on a wide screen still renders on a narrow one, because the
 * URL carries it.
 */
const NARROW_VIEWS: ViewId[] = ['grid', 'table'];

/**
 * How the list is drawn. A list says which of the five views it offers, so a
 * list of shows can offer the grid and the table only.
 *
 * Each view is a link, which keeps it in the URL and shareable, and the
 * choice is also remembered for this visitor in a cookie the server reads
 * next time, so their preferred view is the one that renders first.
 */
export function ViewToggle({
  state,
  config,
  className,
}: {
  state: CatalogueState;
  config: CatalogueConfig;
  className?: string;
}) {
  const group = useRef<HTMLDivElement>(null);
  /**
   * For a design that folds the views behind one key: whether they are out.
   * Skin zero shows every view all the time and never draws the key.
   */
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Another key of the bar, or Escape, puts the views away again.
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('[data-control]') : null;
      if (target && !group.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (config.views.length < 2) return null;

  return (
    <div
      ref={group}
      role="group"
      data-slot="view-toggle"
      data-open={open ? '' : undefined}
      aria-label="How the list is shown"
      className={cn('inline-flex items-center gap-0.5 rounded-lg border p-0.5', className)}
    >
      <button
        type="button"
        data-control="views"
        aria-label="Layout"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="hidden"
      >
        <LayoutGridIcon aria-hidden />
      </button>
      {config.views.map(id => {
        const view = VIEWS[id];
        const Icon = VIEW_ICONS[id];
        const current = state.view === id;
        const narrow = NARROW_VIEWS.includes(id) || current;
        return (
          <Link
            key={id}
            href={catalogueHref(config, state, { view: id, page: state.page, through: state.through })}
            scroll={false}
            onClick={() => {
              rememberView(id);
              setOpen(false);
            }}
            aria-current={current ? 'true' : undefined}
            data-view={id}
            title={`${view.label}: ${view.description.toLowerCase()}`}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
              current && 'bg-secondary text-secondary-foreground',
              !narrow && 'hidden md:inline-flex',
            )}
          >
            <Icon className="size-4" />
            <span className="sr-only">{view.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

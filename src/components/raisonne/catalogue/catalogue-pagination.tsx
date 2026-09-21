import { WorksPagination } from '@/components/raisonne/works/works-pagination';

import { catalogueHref, pageCount, type CatalogueConfig, type CatalogueState } from './lib';

/**
 * The one paging control on the site.
 *
 * A catalogue raisonne is cited, so a position in a list has to be a place
 * rather than a scroll depth: every page is its own URL (?page=3), which can
 * be shared, opened in a new tab, printed in a footnote and crawled. It is
 * also the only shape that is bounded, because each request renders exactly
 * one page whatever the address bar asks for.
 *
 * The series pages use the same component, so a visitor moving from the
 * catalogue into a series meets the same control doing the same job.
 */
export function CataloguePagination({
  state,
  config,
  total,
  anchorId,
  className,
}: {
  state: CatalogueState;
  config: CatalogueConfig;
  /** How many rows match right now. */
  total: number;
  /** The id at the top of the list, so a new page opens at the list. */
  anchorId: string;
  className?: string;
}) {
  const pages = pageCount(total);
  if (pages <= 1) return null;

  return (
    <WorksPagination
      page={Math.min(state.page, pages)}
      pages={pages}
      hrefFor={page => `${catalogueHref(config, state, { page })}#${anchorId}`}
      className={className}
    />
  );
}

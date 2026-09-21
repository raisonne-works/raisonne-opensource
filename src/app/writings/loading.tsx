import { CatalogueListSkeleton } from '@/components/raisonne/catalogue/list-page';

/** The writings list while it loads: the header, the controls, then a page of tiles. */
export default function WritingsLoading() {
  return <CatalogueListSkeleton view="grid" />;
}

import { CatalogueListSkeleton } from '@/components/raisonne/catalogue/list-page';

/** The awards list while it loads: the header, the controls, then a page of tiles. */
export default function AwardsLoading() {
  return <CatalogueListSkeleton view="grid" />;
}

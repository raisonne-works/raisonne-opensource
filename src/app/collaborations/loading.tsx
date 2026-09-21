import { CatalogueListSkeleton } from '@/components/raisonne/catalogue/list-page';

/** The collaborations list while it loads: the header, the controls, then a page of tiles. */
export default function CollaborationsLoading() {
  return <CatalogueListSkeleton view="grid" />;
}

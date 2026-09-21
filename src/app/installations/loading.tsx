import { CatalogueListSkeleton } from '@/components/raisonne/catalogue/list-page';

/** The installations list while it loads: the header, the controls, then a page of tiles. */
export default function InstallationsLoading() {
  return <CatalogueListSkeleton view="grid" />;
}

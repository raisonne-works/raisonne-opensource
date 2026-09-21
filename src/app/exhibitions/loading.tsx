import { CatalogueListSkeleton } from '@/components/raisonne/catalogue/list-page';

/** The exhibitions list while it loads: the header, the controls, then a page of tiles. */
export default function ExhibitionsLoading() {
  return <CatalogueListSkeleton view="grid" />;
}

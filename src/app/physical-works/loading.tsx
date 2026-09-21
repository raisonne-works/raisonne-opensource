import { CatalogueListSkeleton } from '@/components/raisonne/catalogue/list-page';

/** The physical works list while it loads: the header, the controls, then a page of tiles. */
export default function PhysicalWorksLoading() {
  return <CatalogueListSkeleton view="grid" />;
}

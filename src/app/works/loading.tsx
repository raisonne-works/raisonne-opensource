import { CatalogueListSkeleton } from '@/components/raisonne/catalogue/list-page';

/** The catalogue index while it loads: the header, the controls, then a page of tiles. */
export default function WorksLoading() {
  return <CatalogueListSkeleton />;
}

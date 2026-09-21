import { notFound } from 'next/navigation';

import { getSettings } from '@/fixtures';
import { isModuleEnabled } from '@/lib/records';

/**
 * The module gate for announced releases, held above the loading boundary.
 *
 * The drop page gates itself too, but a loading.tsx makes Next flush the shell
 * with a 200 before the page's notFound() is reached, so a switched-off module
 * would answer a soft 404. A layout renders outside that boundary.
 */
export default function DropsLayout({ children }: { children: React.ReactNode }) {
  if (!isModuleEnabled(getSettings(), 'drops')) notFound();
  return children;
}

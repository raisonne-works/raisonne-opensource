import type { Metadata } from 'next';

import { MaintenanceNotice } from '@/components/raisonne/shell/maintenance';
import { getSiteData } from '@/fixtures';
import { NO_INDEX } from '@/lib/seo/metadata';

/**
 * The page the whole site becomes while maintenance mode is on. It always
 * answers, so the artist can see it before switching the site off, and it is
 * never indexed either way: a crawler that arrives during an outage must not
 * store this in place of the catalogue.
 */
export function generateMetadata(): Metadata {
  const { artist } = getSiteData();
  return {
    title: 'Maintenance',
    description: `${artist.name} is updating this site.`,
    robots: NO_INDEX,
  };
}

export default function MaintenancePage() {
  const { artist, settings } = getSiteData();

  return (
    <MaintenanceNotice artist={artist} maintenance={settings.maintenance} preview={!settings.maintenance.enabled} />
  );
}

import { ExternalLinkIcon, MailIcon, WrenchIcon } from 'lucide-react';

import { Container } from '@/components/raisonne/shell/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Artist, SiteSettings } from '@/lib/types';

/**
 * What the whole site shows while it is switched off.
 *
 * It is a real page, not a holding image: the artist's name, why the site is
 * closed in their own words, and a way to reach them. The proxy sends every
 * other address here while settings.maintenance.enabled is true, and the page
 * is never indexed.
 */
export function MaintenanceNotice({
  artist,
  maintenance,
  preview = false,
}: {
  artist: Artist;
  maintenance: SiteSettings['maintenance'];
  /** True when the site is open and this page is only being looked at. */
  preview?: boolean;
}) {
  const message = maintenance.message?.trim() || 'The catalogue is being updated and will be back shortly.';
  const profiles = artist.links.filter(link => link.kind !== 'email' && link.href?.startsWith('http')).slice(0, 4);

  return (
    <Container size="text" className="flex min-h-[60svh] flex-col justify-center gap-8 py-16 md:py-24">
      {preview ? (
        <Alert>
          <WrenchIcon aria-hidden="true" />
          <AlertTitle>The site is open</AlertTitle>
          <AlertDescription>
            This is the page visitors would see with maintenance mode switched on. Nothing is redirected right now.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <WrenchIcon aria-hidden="true" className="size-4" />
          Maintenance
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{artist.name}</h1>
        <p className="text-base text-pretty text-muted-foreground sm:text-lg">{message}</p>
      </div>

      {artist.email || profiles.length ? (
        <div className="flex flex-col gap-4 border-t pt-6">
          <p className="text-sm text-muted-foreground">In the meantime</p>
          <div className="flex flex-wrap items-center gap-2">
            {artist.email ? (
              <Button variant="outline" nativeButton={false} render={<a href={`mailto:${artist.email}`} />}>
                <MailIcon aria-hidden="true" />
                {artist.email}
              </Button>
            ) : null}
            {/* Outline, not ghost: a bare word in a row of buttons reads as
                a label rather than as somewhere to go. */}
            {profiles.map(link => (
              <Button
                key={link.href}
                variant="outline"
                nativeButton={false}
                render={<a href={link.href} target="_blank" rel="noreferrer noopener" />}
              >
                {link.label}
                <ExternalLinkIcon aria-hidden data-icon="inline-end" />
                <span className="sr-only">(opens in a new tab)</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </Container>
  );
}

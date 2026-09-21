import Link from 'next/link';
import { ArrowRightIcon, CheckCircle2Icon, PaletteIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { shortAddress } from '@/components/raisonne/works/lib';
import type { SessionRole } from '@/lib/types';
import { cn } from '@/lib/utils';

import { signOutAction } from './actions';
import { COLLECTOR_LINKS, OWNER_LINKS, publicProfileLink } from './account-links';

/**
 * What /auth shows somebody who is already signed in.
 *
 * Arriving at a sign-in page while signed in is not an error and is not a
 * redirect: it usually means somebody wants to check which wallet they used,
 * change it, or leave. So the page says who they are, offers the places that
 * being signed in is for, and puts sign-out where it can be found.
 *
 * The sign-out here is a plain form, so it works with no JavaScript at all.
 */
export function SignedInPanel({
  address,
  ens,
  role,
  publicProfile = false,
  /** Where the visitor was headed before the gate sent them here. */
  next,
  className,
}: {
  address: string;
  ens: string | null;
  role: SessionRole;
  /** Whether this install publishes a page per wallet (settings.publicCollectorProfiles). */
  publicProfile?: boolean;
  next?: string | null;
  className?: string;
}) {
  const links = [
    ...COLLECTOR_LINKS,
    // Offered only where there is a public page. Otherwise it is a link to
    // a page nobody but this visitor can open, under a label promising the
    // opposite.
    ...(publicProfile ? [publicProfileLink(address)] : []),
    ...(role === 'owner' ? OWNER_LINKS : []),
  ];

  return (
    <div data-slot="signed-in-panel" className={cn('flex w-full max-w-[36rem] flex-col gap-6', className)}>
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          Signed in as {ens ?? shortAddress(address)}
          {role === 'owner' ? (
            <Badge variant="secondary">
              <PaletteIcon aria-hidden data-icon="inline-start" />
              Artist
            </Badge>
          ) : null}
        </p>
        {ens ? <p className="font-mono text-xs break-all text-muted-foreground">{address}</p> : null}
      </div>

      {next ? (
        <Button nativeButton={false} render={<Link href={next} />} className="w-fit">
          Continue
          <ArrowRightIcon aria-hidden data-icon="inline-end" />
        </Button>
      ) : null}

      <ul className="flex list-none flex-col gap-2">
        {links.map(link => (
          <li key={link.href}>
            <Item variant="outline" size="sm" render={<Link href={link.href} className="w-full" />}>
              <ItemContent>
                <ItemTitle>{link.label}</ItemTitle>
                <ItemDescription>{link.description}</ItemDescription>
              </ItemContent>
              <ArrowRightIcon aria-hidden className="size-4 text-muted-foreground" />
            </Item>
          </li>
        ))}
      </ul>

      <form action={signOutAction} className="flex flex-col gap-2">
        <input type="hidden" name="next" value={next ?? ''} />
        <Button type="submit" variant="outline" className="w-fit">
          Sign out
        </Button>
        <p className={cn('text-sm text-pretty text-muted-foreground', READING_CLASS)}>
          Signing out clears the cookie on this device. Nothing about your wallet is stored on the server, so there is
          nothing else to delete.
        </p>
      </form>
    </div>
  );
}

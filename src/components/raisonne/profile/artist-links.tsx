import type { ComponentType, SVGProps } from 'react';
import {
  AtSign,
  BookOpen,
  Brain,
  Camera,
  Cpu,
  Database,
  Globe,
  Grid3x3,
  Layers,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Newspaper,
  Palette,
  Printer,
  Rss,
  Send,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
} from 'lucide-react';

import type { ArtistLink, LinkKind } from '@/lib/types';

/**
 * The artist's links, tidied: an icon for each one, the right rel, and the
 * groups the footer and the About page show them in.
 *
 * lucide has no brand marks, and a catalogue should not ship twenty of them
 * anyway, so a link carries a generic icon that says what kind of place it
 * points at. The handle beside it does the naming.
 */

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/** The names a fixture may use in ArtistLink.icon and researchAreas[].icon. */
const ICONS: Record<string, Icon> = {
  AtSign,
  BookOpen,
  Brain,
  Camera,
  Cpu,
  Database,
  Globe,
  Grid3x3,
  Layers,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Newspaper,
  Palette,
  Printer,
  Rss,
  Send,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
};

const KIND_ICONS: Record<LinkKind, Icon> = {
  social: AtSign,
  marketplace: Store,
  site: Globe,
  email: Mail,
  other: Link2,
};

/** The icon a link asks for, the one its kind implies, or a plain link mark. */
export function linkIcon(link: Pick<ArtistLink, 'icon' | 'kind'>): Icon {
  const named = link.icon ? ICONS[link.icon] : undefined;
  return named ?? KIND_ICONS[link.kind ?? 'other'];
}

/** An icon by name, for research areas and anything else that stores one. */
export function iconByName(name: string | null | undefined, fallback: Icon = Sparkles): Icon {
  return (name ? ICONS[name] : undefined) ?? fallback;
}

/**
 * The artist's other sites and their own profiles are the same person, so
 * they carry rel="me": that is what the convention asks for, and a profile
 * that links back completes the pair. A marketplace listing is a shop, not
 * the artist, so it stays an ordinary outbound link.
 */
export function linkRel(link: Pick<ArtistLink, 'kind'>): string {
  const kind = link.kind ?? 'other';
  return kind === 'site' || kind === 'social' ? 'me noopener noreferrer' : 'noopener noreferrer';
}

/** A mailto: link opens a mail client, not a tab. */
export function isMailto(href: string): boolean {
  return href.trim().toLowerCase().startsWith('mailto:');
}

/** What a link says under its label: the handle if there is one, else the host. */
export function linkDetail(link: ArtistLink): string | null {
  if (link.handle) return link.handle;
  if (isMailto(link.href)) return link.href.slice('mailto:'.length);
  try {
    const url = new URL(link.href);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export interface LinkGroups {
  /** Social profiles and the artist's other sites. */
  social: ArtistLink[];
  /** Where the work can be collected. */
  marketplace: ArtistLink[];
}

/** Splits the artist's links into the two groups a page shows separately. */
export function groupLinks(links: readonly ArtistLink[]): LinkGroups {
  return {
    social: links.filter(link => (link.kind ?? 'other') !== 'marketplace'),
    marketplace: links.filter(link => link.kind === 'marketplace'),
  };
}

/**
 * A list of links with their icons and handles. `labelledBy` points at the
 * heading above it, so the list is named for a screen reader.
 */
export function ArtistLinkList({
  links,
  labelledBy,
  className,
}: {
  links: readonly ArtistLink[];
  labelledBy?: string;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <ul aria-labelledby={labelledBy} className={className}>
      {links.map(link => {
        const Icon = linkIcon(link);
        const detail = linkDetail(link);
        const external = !isMailto(link.href);
        return (
          <li key={link.href}>
            <a
              href={link.href}
              rel={external ? linkRel(link) : undefined}
              target={external ? '_blank' : undefined}
              className="group/link -mx-1.5 flex items-baseline gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Icon aria-hidden className="size-3.5 shrink-0 translate-y-0.5" />
              <span className="underline-offset-4 group-hover/link:underline">{link.label}</span>
              {detail && detail !== link.label ? (
                <span className="min-w-0 truncate text-xs text-muted-foreground/80">{detail}</span>
              ) : null}
              {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

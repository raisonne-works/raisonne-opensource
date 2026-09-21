import Image from 'next/image';

import { Skeleton } from '@/components/ui/skeleton';
import type { Client } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The people the studio has worked with. A logo when there is one, the name
 * set as text when there is not, so a wall never has holes in it.
 *
 * Logos are kept at one height and their own width, because a logotype is
 * not a picture to crop. An SVG is served as it is: next/image does not
 * optimize vector files.
 */
export function ClientLogos({ clients, className }: { clients: Client[]; className?: string }) {
  if (clients.length === 0) return null;

  return (
    <ul
      className={cn(
        'grid grid-cols-2 items-center gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-6',
        className,
      )}
    >
      {clients.map(client => (
        <li key={client.name} className="flex min-w-0 items-center justify-center">
          <ClientLogo client={client} />
        </li>
      ))}
    </ul>
  );
}

function ClientLogo({ client }: { client: Client }) {
  const content = client.logo ? (
    <span className="relative block h-10 w-full">
      <Image
        src={client.logo.src}
        alt={client.name}
        fill
        sizes="(min-width: 1920px) 14vw, (min-width: 1024px) 20vw, 40vw"
        unoptimized={/\.svg(?:$|[?#])/i.test(client.logo.src)}
        className="object-contain object-center"
      />
    </span>
  ) : (
    <span className="text-center text-sm font-medium text-pretty text-muted-foreground">{client.name}</span>
  );

  if (!client.url) {
    return <span className="flex w-full items-center justify-center">{content}</span>;
  }

  return (
    <a
      href={client.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center rounded-lg outline-none transition-opacity hover:opacity-70 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {content}
      <span className="sr-only">{client.name} (opens in a new tab)</span>
    </a>
  );
}

export function ClientLogosSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-6', className)}
      role="status"
      aria-label="Loading clients"
    >
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

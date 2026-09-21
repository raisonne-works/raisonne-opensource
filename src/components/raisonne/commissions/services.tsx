import { CheckIcon } from 'lucide-react';

import { CardHeading } from '@/components/raisonne/shell/card-heading';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { nextHeadingLevel } from '@/components/raisonne/shell/heading';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ArtistLink, Service } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CommissionsCta } from './hero';

/**
 * What the studio takes on, one card per kind of work: what it is, and what
 * is included. Each card offers the same enquiry action, with the service's
 * name in the subject line so the artist knows what the message is about.
 */
export function Services({
  services,
  cta,
  headingLevel = 2,
  className,
}: {
  services: Service[];
  /** The page's own call to action, reused per card. */
  cta?: ArtistLink | null;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (services.length === 0) return null;
  const cardLevel = nextHeadingLevel(headingLevel);

  return (
    <ul className={cn('grid gap-6 md:grid-cols-2 xl:grid-cols-3', className)}>
      {services.map(service => (
        <li key={service.title} className="flex">
          <Card className="flex w-full flex-col">
            <CardHeader>
              <CardHeading level={cardLevel}>{service.title}</CardHeading>
              {service.description ? <CardDescription>{service.description}</CardDescription> : null}
            </CardHeader>
            {service.items.length > 0 ? (
              <CardContent className="flex-1">
                <ul className="flex flex-col gap-2">
                  {service.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="text-pretty">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            ) : null}
            {cta ? (
              <CardFooter>
                <CommissionsCta
                  cta={cta}
                  variant="outline"
                  size="sm"
                  label="Enquire"
                  subject={`Commission enquiry: ${service.title}`}
                />
              </CardFooter>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function ServicesSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-6 md:grid-cols-2 xl:grid-cols-3', className)} role="status" aria-label="Loading services">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border p-6">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

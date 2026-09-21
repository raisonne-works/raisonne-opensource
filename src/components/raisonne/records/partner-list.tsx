import { ExternalLink } from '@/components/raisonne/profile/external-link';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import type { Collaboration } from '@/lib/types';
import { cn } from '@/lib/utils';

type Partner = Collaboration['partners'][number];

/**
 * Who else made this: each partner with the part they played, and a link to
 * them when there is one. Credit is a fact of the record, so it is a list
 * with roles rather than a row of logos.
 */
export function PartnerList({
  partners,
  title = 'Partners',
  headingLevel = 2,
  className,
}: {
  partners: Partner[];
  title?: string | null;
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  if (partners.length === 0) return null;
  const Heading = `h${headingLevel}` as const;

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {title ? <Heading className="text-sm font-medium">{title}</Heading> : null}
      <ul className="divide-y divide-border border-y border-border">
        {partners.map(partner => (
          <li key={`${partner.name}-${partner.role ?? ''}`} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
            <span className="font-medium">
              <ExternalLink href={partner.url}>{partner.name}</ExternalLink>
            </span>
            {partner.role ? <span className="text-sm text-muted-foreground">{partner.role}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

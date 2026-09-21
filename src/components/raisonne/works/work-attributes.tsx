import type { ReactNode } from 'react';

import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { RichTextView } from '@/components/raisonne/shell/rich-text';
import { plainTextToRichText } from '@/lib/markdown';
import type { Series, Work } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ChainBadge } from './chain-badge';
import { type FactItem, FactTable } from './fact-list';
import {
  MEDIA_KIND_LABELS,
  STANDARD_LABELS,
  addressExplorerUrl,
  contractExplorerUrl,
  editionLabel,
  formatBytes,
  formatDate,
  formatDimensions,
  formatMediaType,
  hostOf,
  seriesTitle,
  shortAddress,
} from './lib';

/**
 * Everything the catalogue records about one work: what it says it is, the
 * traits the token carries, the file behind it and the facts on the chain.
 *
 * Rows with nothing recorded are left out, because a catalogue lists what it
 * knows. The current holder is shown only when the artist has switched owners
 * on (SiteSettings.showOwners); collectors' names are private by default.
 */
export function WorkAttributes({
  work,
  series,
  showOwner = false,
  headingLevel = 3,
  className,
}: {
  work: Work;
  series: Series | null;
  /** SiteSettings.showOwners. */
  showOwner?: boolean;
  /** The level of the headings inside the panel ("Traits", "On-chain"). */
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const traits = work.traits ?? [];
  const description = plainTextToRichText(work.description);
  const contractUrl = contractExplorerUrl(work.chain, work.contract);
  const minted = formatDate(work.mintedAt);
  const editions = editionLabel(work);
  const format = formatMediaType(work.file?.format);
  const bytes = formatBytes(work.file?.bytes);
  const dimensions = formatDimensions(work.media);

  const file: FactItem[] = [
    { label: 'Kind', value: MEDIA_KIND_LABELS[work.media.kind] },
    ...(format ? [{ label: 'Format', value: format }] : []),
    ...(dimensions ? [{ label: 'Dimensions', value: dimensions, mono: true }] : []),
    ...(bytes ? [{ label: 'File size', value: bytes, mono: true }] : []),
  ];

  // The name the token itself carries, when the page is printing a shorter one.
  const tokenName = work.displayTitle?.trim() && work.displayTitle.trim() !== work.title ? work.title : null;

  const chain: FactItem[] = [
    ...(tokenName ? [{ label: 'Token name', value: tokenName, wrap: true }] : []),
    { label: 'Chain', value: <ChainBadge chain={work.chain} /> },
    {
      label: work.chain === 'bitcoin' ? 'Inscription ID' : 'Contract',
      value: work.chain === 'bitcoin' ? work.contract : shortAddress(work.contract),
      mono: true,
      wrap: work.chain === 'bitcoin',
      copy: work.contract,
      href: work.chain === 'bitcoin' ? work.explorerUrl : contractUrl,
    },
    { label: 'Token ID', value: work.tokenId, mono: true, wrap: true, copy: work.tokenId.length > 8 ? work.tokenId : null },
    ...(work.inscription ? [{ label: 'Inscription number', value: work.inscription, mono: true }] : []),
    { label: 'Standard', value: STANDARD_LABELS[work.standard] },
    ...(minted && work.mintedAt ? [{ label: 'Minted', value: minted, mono: true }] : []),
    ...(editions === 'Not recorded' ? [] : [{ label: 'Editions', value: editions }]),
    ...(series ? [{ label: 'Series', value: seriesTitle(series), href: `/works/${encodeURIComponent(series.slug)}` }] : []),
    // Bitcoin works link to the inscription itself in the row above.
    ...(work.chain === 'bitcoin' ? [] : [{ label: 'Explorer', value: hostOf(work.explorerUrl), href: work.explorerUrl }]),
    ...(showOwner && work.owner
      ? [
          {
            label: 'Owner',
            value: work.owner.name ?? shortAddress(work.owner.address),
            mono: !work.owner.name,
            href: addressExplorerUrl(work.chain, work.owner.address),
          },
        ]
      : []),
  ];

  return (
    <div data-slot="work-attributes" className={cn('flex flex-col gap-8', className)}>
      {description.length > 0 ? (
        <AttributeSection title="Description" headingLevel={headingLevel}>
          {/* A token's own text, with its markdown resolved rather than printed. */}
          <RichTextView value={description} className="whitespace-pre-line" />
        </AttributeSection>
      ) : null}

      {traits.length > 0 ? (
        <AttributeSection title="Traits" headingLevel={headingLevel}>
          <ul className="grid grid-cols-2 gap-2">
            {traits.map(trait => (
              <li key={`${trait.name}:${trait.value}`} className="flex min-w-0 flex-col gap-0.5 rounded-lg border px-3 py-2">
                <span className="truncate text-xs text-muted-foreground" title={trait.name}>
                  {trait.name}
                </span>
                <span className="text-sm font-medium text-pretty break-words">{trait.value}</span>
              </li>
            ))}
          </ul>
        </AttributeSection>
      ) : null}

      <AttributeSection title="The file" headingLevel={headingLevel}>
        <FactTable facts={file} />
      </AttributeSection>

      <AttributeSection title="On-chain" headingLevel={headingLevel}>
        <FactTable facts={chain} />
      </AttributeSection>
    </div>
  );
}

function AttributeSection({
  title,
  headingLevel,
  children,
}: {
  title: string;
  headingLevel: HeadingLevel;
  children: ReactNode;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section className="flex flex-col gap-3">
      <Heading className="text-sm font-medium">{title}</Heading>
      {children}
    </section>
  );
}

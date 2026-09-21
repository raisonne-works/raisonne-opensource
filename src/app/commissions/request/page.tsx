import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, MailIcon } from 'lucide-react';

import {
  CommissionRequestForm,
  type HoldingOption,
} from '@/components/raisonne/commission-request/request-form';
import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { shortTokenId, workTitle } from '@/components/raisonne/works/lib';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getArtist, getCommissions, getSettings, getStore, getWorkById } from '@/fixtures';
import { getSession } from '@/lib/auth/guards';
import { getHoldings } from '@/lib/chain/holdings';
import { isModuleEnabled } from '@/lib/records';
import { NO_INDEX, pageMetadata } from '@/lib/seo/metadata';
import type { CommissionKind } from '@/lib/types';

/**
 * Asking the studio for a commission.
 *
 * The questions are the artist's own: the kinds of thing they take on and
 * what they need to know come from this install's data, not from this file,
 * so a sculptor and a generative artist get different forms without either
 * of them editing code.
 *
 * Signed in, and this install can read the chain, a physical commission also
 * offers the works the visitor actually holds. Neither is required: somebody
 * who is not signed in describes the work in the brief instead, and the page
 * says so rather than showing an empty list.
 *
 * The module gate lives in the commissions layout above, so an install that
 * does not take commissions has no /commissions at all, let alone this.
 */

export function generateMetadata(): Metadata {
  if (!isModuleEnabled(getSettings(), 'commissions')) return { title: 'Not found', robots: NO_INDEX };
  return pageMetadata('commissions-request', {
    title: 'Start a commission',
    description: `Send ${getArtist().name} a brief. Nothing is charged and nothing is agreed by sending one.`,
    path: '/commissions/request',
  });
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** ?kind=phygital, so a link from a product page starts on the right one. */
function startKind(value: string | string[] | undefined): CommissionKind | null {
  const kind = Array.isArray(value) ? value[0] : value;
  return kind === 'digital' || kind === 'phygital' ? kind : null;
}

export default async function CommissionRequestPage({ searchParams }: { searchParams: SearchParams }) {
  if (!isModuleEnabled(getSettings(), 'commissions')) notFound();

  const store = getStore();
  const form = store?.commissionForm ?? null;
  const artist = getArtist();

  // An install with the module on but no form has nothing to ask. Rather
  // than an empty page, it offers the one thing that always works.
  if (!form || form.kinds.length === 0) {
    const email = artist.email?.trim();
    return (
      <Container size="text" className="pb-16 md:pb-24">
        <PageHeader title="Start a commission" />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MailIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>This studio takes commissions by email</EmptyTitle>
            <EmptyDescription>
              No commission form has been set up on this install. Write and say what you have in mind.
            </EmptyDescription>
          </EmptyHeader>
          {email ? (
            <EmptyContent>
              <Button nativeButton={false} render={<a href={`mailto:${email}`} />}>
                Write to the studio
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      </Container>
    );
  }

  const params = await searchParams;
  const session = await getSession();
  const { holdings, note } = await collectorWorks(session?.address ?? null);
  const page = getCommissions();

  return (
    <Container size="editorial" className="pb-16 md:pb-24">
      <PageHeader
        title="Start a commission"
        description={
          page?.description ??
          'Tell the studio what you have in mind. Nothing is charged and nothing is agreed by sending a brief.'
        }
        actions={
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/commissions" />}>
            <ArrowLeftIcon aria-hidden data-icon="inline-start" />
            What the studio takes on
          </Button>
        }
      />
      <CommissionRequestForm
        form={form}
        currency={store?.currency ?? 'USD'}
        holdings={holdings}
        holdingsNote={note}
        signedIn={session !== null}
        startKind={startKind(params.kind)}
      />
    </Container>
  );
}

/**
 * The works this visitor holds, for a physical object made from one.
 *
 * Every branch that cannot produce a list says why in a sentence the visitor
 * can act on. None of them invents a work.
 */
async function collectorWorks(address: string | null): Promise<{ holdings: HoldingOption[]; note: string | null }> {
  if (!address) {
    return {
      holdings: [],
      note: 'Sign in with the wallet that holds the work and it will be listed here. Otherwise name it in the brief.',
    };
  }

  // No ALCHEMY_API_KEY is not the same as no way to read a wallet.
  // getHoldings() falls back to this install's chain snapshot, which is what
  // /collector/<address> reads to list the same works, so gating this picker
  // on the key told the visitor the install could not do something it was
  // doing one page away. The only branch that deserves that sentence is the
  // one where the read itself reports it had no source, below.
  const result = await getHoldings(address);

  if (result.error) {
    return {
      holdings: [],
      note: 'Your holdings could not be read just now. Name the work in the brief and the studio will find it.',
    };
  }

  if (result.source === 'none') {
    return {
      holdings: [],
      note: 'This install cannot read wallets yet, so there is no list to pick from. Name the work in the brief.',
    };
  }

  if (result.holdings.length === 0) {
    return {
      holdings: [],
      note: 'Nothing from this catalogue was found in that wallet. Name the work in the brief if it is held elsewhere.',
    };
  }

  return {
    holdings: result.holdings.map(holding => {
      const work = getWorkById(holding.workId);
      return {
        workId: holding.workId,
        title: work ? workTitle(work) : `Token ${shortTokenId(holding.tokenId)}`,
      };
    }),
    note: null,
  };
}

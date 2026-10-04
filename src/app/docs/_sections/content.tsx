import type { ReactNode } from 'react';
import Link from 'next/link';

import { Section } from '@/components/raisonne/shell/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Callout,
  CodeBlock,
  EnvTable,
  FeatureTable,
  InlineLink,
  Prose,
  ProseList,
  Steps,
} from '../_components/docs-prose';

const SUB = 'py-6 md:py-8';

function Topic({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Section id={id} title={title} description={description} headingLevel={3} className={SUB}>
      <div className="flex flex-col gap-4">{children}</div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Start here                                                                 */
/* -------------------------------------------------------------------------- */

export const START_TOPICS = [
  { id: 'start-what', label: 'What it is' },
  { id: 'start-run', label: 'Run it' },
  { id: 'start-paths', label: 'Two paths' },
  { id: 'start-tutorial', label: 'Video tutorial' },
] as const;

export function StartSection() {
  return (
    <>
      <Topic
        id="start-what"
        title="What Raisonne is"
        description="A self-hosted catalogue raisonne for one artist who works on-chain. Not multi-tenant SaaS. Not a marketplace."
      >
        <Prose>
          <p>
            One install equals one artist. The site shows every series and work with the on-chain record behind it, and
            keeps the CV, exhibitions, press and the rest of the practice around the work.
          </p>
          <p>
            Catalogue data is files under <code>src/fixtures</code>, not a required database. Wallet sign-in, collectors,
            insights and a shop are optional modules — off until you configure them. When something is missing, pages
            name the variable. They do not invent a number or fail quietly.
          </p>
        </Prose>
        <ProseList
          items={[
            <>Public product: <InlineLink href="https://github.com/orkhan-art-web/raisonne-os">orkhan-art-web/raisonne-os</InlineLink> (MIT).</>,
            <>Fresh clone shows a fictional Demo Artist with public-domain images. The footer says “Demo data”.</>,
            <>Your own records live in gitignored <code>src/fixtures/local/</code> and never ship in the public repo.</>,
          ]}
        />
      </Topic>

      <Topic id="start-run" title="Run it">
        <CodeBlock title="First run">{`git clone https://github.com/orkhan-art-web/raisonne-os.git
cd raisonne-os
pnpm install
cp .env.example .env.local   # optional
pnpm dev                     # http://localhost:3000`}</CodeBlock>
        <Prose>
          <p>
            Needs Node 20+ and pnpm. Production-shaped: <code>pnpm build && pnpm start</code>. Checks:{' '}
            <code>pnpm exec tsc --noEmit</code> and <code>pnpm lint</code>.
          </p>
        </Prose>
      </Topic>

      <Topic
        id="start-paths"
        title="Two paths into a real catalogue"
        description="v0.1 has no full studio CMS UI. You fill fixtures from a snapshot, from chain reads, or by editing JSON."
      >
        <FeatureTable
          columns={['Path', 'Command', 'Writes']}
          rows={[
            {
              name: 'From an existing site',
              where: <code>pnpm snapshot</code>,
              note: (
                <>
                  <code>local/site.json</code> (+ guild/store when present)
                </>
              ),
            },
            {
              name: 'From the chain',
              where: <code>pnpm snapshot:chain</code>,
              note: (
                <>
                  <code>local/chain.json</code> holders, events, insights
                </>
              ),
            },
            {
              name: 'Import tool (replay)',
              where: (
                <Link href="/import" className="underline-offset-4 hover:underline">
                  /import
                </Link>
              ),
              note: 'UI flow; live importer still shipping',
            },
            {
              name: 'Hand edit',
              where: 'JSON under fixtures',
              note: 'Shapes in src/lib/types.ts',
            },
          ]}
        />
        <Callout title="Honesty rule">
          Edition size unknown → label “Edition not recorded”, never invent “Unique”. A truncated chain history is marked{' '}
          <code>truncated</code>. Marketplace sales without a readable price count as transfers, not sales at zero.
        </Callout>
      </Topic>

      <Topic
        id="start-tutorial"
        title="Video tutorial"
        description="Fifteen chapters: domain, server, code, import, keys, going live. Watch as a playlist."
      >
        <Prose>
          <p>
            A full walkthrough of standing up your own Raisonne. Each chapter is its own clip so you can skip to the
            step you need. Draft voice for now; the picture is the real screens and terminal frames.
          </p>
        </Prose>
        <Button variant="outline" nativeButton={false} render={<Link href="/docs/tutorial" />}>
          Open the tutorial playlist
        </Button>
      </Topic>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Browse                                                                     */
/* -------------------------------------------------------------------------- */

export const BROWSE_TOPICS = [
  { id: 'browse-nav', label: 'Navigation' },
  { id: 'browse-home', label: 'Home' },
  { id: 'browse-pages', label: 'Public pages' },
] as const;

export function BrowseSection() {
  return (
    <>
      <Topic
        id="browse-nav"
        title="How visitors move"
        description="The header builds itself from this install’s data. A module that is off, or a section with nothing in it, never appears."
      >
        <Prose>
          <p>
            Groups: <strong>Catalogue</strong> (works, installations, physical works, exhibitions, collaborations,
            awards, writings), <strong>Artist</strong> (about, CV, press), and <strong>More</strong> (commissions,
            insights, shop) when those modules have something to show.
          </p>
          <p>
            The same links sit in the footer. On long index pages the footer hides behind a bottom bar so a grid is not
            interrupted. The CV has no site footer — it is a document meant to print cleanly.
          </p>
        </Prose>
        <ProseList
          items={[
            <>Theme toggle lives in the header. Light and dark follow the system until someone chooses.</>,
            <>Account menu appears when sign-in is configured. Collectors and the owner see different links.</>,
            <>Breadcrumbs name each segment; wallet addresses shorten so a trail never overflows a phone.</>,
          ]}
        />
      </Topic>

      <Topic id="browse-home" title="Home">
        <Prose>
          <p>
            Landing blocks are optional in the data: hero, showreel, stats, featured work, catalogue strip, partners,
            news, newsletter. Empty blocks are simply omitted — a fresh install is not forced to fill every slot.
          </p>
        </Prose>
      </Topic>

      <Topic id="browse-pages" title="Public page map">
        <FeatureTable
          rows={[
            { name: 'Home', where: <code>/</code>, note: 'Artist, featured series, selected press' },
            { name: 'Works index', where: <code>/works</code>, note: 'Series and one-of-ones; filter by chain and kind' },
            { name: 'Series', where: <code>/works/[series]</code>, note: 'Record, attribution, works grid' },
            { name: 'Series about', where: <code>/works/[series]/about</code>, note: 'Long-form series essay' },
            { name: 'Work', where: <code>/works/[series]/[token]</code>, note: 'Media, facts, provenance' },
            { name: 'About', where: <code>/about</code>, note: 'Bio, studio, minting addresses' },
            { name: 'CV', where: <code>/cv</code>, note: 'Print-ready full record' },
            { name: 'Exhibitions / awards / press / writings', where: 'Matching routes', note: 'Only if data exists' },
            { name: 'Installations / physical works / collaborations', where: 'Matching routes', note: 'Non-token records' },
            {
              name: 'Privacy / terms',
              where: (
                <>
                  <code>/privacy</code>, <code>/terms</code>
                </>
              ),
              note: 'From settings.legal; empty text stays out of nav',
            },
          ]}
        />
      </Topic>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Series & works                                                             */
/* -------------------------------------------------------------------------- */

export const SERIES_TOPICS = [
  { id: 'series-what', label: 'What a series is' },
  { id: 'series-page', label: 'Series page' },
  { id: 'series-work', label: 'A single work' },
  { id: 'series-evidence', label: 'Evidence' },
] as const;

export function SeriesSection() {
  return (
    <>
      <Topic
        id="series-what"
        title="Series"
        description="A series is the catalogue’s main container: a contract or a body of related works with one slug, one cover, and a shared story."
      >
        <Prose>
          <p>
            Three kinds in the type system: <code>series</code> (a contract the artist deployed), <code>one-of-one</code>{' '}
            (a single-work contract), and <code>shared-platform</code> (the artist’s tokens on a marketplace contract
            many people use). Filters on <InlineLink href="/works">/works</InlineLink> use chain and kind from that
            data.
          </p>
          <p>
            A series can be <strong>hidden</strong>: it stays out of the public index, sitemap and catalogue API while
            remaining in the fixture for the artist. Sub-series nest under a parent via <code>parentSlug</code> when the
            record says so — the parent page lists children first.
          </p>
        </Prose>
        <ProseList
          items={[
            <>Slug is the URL: <code>/works/paste-grounds</code>.</>,
            <>Contract may be null (for example Ordinals); chain is still required.</>,
            <>Optional fields: edition size, standard, platform, marketplace URL, categories, co-authored flag — blank is allowed.</>,
            <>displayTitle can print a human name while name keeps the on-chain machine title for facts and search.</>,
          ]}
        />
      </Topic>

      <Topic id="series-page" title="Reading a series page">
        <Steps
          steps={[
            {
              title: 'Open the series',
              body: (
                <>
                  From <InlineLink href="/works">Works</InlineLink> or a featured card on the home page. One-of-one
                  series may open straight on the work.
                </>
              ),
            },
            {
              title: 'Read the record',
              body: 'Hero, title, year, chain badge, short description, and the specs table (contract, standard, size).',
            },
            {
              title: 'Check attribution',
              body: 'Evidence badges explain why this series is attributed to the artist’s wallets (deployer, owner, mint patterns, and so on).',
            },
            {
              title: 'Browse works',
              body: (
                <>
                  Grid or wall of tokens. Open one for full media and provenance. Long-form essay lives at{' '}
                  <code>/works/[series]/about</code> when the data has one.
                </>
              ),
            },
          ]}
        />
      </Topic>

      <Topic id="series-work" title="A single work">
        <Prose>
          <p>
            Identity is <code>chain:contract:tokenId</code> in the catalogue API; the human URL is series slug plus a
            token segment. Media can be still, video, or interactive HTML — live HTML is off by default in settings and
            sandboxed when on.
          </p>
          <p>
            Traits, categories, file facts and marketplace links come from the fixture. Holder names on the work page
            stay off unless <code>settings.showOwners</code> is on — collectors’ privacy is the default. A work can be
            featured, one-of-one, or hidden the same way a series can.
          </p>
        </Prose>
        <Callout title="Edition labels">
          When <code>editionSize</code> is null the UI says “Edition not recorded”. It never invents “Unique”.
        </Callout>
      </Topic>

      <Topic id="series-evidence" title="On-chain evidence">
        <Prose>
          <p>
            Raisonne does not ask visitors to trust a spreadsheet. Series pages and import review show the signals that
            tied a contract to the artist:
          </p>
        </Prose>
        <ProseList
          items={[
            <><code>deployer</code> — wallet deployed the contract</>,
            <><code>ownership-log</code> — wallet appeared as owner in logs (including factory deploys)</>,
            <><code>owner</code> — current <code>owner()</code> match</>,
            <><code>token-creator</code> — creator pattern on the token</>,
            <><code>storefront-decode</code> — marketplace storefront decoding</>,
            <><code>minted-to</code> — mint destination evidence</>,
          ]}
        />
        <Prose>
          <p>
            During import, contracts that look unrelated are labelled clearly (including “probably not yours”) so the
            artist can leave them out of the catalogue with the reason still in view.
          </p>
        </Prose>
      </Topic>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Import                                                                     */
/* -------------------------------------------------------------------------- */

export const IMPORT_TOPICS = [
  { id: 'import-enable', label: 'Turn it on' },
  { id: 'import-flow', label: 'The flow' },
  { id: 'import-passes', label: 'Six passes' },
  { id: 'import-series', label: 'Choosing series' },
  { id: 'import-limits', label: 'v0.1 limits' },
] as const;

export function ImportSection() {
  return (
    <>
      <Topic
        id="import-enable"
        title="Turn the importer on"
        description="/import is an artist tool. It is not part of the public catalogue."
      >
        <Prose>
          <p>
            In development the workbench tools are on. In production set <code>RAISONNE_TOOLS=1</code> for both build and start
            to serve <code>/import</code> (and the design system). Routes that are off answer 404. Setting this on a public host
            publishes the workbench URLs to anyone who types them — switch it off when the work is done. The public docs at{' '}
            <code>/docs</code> do not need this flag.
          </p>
          <p>
            Only an <strong>owner</strong> session can open the importer. Configure{' '}
            <code>RAISONNE_OWNER_ADDRESSES</code> and <code>RAISONNE_SESSION_SECRET</code>, then sign in from the account
            menu. Everyone else sees a lock screen that says so. Docs and design-system share the tools flag but do not
            require an owner session.
          </p>
        </Prose>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/import" />}>
            Open Import
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/auth?next=/import&reason=owner" />}>
            Sign in as owner
          </Button>
        </div>
      </Topic>

      <Topic id="import-flow" title="How import works">
        <Steps
          steps={[
            {
              title: 'Paste wallets',
              body: (
                <>
                  Addresses you minted from — up to ten. Comma, space or newline separated. Invalid tokens are named
                  after first blur and again on submit; ENS names get their own hint (resolve them to 0x first). Pick
                  chains to scan. ⌘/Ctrl+Enter submits. While a run is active the same control becomes Stop and fields
                  lock.
                </>
              ),
            },
            {
              title: 'Watch the passes',
              body: (
                <>
                  A progress table lists six discovery passes per chain with live timers, counts and the importer’s
                  notes. Failures land in a destructive alert; a deliberate stop gets a plain one. Focus stays on the
                  control you used.
                </>
              ),
            },
            {
              title: 'Review series',
              body: (
                <>
                  Every candidate series with on-chain evidence and a switch. Confirmed series start <strong>on</strong>;
                  co-authored series and anything that only looks like yours start <strong>off</strong> under “Probably
                  not yours”, each with a reason. You can leave every series off — nothing is saved until you accept.
                  Reset clears your overrides.
                </>
              ),
            },
            {
              title: 'Preview works and summary',
              body: 'Stills and counts for what you accepted. The summary closes the run with totals and timing.',
            },
          ]}
        />
      </Topic>

      <Topic
        id="import-passes"
        title="What each pass looks for"
        description="Ethereum runs all six. Base currently covers held contracts, owner() and works — deploy and ownership-log scans are not available there yet."
      >
        <FeatureTable
          columns={['Pass', 'Looks for', 'Why']}
          rows={[
            {
              name: 'Deployed contracts',
              where: 'Contracts a wallet deployed itself',
              note: 'Strongest ownership signal',
            },
            {
              name: 'Ownership logs',
              where: 'Contracts that ever made a wallet their owner',
              note: 'Catches factory deploys',
            },
            {
              name: 'Held contracts',
              where: 'Contracts a wallet holds tokens in',
              note: 'Plus who deployed them',
            },
            {
              name: 'Owner check',
              where: 'owner() on every candidate today',
              note: 'Current on-chain owner',
            },
            {
              name: 'Shared-contract mints',
              where: 'Works created on marketplace shared contracts',
              note: 'Many artists, one contract',
            },
            {
              name: 'Works and media',
              where: 'Tokens and stills for every series found',
              note: 'Feeds the preview step',
            },
          ]}
        />
      </Topic>

      <Topic id="import-series" title="Importing series into the catalogue">
        <Prose>
          <p>
            Series review is the decision surface. Evidence badges (deployer, ownership log, owner, token-creator,
            storefront decode, minted-to) explain each attribution. Contracts that are not yours stay visible so you
            can reject them with context, not hide them.
          </p>
          <p>
            Today the page <strong>replays a recorded run</strong> (demo{' '}
            <code>demo-import.ndjson</code> or your <code>local/import-events.ndjson</code>) at original timing through{' '}
            <code>/import/replay</code>, so the UI matches a live stream. The reducer and components do not change when
            a live source is wired in — only the event feed does.
          </p>
        </Prose>
        <Callout title="Prefer snapshot for a full site today">
          If you already publish a site with a public catalogue proxy, <code>RAISONNE_CMS_URL=… pnpm snapshot</code>{' '}
          fills <code>local/site.json</code> without waiting on the live importer. Chain facts still come from{' '}
          <code>pnpm snapshot:chain</code>. Snapshot never overwrites chain, contract, token id or attribution evidence
          the importer owns.
        </Callout>
      </Topic>

      <Topic id="import-limits" title="What v0.1 will not pretend">
        <ProseList
          items={[
            <>No full owner studio UI for editing every field in the browser — edit JSON or re-run snapshot.</>,
            <>Live multi-chain import stream is not the default yet; the UI is the real product surface over a replay.</>,
            <>Import never copies collectors, orders, customers, commissions or provider keys from a CMS.</>,
            <>Chains beyond Ethereum and Base are not in this import flow yet (Tezos, Bitcoin, Solana can still live in fixtures).</>,
            <>Do not leave RAISONNE_TOOLS=1 on a public host longer than you need the workbench.</>,
          ]}
        />
      </Topic>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

export const DATA_TOPICS = [
  { id: 'data-files', label: 'Fixture files' },
  { id: 'data-commands', label: 'Commands' },
  { id: 'data-images', label: 'Images' },
] as const;

export function DataSection() {
  return (
    <>
      <Topic id="data-files" title="Where the catalogue lives">
        <FeatureTable
          columns={['File', 'Role', 'Shipped?']}
          rows={[
            { name: <code>demo.json</code>, where: 'Demo Artist for a fresh clone', note: 'Yes' },
            { name: <code>local/site.json</code>, where: 'Your SiteData — replaces demo when present', note: 'Gitignored' },
            { name: <code>local/chain.json</code>, where: 'Holders, events, leaderboard, insights', note: 'Gitignored' },
            { name: <code>local/guild.json</code>, where: 'Tiers and badges', note: 'Gitignored' },
            { name: <code>local/store.json</code>, where: 'Products, variants, shipping', note: 'Gitignored' },
            { name: <code>local/import-events.ndjson</code>, where: 'Recorded import run', note: 'Gitignored' },
            { name: <code>local/snapshot-report.json</code>, where: 'What snapshot skipped and why', note: 'Gitignored' },
            { name: <code>demo-import.ndjson</code>, where: 'Short demo import replay', note: 'Yes' },
          ]}
        />
        <Prose>
          <p>
            <code>src/fixtures/index.ts</code> is the only reader. Pages call <code>getSiteData()</code>. Components take
            domain types from <code>src/lib/types.ts</code>, never raw CMS shapes. Edit a file and the next request
            reloads it when the mtime changes.
          </p>
        </Prose>
      </Topic>

      <Topic id="data-commands" title="Refresh commands">
        <CodeBlock>{`RAISONNE_CMS_URL=https://x.art pnpm snapshot
pnpm snapshot -- --max-works=200
pnpm snapshot -- --skip=works,press

ALCHEMY_API_KEY=… pnpm snapshot:chain
pnpm snapshot:chain -- --series=paste-grounds
pnpm snapshot:chain -- --max-events=2000
pnpm snapshot:chain -- --dry-run`}</CodeBlock>
      </Topic>

      <Topic id="data-images" title="Images">
        <Prose>
          <p>
            <code>next/image</code> only loads hosts discovered from the fixtures at startup, plus optional{' '}
            <code>RAISONNE_IMAGE_HOSTS</code>. Restart after changing hosts. Public IPFS gateways and marketplace CDNs
            make this install an open image proxy for those hosts — fine on a private install; pin and self-host if that
            matters on yours.
          </p>
        </Prose>
      </Topic>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

export const ACCOUNT_TOPICS = [
  { id: 'account-signin', label: 'Sign in' },
  { id: 'account-collector', label: 'Collectors' },
  { id: 'account-owner', label: 'Owner' },
] as const;

export function AccountSection() {
  return (
    <>
      <Topic id="account-signin" title="Wallet sign-in">
        <Prose>
          <p>
            SIWE (EIP-4361) with viem. No email, no password, no third-party auth service. The server issues a nonce,
            verifies the message, and sets an httpOnly signed cookie. Smart-contract wallets need{' '}
            <code>ALCHEMY_API_KEY</code> for ERC-1271 / ERC-6492; without it only key-pair wallets work, and the page
            says so.
          </p>
        </Prose>
        <EnvTable
          rows={[
            { name: 'RAISONNE_SESSION_SECRET', what: '≥32 characters; signs the cookie', required: true },
            { name: 'RAISONNE_OWNER_ADDRESSES', what: 'Comma-separated owner wallets', required: true },
            { name: 'RAISONNE_SITE_URL', what: 'Public origin; SIWE domain default', required: true },
            { name: 'RAISONNE_SIWE_DOMAIN', what: 'Override SIWE domain', required: false },
            { name: 'RAISONNE_SESSION_TTL_MINUTES', what: 'Default 60, max 1440', required: false },
            { name: 'ALCHEMY_API_KEY', what: 'Holdings + smart-wallet verify', required: false },
          ]}
        />
      </Topic>

      <Topic id="account-collector" title="Collector surfaces">
        <Prose>
          <p>
            A collector is an address. Nothing about a person is stored: no name, no email, no profile database.
            Holdings are read from the chain (cached a few minutes) with a re-sync control. Leaderboard and insights
            come from <code>local/chain.json</code>, never by replaying every transfer on page load.
          </p>
        </Prose>
        <FeatureTable
          rows={[
            { name: 'My collection', where: <code>/collector</code>, note: 'Signed-in holdings, tier, badges' },
            { name: 'Public collector page', where: <code>/collector/[address]</code>, note: 'Only if settings.publicCollectorProfiles' },
            { name: 'Collectors directory', where: <code>/collectors</code>, note: 'Module collectors' },
            { name: 'Leaderboard', where: <code>/leaderboard</code>, note: 'From chain snapshot' },
            { name: 'Guild / tiers', where: <code>/leaderboard/guild</code>, note: 'When guild data exists' },
            { name: 'Orders', where: <code>/orders</code>, note: 'Shop purchases for this wallet/email flow' },
          ]}
        />
      </Topic>

      <Topic id="account-owner" title="Owner-only">
        <ProseList
          items={[
            <>
              <InlineLink href="/update">Update Raisonne</InlineLink> — pull a newer app release without touching
              catalogue data.
            </>,
            <>
              Tools under <code>RAISONNE_TOOLS</code>: <InlineLink href="/docs">Docs</InlineLink>,{' '}
              <InlineLink href="/import">Import</InlineLink>,{' '}
              <InlineLink href="/design-system">Design system</InlineLink>.
            </>,
            <>Footer “For the artist” links render only for an owner session.</>,
            <>Setup variable names come from /api/setup for owner/dev — not embedded in public HTML.</>,
          ]}
        />
      </Topic>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Insights & shop & more                                                     */
/* -------------------------------------------------------------------------- */

export const MORE_TOPICS = [
  { id: 'more-insights', label: 'Insights' },
  { id: 'more-shop', label: 'Shop' },
  { id: 'more-commissions', label: 'Commissions & drops' },
  { id: 'more-modules', label: 'Modules' },
] as const;

export function MoreSection() {
  return (
    <>
      <Topic id="more-insights" title="Insights">
        <Prose>
          <p>
            Module <code>insights</code>. Pages under <InlineLink href="/insights">/insights</InlineLink> summarise
            what the chain snapshot says about the work: activity, collections, sales stats when prices are known, and{' '}
            <strong>gaps</strong> when history was truncated or a sale price could not be read. Missing Alchemy or
            snapshot → designed panel with the command to run, not a blank chart.
          </p>
        </Prose>
      </Topic>

      <Topic id="more-shop" title="Shop, cart, checkout">
        <Prose>
          <p>
            Module <code>store</code>. Cart in local storage holds slugs, variant ids and quantities only. Every price
            a visitor sees and every amount Stripe charges is computed on the server from fixtures. Orders default to
            JSON files under <code>.data/orders</code> (persist across deploys). Print-on-demand provider dispatch is a
            stub in this release — flow and pages exist; the provider call does not.
          </p>
        </Prose>
        <FeatureTable
          rows={[
            { name: 'Shop', where: <code>/shop</code> },
            { name: 'Product', where: <code>/shop/product/[slug]</code> },
            { name: 'Collection / category', where: <code>/shop/collection/…</code>, note: <code>/shop/[category]</code> },
            { name: 'Cart', where: <code>/cart</code> },
            { name: 'Checkout', where: <code>/checkout</code> },
            { name: 'Orders', where: <code>/orders</code> },
          ]}
        />
      </Topic>

      <Topic id="more-commissions" title="Commissions and drops">
        <Prose>
          <p>
            Commissions module exposes <InlineLink href="/commissions">/commissions</InlineLink> and a request form when
            configured. Drops announce releases with phases, countdown, notify dialog and calendar — data-driven from
            the fixture, linked from series when <code>seriesSlug</code> is set.
          </p>
        </Prose>
      </Topic>

      <Topic id="more-modules" title="Module switches">
        <Prose>
          <p>
            In <code>settings.modules</code> inside the site data. Off modules drop out of nav, sitemap and the
            catalogue API. Known ids:
          </p>
        </Prose>
        <div className="flex max-w-[48rem] flex-wrap gap-2">
          {[
            'showreel',
            'ticker',
            'partners',
            'news',
            'newsletter',
            'drops',
            'commissions',
            'writings',
            'immersive-rooms',
            'collectors',
            'insights',
            'store',
          ].map(id => (
            <Badge key={id} variant="outline" className="font-mono text-xs">
              {id}
            </Badge>
          ))}
        </div>
        <Prose>
          <p className="mt-2">
            Related settings (not modules): <code>liveHtml</code>, <code>showOwners</code>,{' '}
            <code>publicCollectorProfiles</code>, <code>analytics</code>, <code>maintenance</code>,{' '}
            <code>allowAiCrawlers</code>, <code>redirects</code>, <code>legal</code>.
          </p>
        </Prose>
      </Topic>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* A–Z                                                                        */
/* -------------------------------------------------------------------------- */

export const AZ_TOPICS = [
  { id: 'az-features', label: 'Features A–Z' },
  { id: 'az-env', label: 'Environment A–Z' },
  { id: 'az-api', label: 'Catalogue API' },
  { id: 'az-update', label: 'Update & deploy' },
] as const;

export function AzSection() {
  return (
    <>
      <Topic
        id="az-features"
        title="Features A–Z"
        description="Every public or owner surface this install can expose. Empty data or a switched-off module hides the nav entry."
      >
        <FeatureTable
          columns={['Name', 'Route / entry', 'Notes']}
          rows={[
            { name: 'About', where: <code>/about</code>, note: 'Artist, studio, minting addresses' },
            { name: 'Activity (insights)', where: <code>/insights/activity</code>, note: 'Module insights' },
            { name: 'Awards', where: <code>/awards</code>, note: 'List + detail' },
            { name: 'Cart', where: <code>/cart</code>, note: 'Module store' },
            { name: 'Checkout', where: <code>/checkout</code>, note: 'Stripe server prices' },
            { name: 'Checkout complete', where: <code>/checkout/complete</code>, note: 'Post-Stripe return' },
            { name: 'Collaborations', where: <code>/collaborations</code> },
            { name: 'Collector (mine)', where: <code>/collector</code>, note: 'Signed in' },
            { name: 'Collector (public)', where: <code>/collector/[address]</code>, note: 'Opt-in setting' },
            { name: 'Collectors directory', where: <code>/collectors</code> },
            { name: 'Commissions', where: <code>/commissions</code>, note: '+ /commissions/request' },
            { name: 'CV', where: <code>/cv</code>, note: 'Print; footer off' },
            { name: 'Design system', where: <code>/design-system</code>, note: 'Artist tool' },
            { name: 'Docs', where: <code>/docs</code>, note: 'This page; artist tool' },
            { name: 'Drops', where: <code>/drops/[slug]</code>, note: 'Module drops' },
            { name: 'Exhibitions', where: <code>/exhibitions</code>, note: '+ /[slug]' },
            { name: 'Guild / tiers', where: <code>/leaderboard/guild</code> },
            { name: 'Home', where: <code>/</code> },
            { name: 'Import', where: <code>/import</code>, note: 'Owner-gated tool; wallet → series' },
            { name: 'Import replay feed', where: <code>/import/replay</code>, note: 'NDJSON event stream' },
            { name: 'Insights', where: <code>/insights</code>, note: '+ /activity, /collections' },
            { name: 'Immersive', where: <code>/immersive</code>, note: 'Installations and immersive experiences together; + /[slug]' },
            { name: 'Leaderboard', where: <code>/leaderboard</code> },
            { name: 'Legal', where: <code>/privacy</code>, note: <code>/terms</code> },
            { name: 'Maintenance', where: <code>/maintenance</code>, note: 'Whole-site gate' },
            { name: 'Newsletter API', where: <code>POST /api/newsletter</code>, note: 'Needs forward URL' },
            { name: 'Order detail', where: <code>/orders/[id]</code>, note: 'Buyer session' },
            { name: 'Orders', where: <code>/orders</code> },
            { name: 'Physical works', where: <code>/physical-works</code>, note: '+ /[slug]' },
            { name: 'Press', where: <code>/press</code>, note: '+ /[slug]' },
            { name: 'Series', where: <code>/works/[series]</code>, note: '+ /about' },
            { name: 'Shop', where: <code>/shop</code>, note: 'product, collection, category' },
            {
              name: 'Sign in / out',
              where: <code>/auth</code>,
              note: (
                <>
                  <code>/signout</code>; <code>/signin</code> redirects
                </>
              ),
            },
            { name: 'Update app', where: <code>/update</code>, note: 'Owner; code not data' },
            { name: 'Work detail', where: <code>/works/[series]/[token]</code> },
            { name: 'Works index', where: <code>/works</code> },
            { name: 'Writings', where: <code>/writings</code>, note: 'Module writings; + /[slug]' },
          ]}
        />
      </Topic>

      <Topic id="az-env" title="Environment variables">
        <Prose>
          <p>
            Full list lives in <code>.env.example</code>. Nothing is required for the bare catalogue. Copy to{' '}
            <code>.env.local</code> (gitignored). Never put secrets in fixtures.
          </p>
        </Prose>
        <EnvTable
          rows={[
            { name: 'RAISONNE_SITE_URL', what: 'Canonical origin, sitemap, share cards, SIWE default host', required: true },
            { name: 'RAISONNE_SESSION_SECRET', what: 'Sign-in cookie signing (≥32 chars)', required: true },
            { name: 'RAISONNE_OWNER_ADDRESSES', what: 'Owner wallets for artist tools', required: true },
            { name: 'ALCHEMY_API_KEY', what: 'Chain reads and smart-wallet sign-in', required: false },
            { name: 'RAISONNE_TOOLS', what: '1 serves /import and /design-system in production (/docs is always public)', required: false },
            { name: 'RAISONNE_FIXTURES', what: 'demo forces demo artist even with local data', required: false },
            { name: 'RAISONNE_IMAGE_HOSTS', what: 'Extra next/image hosts', required: false },
            { name: 'RAISONNE_CMS_URL', what: 'Source for pnpm snapshot', required: false },
            { name: 'RAISONNE_NEWSLETTER_URL', what: 'Forward newsletter POSTs', required: false },
            { name: 'RAISONNE_MAINTENANCE', what: '1 closes the site regardless of data', required: false },
            { name: 'RAISONNE_TRUSTED_PROXY', what: 'Trust X-Forwarded-For from your proxy', required: false },
            { name: 'STRIPE_SECRET_KEY', what: 'Checkout (test keys exercised)', required: false },
            { name: 'STRIPE_WEBHOOK_SECRET', what: 'Required if webhooks are enabled', required: false },
            { name: 'RAISONNE_ORDERS_DIR', what: 'Order JSON directory (default .data/orders)', required: false },
            { name: 'RAISONNE_UPDATE', what: '1 allows /update apply in production', required: false },
            { name: 'RAISONNE_UPDATE_REPO', what: 'GitHub owner/name for releases', required: false },
          ]}
        />
      </Topic>

      <Topic id="az-api" title="Read-only catalogue API">
        <CodeBlock>{`GET /api/catalogue
GET /api/catalogue/series?limit=100
GET /api/catalogue/series/<slug>
GET /api/catalogue/works/<chain:contract:tokenId>
GET /api/catalogue/globals/artist`}</CodeBlock>
        <Prose>
          <p>
            GET and HEAD only. Domain shapes the pages already render. Anything that sounds like personal data
            (collector, customer, order, commission, credential) answers 404 whether or not this install has the type.
            Off modules contribute no records. Also published: <code>/sitemap.xml</code>, <code>/robots.txt</code>,{' '}
            <code>/manifest.webmanifest</code>, Open Graph image routes.
          </p>
        </Prose>
      </Topic>

      <Topic id="az-update" title="Update the app and deploy">
        <Prose>
          <p>
            <strong>Data refresh</strong> is <code>pnpm snapshot</code> / <code>pnpm snapshot:chain</code>.{' '}
            <strong>Code refresh</strong> is <InlineLink href="/update">/update</InlineLink> or:
          </p>
        </Prose>
        <CodeBlock>{`pnpm update:check
pnpm update:raisonne
pnpm build && pnpm start`}</CodeBlock>
        <Prose>
          <p>
            Apply needs a clean git checkout of the upstream repo (or <code>RAISONNE_UPDATE_REPO</code>), owner session
            on the web path, and <code>RAISONNE_UPDATE=1</code> in production. Never touches{' '}
            <code>src/fixtures/local/</code>, <code>.data/</code>, or <code>.env*</code>. Restart after apply — the
            running Node process does not hot-reload.
          </p>
        </Prose>
        <Callout title="Deploy sketch">
          Node 20+, pnpm, TLS in front. Persist <code>.data/</code> and <code>src/fixtures/local/</code>. Set{' '}
          <code>RAISONNE_SITE_URL</code> to the public HTTPS origin. Set <code>RAISONNE_TRUSTED_PROXY=1</code> when your
          reverse proxy sets <code>X-Forwarded-For</code>.
        </Callout>
        <Prose>
          <p>
            Agents installing or extending the app: read <code>CLAUDE.md</code> and <code>AGENTS.md</code> in the repo
            root. Security reports: <code>SECURITY.md</code>.
          </p>
        </Prose>
      </Topic>
    </>
  );
}

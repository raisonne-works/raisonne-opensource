import {
  ArrowUpRightIcon,
  AwardIcon,
  CalendarIcon,
  CheckIcon,
  CodeIcon,
  CopyIcon,
  ImageIcon,
  ImageOffIcon,
  InfoIcon,
  LayersIcon,
  type LucideIcon,
  MapPinIcon,
  MaximizeIcon,
  MenuIcon,
  MoonIcon,
  NewspaperIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SunIcon,
  TriangleAlertIcon,
  WalletIcon,
} from 'lucide-react';

import { Section } from '@/components/raisonne/shell/page';
import { GRID_CLASS, GRID_SIZES } from '@/components/raisonne/works/lib';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { ActionSpecimens } from '../_foundations/gallery-actions';
import { DisplaySpecimens } from '../_foundations/gallery-display';
import { FormSpecimens } from '../_foundations/gallery-forms';
import { Specimen, SpecimenGrid } from '../_foundations/specimen';
import { baseRadiusPx, readThemeTokens, type ThemeTokens, tokenValue } from '../_foundations/tokens';

/** The in-page anchors of this section, for the design system's navigation. */
export const FOUNDATION_TOPICS = [
  { id: 'foundations-colour', label: 'Colour' },
  { id: 'foundations-typography', label: 'Typography' },
  { id: 'foundations-radius', label: 'Radius' },
  { id: 'foundations-layout', label: 'Layout and density' },
  { id: 'foundations-icons', label: 'Iconography' },
  { id: 'foundations-states', label: 'States' },
  { id: 'foundations-components', label: 'Components' },
] as const;

/** Subsections share one rhythm across the design system page. */
const SUBSECTION_CLASS = 'py-6 md:py-8';

/* Colour ------------------------------------------------------------------ */

const COLOUR_PAIRS = [
  {
    name: 'Background',
    bg: 'background',
    fg: 'foreground',
    utilities: 'bg-background text-foreground',
    role: 'The page and the text on it. Most of the site is these two; the art sits directly on the background.',
  },
  {
    name: 'Card',
    bg: 'card',
    fg: 'card-foreground',
    utilities: 'bg-card text-card-foreground',
    role: 'Self-contained panels: cards and alerts. Used sparingly, never around artwork.',
  },
  {
    name: 'Popover',
    bg: 'popover',
    fg: 'popover-foreground',
    utilities: 'bg-popover text-popover-foreground',
    role: 'Floating layers: menus, selects, dialogs, sheets and hover cards.',
  },
  {
    name: 'Primary',
    bg: 'primary',
    fg: 'primary-foreground',
    utilities: 'bg-primary text-primary-foreground',
    role: 'The one accent. The main action on a view, checked and selected states, progress.',
  },
  {
    name: 'Secondary',
    bg: 'secondary',
    fg: 'secondary-foreground',
    utilities: 'bg-secondary text-secondary-foreground',
    role: 'Secondary buttons and metadata badges.',
  },
  {
    name: 'Muted',
    bg: 'muted',
    fg: 'muted-foreground',
    utilities: 'bg-muted text-muted-foreground',
    role: 'Quiet fills (skeletons, media placeholders) and secondary text: captions, dates, counts.',
  },
  {
    name: 'Accent',
    bg: 'accent',
    fg: 'accent-foreground',
    utilities: 'bg-accent text-accent-foreground',
    role: 'The hover and keyboard-focus fill in menus, lists and command results.',
  },
] as const;

const COLOUR_SINGLES = [
  {
    name: 'Destructive',
    token: 'destructive',
    utilities: 'text-destructive bg-destructive/10',
    role: 'Errors and actions that remove something. Never decoration.',
  },
  { name: 'Border', token: 'border', utilities: 'border-border', role: 'Hairlines: dividers, card and table edges. The default border colour.' },
  { name: 'Input', token: 'input', utilities: 'border-input', role: 'The edge of form controls.' },
  { name: 'Ring', token: 'ring', utilities: 'ring-ring/50', role: 'Focus rings, always at 50% opacity and 3 px.' },
] as const;

const CHART_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;

function modesOf(tokens: ThemeTokens) {
  return [
    { label: 'Light', values: tokens.light },
    { label: 'Dark', values: tokens.dark },
  ];
}

function SwatchCaption({ name, utilities, role }: { name: string; utilities: string; role: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">{name}</p>
      <p className="font-mono text-xs text-muted-foreground">{utilities}</p>
      <p className="text-sm text-pretty text-muted-foreground">{role}</p>
    </div>
  );
}

function ColourFoundation({ tokens }: { tokens: ThemeTokens }) {
  const modes = modesOf(tokens);

  return (
    <Section
      id="foundations-colour"
      title="Colour"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="shadcn's neutral palette with a single accent, primary. Product code uses these tokens only: no hex values, no Tailwind palette colours. Each swatch shows the light and the dark value, read from src/app/globals.css."
    >
      {!tokens.fromSource ? (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertTitle>Showing the current theme only</AlertTitle>
          <AlertDescription>src/app/globals.css could not be read, so both columns use the live CSS variables.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
        {COLOUR_PAIRS.map(pair => (
          <div key={pair.name} className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {modes.map(mode => {
                const bg = tokenValue(mode.values, pair.bg);
                const fg = tokenValue(mode.values, pair.fg);
                return (
                  <div
                    key={mode.label}
                    className="flex h-28 min-w-0 flex-col justify-between rounded-lg p-3"
                    style={{ backgroundColor: bg, color: fg, boxShadow: `inset 0 0 0 1px ${tokenValue(mode.values, 'border')}` }}
                  >
                    <span className="text-xs font-medium">{mode.label}</span>
                    <span className="text-2xl leading-none font-semibold" aria-hidden="true">
                      Aa
                    </span>
                    <span className="truncate font-mono text-[0.6875rem] leading-tight" title={`${bg} with ${fg}`}>
                      {bg}
                    </span>
                  </div>
                );
              })}
            </div>
            <SwatchCaption name={pair.name} utilities={pair.utilities} role={pair.role} />
          </div>
        ))}

        {COLOUR_SINGLES.map(single => (
          <div key={single.name} className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {modes.map(mode => {
                const value = tokenValue(mode.values, single.token);
                return (
                  <div
                    key={mode.label}
                    className="flex h-28 min-w-0 flex-col justify-between gap-2 rounded-lg p-3"
                    style={{
                      backgroundColor: tokenValue(mode.values, 'background'),
                      color: tokenValue(mode.values, 'foreground'),
                      boxShadow: `inset 0 0 0 1px ${tokenValue(mode.values, 'border')}`,
                    }}
                  >
                    <span className="text-xs font-medium">{mode.label}</span>
                    <span className="h-8 w-full rounded-md" style={{ backgroundColor: value }} aria-hidden="true" />
                    <span className="truncate font-mono text-[0.6875rem] leading-tight" title={value}>
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
            <SwatchCaption name={single.name} utilities={single.utilities} role={single.role} />
          </div>
        ))}

        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {modes.map(mode => (
              <div
                key={mode.label}
                className="flex h-28 min-w-0 flex-col justify-between gap-2 rounded-lg p-3"
                style={{
                  backgroundColor: tokenValue(mode.values, 'background'),
                  color: tokenValue(mode.values, 'foreground'),
                  boxShadow: `inset 0 0 0 1px ${tokenValue(mode.values, 'border')}`,
                }}
              >
                <span className="text-xs font-medium">{mode.label}</span>
                <span className="flex h-8 w-full overflow-hidden rounded-md" aria-hidden="true">
                  {CHART_TOKENS.map(token => (
                    <span key={token} className="h-full flex-1" style={{ backgroundColor: tokenValue(mode.values, token) }} />
                  ))}
                </span>
                <span className="font-mono text-[0.6875rem] leading-tight">chart-1 to chart-5</span>
              </div>
            ))}
          </div>
          <SwatchCaption
            name="Chart"
            utilities="fill-chart-1 ... fill-chart-5"
            role="A neutral ramp for data, such as import statistics. The art brings the colour; the interface does not compete."
          />
        </div>
      </div>

      <p className="max-w-prose text-sm text-muted-foreground">
        globals.css also defines sidebar tokens for shadcn&apos;s Sidebar component. Raisonne does not use a sidebar, so
        they are left at their defaults.
      </p>
    </Section>
  );
}

/* Typography -------------------------------------------------------------- */

const TYPE_SCALE = [
  {
    name: 'Page title',
    tag: 'h1',
    className: 'text-3xl font-semibold tracking-tight sm:text-4xl',
    sample: 'Paste Grounds',
    usage: 'PageHeader. One per page.',
  },
  {
    name: 'Section title',
    tag: 'h2',
    className: 'text-xl font-semibold tracking-tight sm:text-2xl',
    sample: 'Selected exhibitions',
    usage: 'Section, the default heading level.',
  },
  {
    name: 'Subsection title',
    tag: 'h3',
    className: 'text-lg font-semibold tracking-tight',
    sample: 'Provenance',
    usage: 'Section with headingLevel 3.',
  },
  {
    name: 'Lead',
    tag: 'p',
    className: 'text-base text-muted-foreground sm:text-lg',
    sample: 'Every work minted on-chain, with the evidence that ties it to the artist.',
    usage: 'The description under a page title. Capped at max-w-prose.',
  },
  {
    name: 'Body',
    tag: 'p',
    className: 'text-base leading-7',
    sample:
      'The series began with paste papers: a ground of coloured paste, combed and pressed while wet, so every sheet records the hand that made it.',
    usage: 'Statements, biographies and descriptions. At most 72 characters per line.',
  },
  {
    name: 'Interface',
    tag: 'p',
    className: 'text-sm font-medium',
    sample: 'Save changes',
    usage: 'Navigation, buttons, labels and table headers.',
  },
  {
    name: 'Metadata',
    tag: 'p',
    className: 'text-sm text-muted-foreground',
    sample: 'Demo Artist, 2024. Edition of 25.',
    usage: 'Captions under media, dates, counts.',
  },
  {
    name: 'Fine print',
    tag: 'p',
    className: 'text-xs text-muted-foreground',
    sample: 'Image: The Metropolitan Museum of Art, Open Access (CC0).',
    usage: 'Credits, hints and footnotes.',
  },
  {
    name: 'Data',
    tag: 'code',
    className: 'font-mono text-xs',
    sample: '0x000000000000000000000000000000de000001 #4 2024-05-12',
    usage: 'Addresses, token ids, hashes and dates as data. The only place Geist Mono appears.',
  },
] as const;

function TypographyFoundation() {
  return (
    <Section
      id="foundations-typography"
      title="Typography"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="Geist Sans for everything people read, Geist Mono only for on-chain data. Headings are semibold with tight tracking; weight, not size, does most of the work."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Geist Sans, font-sans</p>
          <p className="text-5xl leading-none tracking-tight" aria-hidden="true">
            Aa Gg 1234
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-normal">Regular 400</span>
            <span className="font-medium">Medium 500</span>
            <span className="font-semibold">Semibold 600</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Geist Mono, font-mono</p>
          <p className="font-mono text-5xl leading-none tracking-tight" aria-hidden="true">
            0x de01
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
            <span className="font-normal">Regular 400</span>
            <span className="font-medium">Medium 500</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col divide-y border-y">
        {TYPE_SCALE.map(style => (
          <div key={style.name} className="grid gap-3 py-5 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-8">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {style.name} <span className="font-normal text-muted-foreground">{style.tag}</span>
              </p>
              <p className="font-mono text-xs break-words text-muted-foreground">{style.className}</p>
              <p className="text-sm text-muted-foreground">{style.usage}</p>
            </div>
            <p className={cn('max-w-prose min-w-0 break-words', style.className)}>{style.sample}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* Radius ------------------------------------------------------------------ */

const RADII = [
  { className: 'rounded-sm', factor: 0.6, usage: 'Keyboard keys, small inner marks.' },
  { className: 'rounded-md', factor: 0.8, usage: 'Tooltips, menu items, skeleton lines.' },
  { className: 'rounded-lg', factor: 1, usage: 'Buttons, inputs, menus, alerts and artwork media.' },
  { className: 'rounded-xl', factor: 1.4, usage: 'Cards, dialogs, empty states.' },
  { className: 'rounded-4xl', factor: 2.6, usage: 'Badges, as pills.' },
  { className: 'rounded-full', factor: null, usage: 'Avatars, switches, progress tracks.' },
] as const;

function RadiusFoundation({ tokens }: { tokens: ThemeTokens }) {
  const base = baseRadiusPx(tokens.light);

  return (
    <Section
      id="foundations-radius"
      title="Radius"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description={`Every radius derives from one token, --radius${tokens.light.radius ? ` (${tokens.light.radius}${base ? `, ${base} px` : ''})` : ''}. Media uses the same radius as controls, so a grid of works and the buttons around it read as one system.`}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 xl:grid-cols-6">
        {RADII.map(radius => (
          <div key={radius.className} className="flex min-w-0 flex-col gap-3">
            <div className={cn('aspect-square w-full border bg-muted', radius.className)} aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-xs">{radius.className}</p>
              <p className="text-xs text-muted-foreground">
                {radius.factor === null
                  ? '9999 px'
                  : base
                    ? `${Math.round(base * radius.factor * 10) / 10} px, ${radius.factor} x radius`
                    : `${radius.factor} x radius`}
              </p>
              <p className="text-sm text-muted-foreground">{radius.usage}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* Layout and density ------------------------------------------------------ */

const SPACING = [
  { step: '1', px: 4, className: 'w-1' },
  { step: '2', px: 8, className: 'w-2' },
  { step: '3', px: 12, className: 'w-3' },
  { step: '4', px: 16, className: 'w-4' },
  { step: '6', px: 24, className: 'w-6' },
  { step: '8', px: 32, className: 'w-8' },
  { step: '10', px: 40, className: 'w-10' },
  { step: '12', px: 48, className: 'w-12' },
  { step: '16', px: 64, className: 'w-16' },
] as const;

const LAYOUT_RULES = [
  { term: 'Page gutter', detail: 'px-4 on phones (16 px), px-6 from sm, px-8 from lg, px-12 from 3xl. Set by Container.' },
  {
    term: 'Section rhythm',
    detail:
      'py-10, py-12 from md; nested sections py-6, py-8 from md. Sections are separated by space, not rules: hairlines belong to the site chrome (header, footer) and to dividers inside a component, such as a table or a list.',
  },
  { term: 'Inside a section', detail: 'gap-6 between the heading row and content; gap-3 inside a caption.' },
  { term: 'Controls', detail: 'One density: buttons, inputs, selects and toggles are all h-8. Icon buttons are size-8.' },
  { term: 'Reading width', detail: 'Body text is capped at about 72 characters (Container size="text"); leads and descriptions use max-w-prose.' },
  { term: 'Media width', detail: 'Grids of works use the full wide Container, up to 2880 px of content.' },
] as const;

const BREAKPOINTS = [
  { name: 'base', min: '0', columns: 2 },
  { name: 'md', min: '768 px', columns: 3 },
  { name: 'xl', min: '1280 px', columns: 4 },
  { name: '3xl', min: '1920 px', columns: 5 },
  { name: '4xl', min: '2560 px', columns: 6 },
] as const;

function LayoutFoundation() {
  return (
    <Section
      id="foundations-layout"
      title="Layout and density"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="A 4 px base unit and one density for the whole site. Text stays at reading width; media takes the width it is given, from a phone at 390 px to a wide display at 2560 px and beyond."
    >
      <div className="grid gap-10 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-medium">Spacing scale</h4>
          <ul className="flex flex-col gap-2">
            {SPACING.map(space => (
              <li key={space.step} className="grid grid-cols-[3rem_4rem_minmax(0,1fr)] items-center gap-3 text-sm">
                <span className="font-mono text-xs">{space.step}</span>
                <span className="text-muted-foreground tabular-nums">{space.px} px</span>
                <span className={cn('h-2 rounded-sm bg-primary', space.className)} aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-medium">Rules</h4>
          <dl className="flex flex-col divide-y border-y">
            {LAYOUT_RULES.map(rule => (
              <div key={rule.term} className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-sm font-medium">{rule.term}</dt>
                <dd className="text-sm text-muted-foreground">{rule.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h4 className="text-sm font-medium">Media grid</h4>
          <p className="text-sm text-muted-foreground">
            At this width: <span className="font-medium text-foreground md:hidden">2 columns</span>
            <span className="hidden font-medium text-foreground md:inline xl:hidden">3 columns</span>
            <span className="hidden font-medium text-foreground xl:inline 3xl:hidden">4 columns</span>
            <span className="hidden font-medium text-foreground 3xl:inline 4xl:hidden">5 columns</span>
            <span className="hidden font-medium text-foreground 4xl:inline">6 columns</span>
          </p>
        </div>
        <div className={GRID_CLASS} aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex aspect-square items-center justify-center rounded-lg bg-muted font-mono text-xs text-muted-foreground">
                {index + 1}
              </div>
              <div className="h-3 w-2/3 rounded-sm bg-muted" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Table>
            <TableCaption className="sr-only">Media grid columns by breakpoint</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Breakpoint</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Columns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BREAKPOINTS.map(point => (
                <TableRow key={point.name} className="hover:bg-transparent">
                  <TableCell className="font-mono text-xs">{point.name}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{point.min}</TableCell>
                  <TableCell className="tabular-nums">{point.columns}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex min-w-0 flex-col gap-2 text-sm text-muted-foreground">
            <p>
              The grid and its next/image sizes live together in works/lib, so the browser downloads a still no wider
              than its column:
            </p>
            <code className="font-mono text-xs break-words text-foreground">{GRID_SIZES}</code>
            <p>Grids always load media.still, never the animated original.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* Iconography ------------------------------------------------------------- */

const ICONS: { name: string; meaning: string; Icon: LucideIcon }[] = [
  { name: 'Layers', meaning: 'Series', Icon: LayersIcon },
  { name: 'Image', meaning: 'Work, still', Icon: ImageIcon },
  { name: 'Play', meaning: 'Video work', Icon: PlayIcon },
  { name: 'Code', meaning: 'Interactive work', Icon: CodeIcon },
  { name: 'Maximize', meaning: 'Open the viewer', Icon: MaximizeIcon },
  { name: 'ImageOff', meaning: 'Media missing', Icon: ImageOffIcon },
  { name: 'Wallet', meaning: 'Wallet', Icon: WalletIcon },
  { name: 'ShieldCheck', meaning: 'Evidence', Icon: ShieldCheckIcon },
  { name: 'ArrowUpRight', meaning: 'Leaves the site', Icon: ArrowUpRightIcon },
  { name: 'Copy', meaning: 'Copy', Icon: CopyIcon },
  { name: 'Check', meaning: 'Done, selected', Icon: CheckIcon },
  { name: 'Search', meaning: 'Search', Icon: SearchIcon },
  { name: 'SlidersHorizontal', meaning: 'Filters', Icon: SlidersHorizontalIcon },
  { name: 'Calendar', meaning: 'Date, exhibitions', Icon: CalendarIcon },
  { name: 'MapPin', meaning: 'Venue, location', Icon: MapPinIcon },
  { name: 'Award', meaning: 'Award', Icon: AwardIcon },
  { name: 'Newspaper', meaning: 'Press', Icon: NewspaperIcon },
  { name: 'RefreshCw', meaning: 'Retry, re-import', Icon: RefreshCwIcon },
  { name: 'TriangleAlert', meaning: 'Error', Icon: TriangleAlertIcon },
  { name: 'Info', meaning: 'Note', Icon: InfoIcon },
  { name: 'Sun', meaning: 'Light theme', Icon: SunIcon },
  { name: 'Moon', meaning: 'Dark theme', Icon: MoonIcon },
  { name: 'Menu', meaning: 'Menu', Icon: MenuIcon },
];

function IconFoundation() {
  return (
    <Section
      id="foundations-icons"
      title="Iconography"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="Lucide, at the size the component sets: 16 px in buttons, menus and inline text. Icons support a label, they rarely replace one. When an icon is a button's only content, the button has an aria-label; otherwise icons are aria-hidden."
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-8">
        {ICONS.map(({ name, meaning, Icon }) => (
          <li key={name} className="flex min-w-0 items-center gap-3 rounded-lg border p-3">
            <Icon className="size-4 shrink-0" aria-hidden />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{meaning}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">{name}</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* States ------------------------------------------------------------------ */

function StatesFoundation() {
  return (
    <Section
      id="foundations-states"
      title="Empty, loading and error"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="Every view that loads data designs all three. Loading keeps the final layout (Skeleton); empty says why and what to do next (Empty); errors explain in plain words and offer a retry (Alert, destructive)."
    >
      <SpecimenGrid>
        <Specimen title="Loading" source="ui/skeleton" stageClassName="items-stretch">
          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-6" role="status" aria-label="Loading works">
            {[0, 1, 2, 3].map(index => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        </Specimen>
        <Specimen title="Empty" source="ui/empty" stageClassName="p-0 sm:p-0">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayersIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No series yet</EmptyTitle>
              <EmptyDescription>
                Add the wallets you minted from and the importer will find your contracts.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm">Start an import</Button>
            </EmptyContent>
          </Empty>
        </Specimen>
        <Specimen title="Error" source="ui/alert" stageClassName="items-start">
          <Alert variant="destructive">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>This series could not be loaded</AlertTitle>
            <AlertDescription>Nothing is lost. Check your connection and try again.</AlertDescription>
            <AlertAction>
              <Button size="xs" variant="outline">
                Retry
              </Button>
            </AlertAction>
          </Alert>
        </Specimen>
      </SpecimenGrid>
    </Section>
  );
}

/* Components -------------------------------------------------------------- */

function ComponentsFoundation() {
  return (
    <Section
      id="foundations-components"
      title="Components"
      headingLevel={3}
      className={SUBSECTION_CLASS}
      description="Every shadcn/ui primitive installed in src/components/ui, unmodified, in the states the product uses. They are built on Base UI: compose with the render prop, not asChild."
    >
      <SpecimenGrid>
        <ActionSpecimens />
        <FormSpecimens />
        <DisplaySpecimens />
      </SpecimenGrid>
    </Section>
  );
}

/** The foundations topics. The design system page wraps them in the Foundations section. */
export function FoundationsSection() {
  const tokens = readThemeTokens();

  return (
    <div className="flex flex-col">
      <ColourFoundation tokens={tokens} />
      <TypographyFoundation />
      <RadiusFoundation tokens={tokens} />
      <LayoutFoundation />
      <IconFoundation />
      <StatesFoundation />
      <ComponentsFoundation />
    </div>
  );
}

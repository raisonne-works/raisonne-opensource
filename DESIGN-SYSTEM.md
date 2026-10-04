# The Raisonne design system

A short guide to how this site is built, so a new install can be changed with confidence and an artist's own look can be added without rewriting anything.

The live version of this page is `/design-system`, which renders every component with this install's own data. It is one of the artist's tools, so it is served in development and in production only with `RAISONNE_TOOLS=1`.

## What the system is

Standard [shadcn/ui](https://ui.shadcn.com), nothing invented:

- **Style** `base-nova`, built on **Base UI** primitives. Base UI composes with a `render` prop, not `asChild`: `<DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>`.
- **Base colour** `neutral`. One accent, the default `primary`.
- **Icons** lucide.
- **CSS variables** in `src/app/globals.css`, light by default with a dark class (`next-themes`, class strategy).
- **Type** Geist Sans for everything, Geist Mono only for data: addresses, token ids, years and dates. Counts are `tabular-nums`, not mono.

Components in `src/components/ui` come from the CLI and are not edited by hand:

```bash
pnpm dlx shadcn@latest add -y <name>    # add one
pnpm dlx shadcn@latest docs <name>      # read its docs
```

Everything specific to a catalogue lives in `src/components/raisonne`, takes the types in `src/lib/types.ts`, and never reads data itself.

## Tokens

Surfaces and text come from tokens, never from raw hex or a Tailwind palette colour:

`bg-background` `bg-card` `bg-muted` `bg-popover` `text-foreground` `text-muted-foreground` `border-border` `ring-ring` `bg-primary` `text-primary-foreground` `bg-destructive`

Two more decisions sit in code, so a change lands everywhere at once:

| Constant | Where | What it sets |
| --- | --- | --- |
| `GRID_CLASS`, `GRID_SIZES` | `works/lib.ts` | The one media grid: 2 columns on phones, 3 from `md`, 4 from `xl`, 5 from `3xl` (1920 px), 6 from `4xl` (2560 px), with matching `next/image` sizes. Use the theme's breakpoints; never mix `min-[1920px]` with rem breakpoints, because Tailwind cannot order them and `xl` wins. |
| `READING_CLASS`, `READING_LEAD_CLASS` | `shell/measure.ts` | How wide text runs: about 70 characters at 16 px and at 18 px. `max-w-prose` measures in "0" widths, which in Geist is roughly 90 characters. |
| `EMPTY_BLOCK_CLASS` | `shell/measure.ts` | How wide a designed empty state is: an island of about 32 rem centred in the content area, never a dashed frame the width of the page. |
| `MEDIA_FRAME_CLASS` | `works/lib.ts` | The plate and hairline under every media tile, the same in both themes, so a work with a black background keeps an edge in dark mode and a letterboxed work does not look boxed. |
| `WORK_STAGE_CLASS` and the `work-stage` utility | `works/lib.ts`, `globals.css` | The stage on a work page. It takes the work's own proportions at every width from `--stage-w` and `--stage-h` (set by `stageVars()`), capped by height, so a portrait work gets a portrait stage instead of grey bars beside it. |
| `SERIES_HERO_CLASS` | `works/lib.ts` | The cover band on a series page and its essay page. Capped in width as well as ratio, so a wider display never crops the artwork harder. |
| `PAGE_SIZE`, `MAX_PAGE`, `pageCount()`, `clampPage()` | `catalogue/lib.ts` | 24 rows a page, numbered. One request renders one page whatever `?page=` asks for. |

Other house rules: one radius scale from `--radius`; one control density (`h-8`); sections separated by space, not rules (hairlines belong to the header, the footer and dividers inside a component); no gradients, no glassmorphism, no card inside a card. The one place a shared component reached for a backdrop filter, the sheet's scrim, is overridden in `globals.css` with a plain scrim instead.

Two rules about text a page did not write itself. Counts inside an artist's own prose are tokens, and `fillTokens()` in `lib/records.ts` resolves them on every surface that prints that prose: the About page, the CV page and the CV PDF all run it, so the three cannot disagree, and a token nobody recognises is taken out of a build rather than printed as braces. Token metadata is markdown-shaped plain text, and `lib/markdown.ts` turns it into the same `RichText` every other passage uses, so a work's description resolves its emphasis and its links instead of showing them as characters.

## The components

### Shell, `src/components/raisonne/shell`

| Component | Props | Notes |
| --- | --- | --- |
| `Container` | `size` (`wide` \| `editorial` \| `text`), `className` | `wide` for media, up to 2880 px of content; `editorial` (88 rem) for a page that is prose with something beside it, so the column sits in the optical centre of a 2560 px screen; `text` for one reading column. Sets the gutter. |
| `PageHeader` | `title`, `description`, `eyebrow`, `actions`, `actionsBelow`, `headingLevel` | `actionsBelow` keeps links in the text column at every width. |
| `Section` | `title`, `description`, `action`, `id`, `headingLevel`, `size` | A titled block. `headingLevel` is what it means, `size` is how big it looks. |
| `SiteHeader` | `artist`, `groups` | The grouped navigation (`MainNav`, `MobileNav`) and the theme toggle. |
| `SiteFooter` | `artist`, `groups`, `settings`, `newsletter`, `tools`, `demoData` | Four even columns of links (Catalogue, Artist with More folded in, Elsewhere, Where to collect), the brand and the sign-up above them, and the minting addresses in a row of their own, because they are a table and not a link list. `tools` adds a "For the artist" group and is `RAISONNE_TOOLS_NAV`, not `RAISONNE_TOOLS`: running the importer must not publish it in the footer of every page. |
| `FooterShell`, `BackToTop` | `mode` | The three footer modes: in the flow, a panel the bottom bar opens, or off. The map is `FOOTER_MODES` in `nav.ts`. A route mapped to `panel` falls back to `flow` when the page turns out to be shorter than the window, so a short list does not end in white behind a "Show the footer" bar. |
| `BottomBarAction` | `children` | A page's own control in the bar across the bottom of the window, through a portal into the bar's slot. The catalogue puts its count and "Clear the filters" there. Renders nothing on a route with no bar. |
| `HideOnBareRoute`, `isBareRoute` | `children` | The routes that carry no site chrome. `/maintenance` keeps the wordmark and the theme toggle, and loses the navigation, the trail and the footer: a page saying the catalogue is closed should not link to all of it. |
| `SiteBreadcrumbs` | none | The automatic trail, derived from the URL in the layout. A page that renders its own breadcrumb inside `main` hides it, through one hoisted CSS rule, so the two never stack. |
| `FactsTable` | `facts` | Label and value rows, for a record whose values are plain text. `works/fact-list.tsx` is the richer form (addresses, badges, links). |
| `RichTextView` | `value` | The CMS rich text a record or a legal page carries. |
| `ShareButton` | `title`, `url` | The system share sheet where there is one, a copied link otherwise, with a real confirmation and a real failure message. |
| `CardHeading` | `level` | A `CardTitle` that is also a heading, so a flow of cards has an outline. |
| `CopyButton` | `value`, `label` | Copies an address or a token id. |
| `LegalPage`, `MaintenanceNotice` | `settings` | `/privacy` and `/terms`, and the page the proxy sends every route to during an outage. |

`nav.ts` builds the navigation from the data: `siteNav(data)` returns the groups, and an entry appears only when its module is on and its list is not empty. `heading.ts` carries `HeadingLevel` and `nextHeadingLevel`. Every component that owns a heading takes `headingLevel`, so the same component can be an `h1` on its page and an `h5` in the design system.

### Works, `src/components/raisonne/works`

| Component | Props | Notes |
| --- | --- | --- |
| `MediaStill` | `media`, `alt`, `sizes`, `fit`, `source`, `priority`, `emptyLabel`, `as`, `onNaturalSize` | Every image goes through it. Grids pass `media.still`; a work page's stage passes `source="stage"`. GIFs and missing stills get the designed empty frame, quietly, with the caller's own words: an exhibition photograph is never "not found on-chain". `as="span"` inside a button. |
| `MediaViewer` | `work`, `open`, `onOpenChange`, `trigger`, `children` | The work full size in a dialog, with zoom, pan and real full screen. Video plays here and only here, and not automatically when the viewer asks for less motion. |
| `ZoomPanStage`, `ZoomControls` | `useZoomPan()` | 0.5x to 5x with the wheel, pinch, buttons, double click and the keyboard. The point under the cursor stays put and the size is announced once, politely. |
| `LiveHtmlFrame` | `work`, `still` | Runs an interactive work only when `settings.liveHtml` is on and only on a click from the still, in `sandbox="allow-scripts"` with no `allow-same-origin` and `referrerPolicy="no-referrer"`. Never auto-runs, never in a grid. Stop, Full screen and "Open the live work" are always there. |
| `WorkMedia` | `work` | The stage on a work page: the still, a zoom trigger, the run action for interactive pieces. |
| `WorkAttributes`, `WorkFacts`, `WorkTags` | `work`, `series` | The record beside the work: description, traits, file specs, on-chain facts with copy and explorer, and the categories as links into `/works?medium=`. |
| `FactList`, `FactTable` | `facts` | The richer facts: a chain badge, a mono address with a copy button, an external-link row. Accepts `Fact[]` as `shell/facts.tsx` defines it. |
| `WorkCard`, `SeriesCard` | `work` / `series`, `href`, `sizes`, `priority` | One tile: media above, caption below. Never a Card. |
| `WorkGrid`, `SeriesGrid` | `works` / `series`, `priorityCount`, `itemClassName`, `empty` | The shared grid. `itemClassName={twoRowTileClass}` trims a fixed selection to two whole rows at every breakpoint. |
| `SeriesHeader` | `series`, `headingLevel` | Breadcrumb, header, the facts, the attribution. Prints the display title and says "Recorded on-chain as ..." when the two differ. |
| `SeriesSpecs`, `SeriesAbout`, `SeriesHero`, `SubSeries` | `series` | The facts, the essay (with `/works/[series]/about` as its own page), the essay page's hero, and the chapters of a family. |
| `WorkDetail` | `work`, `series`, `headingLevel`, `standalone` | Media sticky beside the record from `xl`. `standalone` for a one of one, whose series page is the work. |
| `EvidenceBadges` | `evidence`, `coAuthored`, `compact` | One badge per on-chain signal, each a Popover so the explanation opens on a tap as well as on hover. `compact` folds them into one badge. |
| `ProvenanceList` | `series` | The same signals as plain text, for pages that need them readable without opening anything. |
| `WorksPagination` | `page`, `pages`, `hrefFor` | The one paging control on the site. Links, so every page has its own URL; the catalogue uses it too, through `CataloguePagination`. |
| `WorkPager` | `previous`, `next` | Neighbouring works. |
| `ChainBadge` | `chain` | Text only: chains get no brand colour. |

### Catalogue, `src/components/raisonne/catalogue`

The one index behind `/works` and every type list. `entry.ts` turns any record into a `CatalogueEntry`; `lib.ts` holds the URL state (`q`, `type`, `kind`, `chain`, `year`, `medium`, `platform`, `sort`, `view`, `shown`), the filtering and sorting, and the five `VIEWS` with their grid classes and `next/image` sizes.

| Component | Props | Notes |
| --- | --- | --- |
| `CatalogueBrowser` | `entries`, `state`, `config` | Runs on the server: only the 24 rows on screen reach the browser. `CatalogueListPage` wraps it with a header, and `CatalogueBrowserSkeleton` is the loading state. |
| `CatalogueCard`, `CatalogueTable`, `GalleryWall` | `entry` / `entries` | Grid, dense, contact sheet, table and wall. The card carries badges, a second image on hover, and enlarge and copy-contract where a pointer can hover: on a touch screen those two would sit permanently over a fifth of every artwork. The contact sheet shows whole frames rather than uniform crops. The table opens each row with a thumbnail and sorts by its Title and Year headings. |
| `CatalogueSearch`, `SortMenu`, `CatalogueFacets`, `ActiveFilters`, `ViewToggle`, `CataloguePagination` | the state | Real GET forms and links, so the list works with no JavaScript. On a phone the search takes a row of its own and the view toggle offers the grid and the table only; from `sm` the whole bar is one cluster at the left. The view is remembered in the `raisonne-view` cookie, read on the server by `storedView()`. |
| `CatalogueSections` | `data` | One tile per section with its live count, a blurb and a cover of its own. Also the header of `/works` and a home-page section. |
| `EnlargeButton` | `entry` | The still in a dialog over the list, without changing the route. An interactive work is never run in a list: it points at the work's page. |
| `FeaturedExhibitions`, `ExhibitionHistory`, `PressFeatured`, `PressVideos`, `PressPodcasts`, `PressTable`, `PressKit` | records | The blocks `/exhibitions` and `/press` add around the browser. `/exhibitions` no longer uses `FeaturedExhibitions`: it rendered the same three shows the grid already opened with, so featured records are marked inside the grid instead (`markFeatured` on the config). |

### Story blocks, `src/components/raisonne/story`

`StoryBlocks` (`blocks`, `aside`, `headingLevel`) dispatches the eleven block types a record's story can hold: text (1 to 4 columns, read more), media, gallery, film, press, process, sketchbook, related records, click-to-load embed, chapter title and walk-in room. Nothing is requested from YouTube, Vimeo or X until the visitor presses play. An unknown block renders nothing and logs once in development. `AssetPlate` keeps a picture at its own proportions rather than letterboxing it. It resolves press ids and record references itself, so it is a server component.

### Records, `src/components/raisonne/records`

`RecordHero`, `RecordIntro`, `RecordFacts` (built by `facts.ts`, one builder per type), `RecordBreadcrumb`, `RecordCard` / `RecordCardGrid`, `AboutSection`, `PartnerList`, `WritingArticle`, `PressDetail`, `PressPlayer`, `RecordError`. `resolve.ts` is the only place that turns a `RecordRef` into an href and a title, and a reference this install does not hold is dropped rather than rendered dead.

### Landing, `src/components/raisonne/landing`

`LandingHero`, `Ticker` (studio clock and rotating keywords), `Showreel`, `Stats` (free text with `{{artworks}}` tokens), `FeaturedGrid` (any record type, up to six), `Partners`, `News`, `NewsletterForm`, each with its own `*Skeleton`. The home page renders the sections in the order `Landing.sections` gives, dropping any whose data is empty or whose module is off.

### Drops, `src/components/raisonne/drops`

`DropHero`, `Countdown`, `DropPhases`, `DropSpecs`, `NotifyDialog`, `AddToCalendar` and the `DropCallout` a series page shows for a release announced for it. Countdowns render from a fixed `RENDERED_AT` on the server and correct themselves from the browser's clock after mount (`use-now.ts`), so hydration matches and a page built last week still reads "Open now" on the day.

### Commissions, `src/components/raisonne/commissions`

`CommissionsHero` / `CommissionsCta`, `Services` (each enquiry carries the service name in the mail subject), `ClientLogos`, `FeaturedCollaborations`.

### SEO, `src/components/raisonne/seo`

`JsonLd`, `SiteJsonLd` (one `@graph` in the root layout) and `BreadcrumbJsonLd` render the generators in `src/lib/seo/json-ld.ts`. `SiteAnalytics` loads GA4, Plausible or Umami from `settings.analytics`, and nothing at all for `none` or during maintenance.

### Profile, `src/components/raisonne/profile`

`AboutPage`, `ArtistHero` (`artist`, `statementHref`, `headingLevel`), `BioWithCounts`, `Highlights`, `MintingAddresses`, `ResearchAreas`, `PartnerGroups`, `StudioCarousel`, `ArtistLinkList`, `Cv` (`data`, `idPrefix`, `headingLevel`) with `CvContact`, `ExperienceList`, `EducationList`, `SkillGroups` and `CollaborationList`, `ExhibitionTimeline`, `ExhibitionList` / `AwardList` / `PressList` (`limit`), their `*Empty` and `*Skeleton` states, `YearGroups`, `ExternalLink`, `PrintButton`, `DownloadCvButton`, `ProfileError`.

### Import, `src/components/raisonne/import`

`ImportFlow` (`replay` or `source`, `autoStart`, `headingLevel`) orchestrates `WalletForm`, `ImportProgress`, `WorksPreview`, `SeriesReview` and `ImportSummary`. Every step renders the same reducer (`import-state.ts`) over the importer's event stream, so a live run, a recorded replay and a frozen sample look alike. `ImportReplay` fetches a recording from `/import/replay` instead of shipping it in the HTML; `createStreamSource` swaps in a live importer with no other change.

## Page map

| Route | Built from |
| --- | --- |
| `/` | `LandingHero`, `Ticker`, `Showreel`, `Stats`, `FeaturedGrid`, `CatalogueSections`, `Partners`, `News`; `ArtistHero` plus one large still when there is no landing data |
| `/works` | `CatalogueSections` as the header, then `CatalogueBrowser` over every record type |
| `/works/[series]` | `SeriesHeader` (opening on the cover band), `SeriesSpecs`, `SubSeries`, `WorkGrid`, `WorksPagination`, `SeriesAbout`, `DropCallout`, or `WorkDetail` for a one of one |
| `/works/[series]/about` | `SeriesHero`, `StoryBlocks` |
| `/works/[series]/[token]` | `WorkDetail` (`WorkMedia`, `MediaViewer`, `LiveHtmlFrame`, `WorkAttributes`, `WorkFacts`, `WorkTags`), `ShareButton`, `WorkPager` |
| `/drops/[slug]` | `DropHero`, `Countdown`, `DropPhases`, `DropSpecs`, `StoryBlocks`, `NotifyDialog` (module: `drops`) |
| `/immersive`, `/physical-works`, `/collaborations`, `/awards`, `/writings` | `CatalogueListPage` scoped to that type (`/writings` behind its module) |
| `/exhibitions` | `CatalogueListPage` with `markFeatured`, then `ExhibitionHistory` |
| `/press` | `PressFeatured`, `PressVideos`, `PressPodcasts`, `PressTable`, `PressKit` |
| `/immersive/[slug]`, `/exhibitions/[slug]`, `/physical-works/[slug]`, `/collaborations/[slug]`, `/awards/[slug]`, `/writings/[slug]`, `/press/[slug]` | `RecordBreadcrumb`, `RecordHero`, `RecordFacts`, `AboutSection`, `StoryBlocks`, plus the per-type block (`PartnerList`, `WorkGrid`, `WritingArticle`, `PressDetail`) |
| `/commissions` | `CommissionsHero`, `Services`, `ClientLogos`, `FeaturedCollaborations` (module: `commissions`) |
| `/about` | `AboutPage`: `BioWithCounts`, `Highlights`, `StudioCarousel`, `MintingAddresses`, `ResearchAreas`, `PartnerGroups`, `ArtistLinkList` |
| `/cv` | `PageHeader`, `Cv`, `DownloadCvButton`, `PrintButton`; `/cv/download` writes the same data as an A4 PDF |
| `/privacy`, `/terms` | `LegalPage` from `settings.legal`, with a designed empty state and `noindex` when nothing is written |
| `/maintenance` | `MaintenanceNotice` on a bare shell: the wordmark and the theme toggle, no navigation and no footer. `src/proxy.ts` sends every route here while the site is closed |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/opengraph-image` | Built from the data, with hidden records and switched-off modules left out |
| `/api/catalogue/[[...path]]`, `/api/newsletter` | The public read-only catalogue API, and the sign-up forward |
| `/import`, `/design-system` | The artist's tools, behind `RAISONNE_TOOLS`, out of the public navigation. The footer links them only when `RAISONNE_TOOLS_NAV` says so as well, which is off in production |
| `/works?page=n`, `/works/[series]?page=n` | Numbered pages of 24 and 48. There is no load-more anywhere: a position in a catalogue raisonne has to be a URL a scholar can cite, and a page is also the only shape whose cost is bounded |

Each route has its own `loading.tsx` built from the matching `*Skeleton`, and `error.tsx` renders a designed Alert. `app/global-error.tsx` catches what the root layout itself cannot, such as a malformed `src/fixtures/local/site.json`.

A `loading.tsx` makes Next flush the shell with a 200 before the page runs, so a `notFound()` inside the page would arrive in the stream and leave a soft 404. A section that can be switched off in the data keeps its gate in a `layout.tsx` instead, above the loading boundary: see `app/writings`, `app/drops`, `app/commissions` and `app/import`.

## Swapping the theme

The look is a set of CSS variables, so a new theme is a paste, not a refactor:

1. Pick a theme on the [shadcn themes page](https://ui.shadcn.com/themes), or generate one.
2. Replace the `:root` and `.dark` blocks in `src/app/globals.css` with its values. Keep the variable names.
3. Change `--radius` for a rounder or squarer build; every radius follows it.
4. Change the fonts in `src/app/layout.tsx` and the literal family names in the `@theme inline` block of `globals.css`.

A registry theme can also be installed with the CLI:

```bash
pnpm dlx shadcn@latest add -y https://ui.shadcn.com/r/themes/<name>.json
```

Nothing else should need to change, because no component carries a colour of its own.

## The rule

**An artist's brand lives in the theme, not in the components.** The components stay standard shadcn, so any developer, and any agent, can read them, and the CLI can update them. A site's character comes from three places only: the theme variables, the fonts, and the art itself, which is why the chrome stays quiet and the media takes the width.

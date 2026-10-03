/**
 * The shapes a Raisonne site renders. One artist per install: this is a
 * catalogue raisonne of on-chain works plus the practice and the CV around
 * them, not a marketplace and not a multi-artist platform.
 *
 * Every component in src/components/raisonne takes these types, never a CMS
 * or API response directly, so the data source (fixtures today, the CMS and
 * the on-chain importer later) can change without touching the design.
 *
 * Wave 1 additions (feature parity with an existing artist site) are marked
 * "Wave 1". Fields added to the original interfaces are optional, so older
 * fixtures still load; the fixture loader fills new SiteData arrays with []
 * and settings with DEFAULT_SETTINGS.
 */

export type Chain = 'ethereum' | 'base' | 'tezos' | 'bitcoin' | 'solana';

export type TokenStandard = 'ERC721' | 'ERC1155' | 'ORDINAL' | 'FA2' | 'OTHER';

export type MediaKind = 'image' | 'video' | 'html' | 'unknown';

export interface Media {
  kind: MediaKind;
  /** A light still for cards and grids (about 1000 px). */
  still: string | null;
  /** The largest still, for the viewer. */
  full: string | null;
  /** Video or interactive HTML. A site shows HTML as its still unless the artist opts in (settings.liveHtml). */
  animation: string | null;
  width: number | null;
  height: number | null;
}

/** Why a work or series is attributed to the artist, as found on-chain. */
export interface Evidence {
  signal: 'deployer' | 'ownership-log' | 'owner' | 'token-creator' | 'storefront-decode' | 'minted-to';
  detail?: string;
}

// ---------------------------------------------------------------------------
// Wave 1: shared building blocks
// ---------------------------------------------------------------------------

/** A still or a video used by records, story blocks and the home page. Every URL is absolute. */
export interface Asset {
  kind: 'image' | 'video';
  src: string;
  /** For video: the still shown before it plays. */
  poster: string | null;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  /** Encoded video sizes when the host made them, smallest first. Players pick one by screen width. */
  renditions?: { height: number; src: string }[];
  /** Seconds, for video. */
  duration?: number | null;
}

/** Portable rich text. The importer turns any CMS's rich text into this. */
export type RichText = RichBlock[];

export type RichBlock =
  | { type: 'paragraph'; children: RichInline[] }
  | { type: 'heading'; level: 2 | 3 | 4; children: RichInline[] }
  | { type: 'quote'; children: RichInline[] }
  | { type: 'list'; ordered: boolean; items: RichInline[][] }
  | { type: 'image'; asset: Asset };

export interface RichInline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

/** A labelled row in a record's facts table ("Curator", "Dimensions"). */
export interface Fact {
  label: string;
  value: string;
  href?: string | null;
}

/** Search and share metadata for one page. Null fields fall back to the page's own defaults. */
export interface Seo {
  title: string | null;
  description: string | null;
  /** Absolute URL of the share image. */
  image: string | null;
  keywords: string[];
}

/** Every kind of record the site has a page for. */
export type RecordType =
  | 'series'
  | 'work'
  | 'installation'
  | 'immersive'
  | 'physical-work'
  | 'exhibition'
  | 'collaboration'
  | 'award'
  | 'writing'
  | 'press'
  | 'drop';

/** A pointer from one record to another. recordHref() turns it into a URL. */
export interface RecordRef {
  type: RecordType;
  /** The record's slug; for works, Work.id (chain:contract:tokenId). */
  key: string;
}

export interface Trait {
  name: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Works and series (original, with Wave 1 fields)
// ---------------------------------------------------------------------------

export interface Work {
  /** chain:contract:tokenId */
  id: string;
  seriesSlug: string;
  title: string;
  description: string | null;
  chain: Chain;
  contract: string;
  tokenId: string;
  standard: TokenStandard;
  media: Media;
  /** ISO date. */
  mintedAt: string | null;
  /**
   * Wave 1. A short title for headings and cards when the on-chain title is a
   * long machine name. `title` stays the full on-chain title and is always
   * available (as a tooltip, in the facts table, or on the record itself).
   */
  displayTitle?: string | null;
  explorerUrl: string;
  marketUrl: string | null;
  /** Editions of this token (ERC-1155), null for a unique token. */
  editionSize: number | null;

  /** Wave 1. Medium or category names: the work's own, then its series'. */
  categories?: string[];
  /** Wave 1. Token traits, shown as a grid. */
  traits?: Trait[];
  /** Wave 1. File facts for the technical specs block. */
  file?: { format: string | null; bytes: number | null } | null;
  /** Wave 1. A unique work; also listed in the one-of-ones section. */
  oneOfOne?: boolean;
  /** Wave 1. Leads every list it appears in. */
  featured?: boolean;
  /** Wave 1. Left out of listings, still reachable by URL and inside its series. */
  hidden?: boolean;
  /** Wave 1. Current holder. Rendered only when settings.showOwners is true. */
  owner?: { name: string | null; address: string } | null;
  /** Wave 1. Marketplace name for marketUrl, e.g. "OpenSea". */
  platform?: string | null;
  /** Wave 1. Ordinals inscription number, for Bitcoin works. */
  inscription?: string | null;
}

export type SeriesKind =
  | 'series' // a contract the artist deployed
  | 'one-of-one' // a single-work contract
  | 'shared-platform'; // the artist's tokens on a marketplace's shared contract

export interface Series {
  slug: string;
  name: string;
  /**
   * Wave 1. The name to print when the contract name is a machine name: a
   * page can read "VISIONS #1" while `name` keeps
   * "Conversations_Between_Natures_Memory_001" for the facts table and search.
   */
  displayTitle?: string | null;
  chain: Chain;
  /** Null for works that are not on a contract (for example Ordinals inscriptions). */
  contract: string | null;
  kind: SeriesKind;
  description: string | null;
  year: number | null;
  workCount: number;
  cover: Media | null;
  /** A short film about the series. Plays muted in the series header and on its card. */
  teaser?: Asset | null;
  evidence: Evidence[];
  /** The artist controls the contract but made it with others. */
  coAuthored: boolean;
  marketUrl: string | null;

  /** Wave 1. A chapter of a larger series; the parent page lists its children first. */
  parentSlug?: string | null;
  /** Wave 1. Medium or category names. */
  categories?: string[];
  /** Wave 1. */
  standard?: TokenStandard | null;
  /** Wave 1. Total or planned supply of the contract. */
  editionSize?: number | null;
  /** Wave 1. Collection inscription address, for Ordinals series. */
  inscriptionAddress?: string | null;
  /** Wave 1. Marketplace name for marketUrl. */
  platform?: string | null;
  /** Wave 1. Unique holders at snapshot time. */
  collectorCount?: number | null;
  /** Wave 1. */
  featured?: boolean;
  /** Wave 1. Left out of listings, still reachable by URL. */
  hidden?: boolean;
  /** Wave 1. The essay and documentation shown in "About this series". */
  story?: StoryBlock[];
  /** Wave 1. */
  seo?: Seo | null;
}

// ---------------------------------------------------------------------------
// The artist (original, with Wave 1 fields)
// ---------------------------------------------------------------------------

/** Wave 1. What a link is for, so the theme can group and label it. */
export type LinkKind = 'social' | 'marketplace' | 'site' | 'email' | 'other';

export interface ArtistLink {
  label: string;
  href: string;
  /** Wave 1. 'site' links (the artist's other domains) render with rel="me". */
  kind?: LinkKind;
  /** Wave 1. An icon name from the theme's icon set, or null for text only. */
  icon?: string | null;
  /** Wave 1. The profile handle, e.g. "@studio". */
  handle?: string | null;
}

export interface ArtistWallet {
  address: string;
  chain: Chain;
  /** Wave 1. Official minting wallets, so collectors can check authenticity. */
  role?: 'primary' | 'secondary' | null;
}

/** Wave 1. Partners grouped by kind ("Museums and galleries", "Technology"). */
export interface PartnerGroup {
  category: string;
  links: ArtistLink[];
}

export interface Artist {
  name: string;
  /** One line under the name, e.g. "New media artist". */
  tagline: string | null;
  /** Plain text, paragraphs separated by a blank line. */
  statement: string | null;
  /**
   * Plain text, paragraphs separated by a blank line. May carry live-count
   * tokens such as {{artworks}} or {{soloExhibitions}}: see CatalogueCounts.
   */
  bio: string | null;
  location: string | null;
  portrait: string | null;
  links: ArtistLink[];
  wallets: ArtistWallet[];

  /** Wave 1. The one line under the About page title. */
  description?: string | null;
  /** Wave 1. Studio and portrait photos for the About page. */
  images?: Asset[];
  /** The heading over those photos on the About page. Defaults to "The studio". */
  imagesTitle?: string | null;
  /** Wave 1. Public contact address. */
  email?: string | null;
  /** Wave 1. Shown under the minting addresses, e.g. "Never send funds to an address from a DM." */
  securityNotice?: string | null;
  /** Wave 1. */
  researchAreas?: { title: string; description: string | null; icon: string | null }[];
  /** Wave 1. */
  partners?: PartnerGroup[];
  /** Wave 1. A downloadable press kit. */
  pressKit?: { title: string | null; body: RichText | null; fileUrl: string | null } | null;
}

// ---------------------------------------------------------------------------
// CV records (original, with Wave 1 fields)
// ---------------------------------------------------------------------------

export type ExhibitionKind = 'solo' | 'group' | 'biennale' | 'festival' | 'fair' | 'conference' | 'other';

export interface Exhibition {
  id: string;
  year: number;
  title: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  kind: ExhibitionKind;
  url: string | null;

  /** Wave 1. Set only when the show has its own page (story blocks or an about text). */
  slug?: string | null;
  /** Wave 1. Featured shows appear as cards above the history list. */
  featured?: boolean;
  /**
   * Whether the show is also a line in the artist's own history. A CMS that
   * keeps featured shows apart from its CV lines (a featured record "is not
   * history") says false for a featured show with no line of its own. Unset
   * means the show is in the history.
   */
  history?: boolean;
  /** Wave 1. ISO dates. Status (upcoming, current, past) is worked out from them. */
  startDate?: string | null;
  endDate?: string | null;
  /** Wave 1. e.g. "Immersive experience". */
  format?: string | null;
  /** Wave 1. The event a show was part of, e.g. a biennale edition. */
  event?: string | null;
  /** Wave 1. */
  curator?: string | null;
  /** Wave 1. Short plain text for cards and the page hero. */
  description?: string | null;
  /** Wave 1. */
  aboutTitle?: string | null;
  /** Wave 1. */
  about?: RichText | null;
  /** Wave 1. */
  cover?: Asset | null;
  /** Wave 1. */
  tags?: string[];
  /** Wave 1. */
  virtualTourUrl?: string | null;
  /** Wave 1. */
  pressKitUrl?: string | null;
  /** Wave 1. */
  highlights?: string[];
  /** Wave 1. */
  story?: StoryBlock[];
  /** Wave 1. */
  seo?: Seo | null;
}

export interface Award {
  id: string;
  year: number;
  title: string;
  organization: string | null;
  /** e.g. "Winner", "Shortlist". */
  result: string | null;
  /** The award's official page. */
  url: string | null;

  /** Wave 1. Set only when the award has its own page. */
  slug?: string | null;
  /** Wave 1. */
  description?: string | null;
  /** Wave 1. */
  category?: string | null;
  /** Wave 1. e.g. "Silver award", or an amount. */
  prize?: string | null;
  /** Wave 1. */
  ceremonyLocation?: string | null;
  /** Wave 1. */
  pressReleaseUrl?: string | null;
  /** Wave 1. */
  cover?: Asset | null;
  /** Wave 1. The work, series or project the award was given for. */
  project?: RecordRef | null;
  /** Wave 1. */
  story?: StoryBlock[];
  /** Wave 1. */
  seo?: Seo | null;
}

/** Wave 1. */
export type PressKind = 'article' | 'video' | 'podcast';

export interface PressItem {
  id: string;
  year: number;
  /** ISO date when known. */
  date: string | null;
  title: string;
  outlet: string;
  /** The original article. */
  url: string | null;

  /** Wave 1. Set when the item has an on-site page (its text, or a player). */
  slug?: string | null;
  /** Wave 1. Defaults to 'article'. */
  kind?: PressKind;
  /** Wave 1. e.g. "Interview", "Feature". */
  category?: string | null;
  /** Wave 1. */
  description?: string | null;
  /** Wave 1. */
  image?: Asset | null;
  /** Wave 1. */
  author?: string | null;
  /** Wave 1. Reading, watching or listening time. */
  minutes?: number | null;
  /** Wave 1. The full text, kept on-site against link rot. */
  body?: RichText | null;
  /** Wave 1. A YouTube or Vimeo page URL, for video items. */
  embedUrl?: string | null;
  /** Wave 1. An uploaded audio or video file. */
  mediaUrl?: string | null;
  /** Wave 1. */
  featured?: boolean;
  /** Wave 1. */
  tags?: string[];
  /** Wave 1. Series the piece discusses (Series.slug). */
  relatedSeries?: string[];
}

// ---------------------------------------------------------------------------
// Wave 1: story blocks (the documentation on every detail page)
// ---------------------------------------------------------------------------

export type StoryBlock =
  /** Title, text in 1 to 4 columns, an expandable "read more" and an optional link. The first one on a page sits beside the record's facts. */
  | {
      type: 'text';
      id: string;
      title: string | null;
      columns: 1 | 2 | 3 | 4;
      body: string | null;
      moreTitle: string | null;
      more: RichText | null;
      cta: ArtistLink | null;
    }
  /** One full-width image or video. */
  | { type: 'media'; id: string; asset: Asset }
  /** Installation or exhibition photos and videos with captions. */
  | { type: 'gallery'; id: string; title: string | null; aside: string | null; items: Asset[] }
  /** A titled documentary or making-of film. */
  | { type: 'film'; id: string; title: string | null; description: string | null; video: Asset }
  /** Press about this record (PressItem.id). */
  | { type: 'press'; id: string; title: string | null; pressIds: string[] }
  /** Process notes as steps, beside an image or video. */
  | {
      type: 'process';
      id: string;
      title: string | null;
      steps: { title: string; body: RichText }[];
      asset: Asset | null;
    }
  /** A dense grid of sketches or studies. */
  | { type: 'sketchbook'; id: string; title: string | null; items: Asset[] }
  /** Linked records (works shown in a show, series in a chapter), with optional intro paragraphs. */
  | {
      type: 'related';
      id: string;
      title: string | null;
      intro: { title: string | null; text: string }[];
      refs: RecordRef[];
    }
  /** A YouTube, Vimeo or X post that loads only when the visitor asks for it. */
  | {
      type: 'embed';
      id: string;
      provider: 'youtube' | 'vimeo' | 'x' | 'link';
      url: string;
      title: string;
      context: string | null;
      attribution: string | null;
      poster: Asset | null;
    }
  /** A full-width title section with a background. */
  | {
      type: 'chapter';
      id: string;
      title: string;
      text: string | null;
      background: Asset | null;
      labels: ArtistLink[];
    }
  /** Optional module (immersive-rooms): a poster that opens a 3D room showing the video. Without the module it renders as 'media'. */
  | { type: 'immersive'; id: string; title: string | null; poster: Asset | null; video: Asset; room: 'cylinder' | 'gallery' };

// ---------------------------------------------------------------------------
// Wave 1: records beyond tokens
// ---------------------------------------------------------------------------

/** Fields every non-token record shares. */
export interface RecordBase {
  slug: string;
  title: string;
  subtitle: string | null;
  /** Short plain text for cards, heroes and meta descriptions. */
  description: string | null;
  year: number | null;
  /** Card and hero image. */
  cover: Asset | null;
  tags: string[];
  featured: boolean;
  story: StoryBlock[];
  seo: Seo | null;
}

export interface Installation extends RecordBase {
  medium: string | null;
  dimensions: string | null;
  materials: string[];
  location: string | null;
  curator: string | null;
  photos: Asset[];
  videos: Asset[];
}

/** An immersive or virtual experience. Listed with installations. */
export interface Immersive extends RecordBase {
  platform: string | null;
  /** Free text, e.g. "12 min". */
  duration: string | null;
  status: string | null;
  /** ISO date. */
  date: string | null;
  curator: string | null;
  experienceUrl: string | null;
  /** What a visitor needs, e.g. "VR headset". */
  requirements: string | null;
  photos: Asset[];
  videos: Asset[];
}

/** A physical or phygital work. */
export interface PhysicalWork extends RecordBase {
  medium: string | null;
  dimensions: string | null;
  materials: string[];
  location: string | null;
  /** e.g. "Available", "Private collection". Never a price. */
  availability: string | null;
  seriesSlug: string | null;
  /** The digital works it is made from (Work.id). */
  workIds: string[];
}

export interface Collaboration extends RecordBase {
  /** e.g. "Brand", "Institution", "Licensing". */
  kind: string | null;
  status: string | null;
  /** ISO date. */
  date: string | null;
  partners: { name: string; role: string | null; url: string | null }[];
  highlights: string[];
  projectUrl: string | null;
  about: RichText | null;
  photos: Asset[];
  videos: Asset[];
}

/** A paper, essay or text by the artist. */
export interface Writing extends RecordBase {
  authors: string[];
  abstract: RichText | null;
  body: RichText | null;
  /** Journal, conference or publisher. */
  publishedIn: string | null;
  /** ISO date. */
  publishedAt: string | null;
  category: string | null;
  doi: string | null;
  pdfUrl: string | null;
  originalUrl: string | null;
  references: string[];
}

export interface DropPhase {
  name: string;
  /** ISO date-time. */
  startsAt: string | null;
  supply: number | null;
  price: { amount: number; currency: string } | null;
  /** Who may mint, in plain words, e.g. "Holders of an earlier series". */
  audience: string | null;
}

/**
 * An announced release. Its status (announced, scheduled, live, ended) is
 * worked out from the dates at render time, never stored.
 */
export interface Drop extends RecordBase {
  /** The series this drop releases, once it exists. */
  seriesSlug: string | null;
  /** The artist's label, e.g. "Open edition", "Auction". */
  kind: string | null;
  /** ISO date-times. Null startsAt reads "Date to be announced". */
  startsAt: string | null;
  endsAt: string | null;
  chain: Chain | null;
  contract: string | null;
  standard: TokenStandard | null;
  editionSize: number | null;
  platform: string | null;
  marketUrl: string | null;
  mintUrl: string | null;
  phases: DropPhase[];
  /** Extras for collectors, one line each. */
  perks: string[];
  /** Show a notify-me form; sign-ups are tagged with the drop's slug. */
  notify: boolean;
}

// ---------------------------------------------------------------------------
// Wave 1: home page, commissions page and CV extras
// ---------------------------------------------------------------------------

export interface Stat {
  label: string;
  /** Free text. Tokens such as {{artworks}} become live counts (see CatalogueCounts). */
  value: string;
  description: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  description: string | null;
  /** ISO date. */
  date: string | null;
  image: Asset | null;
  url: string | null;
}

/**
 * A show, talk or fair date for the home page. Its status (upcoming, on now,
 * past) is worked out from the dates, so a past event never reads "upcoming".
 * Named SiteEvent so it never shadows the DOM Event type.
 */
export interface SiteEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** ISO dates. */
  startDate: string | null;
  endDate: string | null;
  image: Asset | null;
  url: string | null;
}

/** A client, partner or institution with a logo. */
export interface Client {
  name: string;
  logo: Asset | null;
  url: string | null;
}

export type LandingSectionId = 'hero' | 'showreel' | 'stats' | 'featured' | 'catalogue' | 'partners' | 'news';

/** One home page section: its order in Landing.sections is its order on the page. */
export interface LandingSection {
  id: LandingSectionId;
  /** Overrides the default heading. */
  title: string | null;
  enabled: boolean;
}

export interface Landing {
  sections: LandingSection[];
  hero: {
    eyebrow: string | null;
    /** Line breaks are kept. */
    headline: string;
    subtitle: string | null;
    primaryCta: ArtistLink | null;
    secondaryCta: ArtistLink | null;
  };
  /** Studio clock and rotating practice keywords. Null hides it. */
  /**
   * `timezone` is an IANA zone. Null when the install has not named one: the
   * clock is then hidden rather than shown in UTC beside a city that is not
   * in it.
   */
  ticker: { timezone: string | null; city: string | null; coordinates: string | null; phrases: string[] } | null;
  showreel: { video: Asset; poster: Asset | null } | null;
  /** Up to six. */
  stats: Stat[];
  /** Hand-picked records of any type, up to six. */
  featured: RecordRef[];
  partners: Client[];
  announcements: Announcement[];
  events: SiteEvent[];
  newsletter: { title: string; description: string | null } | null;
}

export interface Service {
  title: string;
  description: string | null;
  items: string[];
}

/** The commissions page (optional module 'commissions'). */
export interface CommissionsPage {
  title: string;
  description: string | null;
  /** "Start a project": a mailto: or a form URL. */
  cta: ArtistLink | null;
  /** Collaboration slugs to feature. Empty means the newest collaborations. */
  featured: string[];
  clients: Client[];
  services: Service[];
}

export interface CvRole {
  title: string;
  organization: string | null;
  location: string | null;
  /** ISO dates. A null endDate reads "Present". */
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  highlights: string[];
}

export interface CvEducation {
  title: string;
  institution: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}

export type SkillCategory = 'technical' | 'software' | 'artistic' | 'conceptual' | 'other';

export interface CvSkill {
  name: string;
  category: SkillCategory;
}

/** CV sections beyond exhibitions, awards and press. */
export interface Cv {
  experience: CvRole[];
  education: CvEducation[];
  skills: CvSkill[];
  /** ISO date shown as "Updated ...". Null hides the line. */
  updatedAt: string | null;
  /** A prepared PDF; when null the page offers print-to-PDF. */
  pdfUrl: string | null;
}

// ---------------------------------------------------------------------------
// Wave 1: site settings
// ---------------------------------------------------------------------------

/** Parts of the site an install can switch on or off. */
export type ModuleId =
  | 'showreel'
  | 'ticker'
  | 'partners'
  | 'news'
  | 'newsletter'
  | 'drops'
  | 'commissions'
  | 'writings'
  | 'immersive-rooms'
  // Wave 2 and 3: listed so settings files stay stable; off until those waves ship.
  | 'collectors'
  | 'insights'
  | 'store';

export interface SiteSettings {
  /** Canonical origin, e.g. https://example.art. Sitemap, canonical URLs and share cards use it. */
  siteUrl: string;
  /** IANA zone for the studio clock and event dates, e.g. America/Los_Angeles. */
  timezone: string | null;
  modules: Partial<Record<ModuleId, boolean>>;
  /** Run interactive HTML works live in a sandboxed frame. Off by default. */
  liveHtml: boolean;
  /** Show the current holder's name on work pages. Off by default, for collectors' privacy. */
  showOwners: boolean;
  /**
   * Publish a page per wallet at /collector/<address>, listing everything
   * that wallet holds.
   *
   * Off by default, and deliberately separate from `showOwners`. A rank and
   * a truncated address on a leaderboard is a fact about the catalogue; a
   * page that maps one wallet to the complete list of what it holds, under
   * its ENS name, findable by anyone with the link, is a profile of a
   * person, and publishing it is the artist's decision to make rather than
   * this theme's. With it off, the directory and the leaderboard still work
   * and a collector can still open their own page.
   */
  publicCollectorProfiles?: boolean;
  analytics: { provider: 'none' | 'ga4' | 'plausible' | 'umami'; id: string | null };
  maintenance: { enabled: boolean; message: string | null };
  /** Let AI crawlers read the site (robots.txt). */
  allowAiCrawlers: boolean;
  /** Old URLs to send on, e.g. /contact to /commissions. */
  redirects: { from: string; to: string; permanent: boolean }[];
  legal: { privacy: RichText | null; terms: RichText | null; updatedAt: string | null };
  /**
   * The artist's own names for parts of the site. `works` is what the /works
   * section and its every-token view are called in the menu, titles and
   * breadcrumbs, e.g. "Index". Left out, they read "Works" (see worksLabel()).
   */
  labels?: { works?: string | null };
}

/** Live counts that tokens in the bio and the home stats resolve to. Computed, never stored. */
export interface CatalogueCounts {
  /** Works a visitor can actually open. The same number the Works tile prints. */
  works: number;
  /**
   * What the contracts claim between them, which is larger than `works`
   * whenever the catalogue holds a sample of a big edition. Kept apart from
   * `works` so no page prints one number and labels it the other.
   */
  tokensOnChain: number;
  series: number;
  oneOfOnes: number;
  installations: number;
  exhibitions: number;
  soloExhibitions: number;
  groupExhibitions: number;
  collaborations: number;
  awards: number;
  writings: number;
  press: number;
  /** Distinct collectors the series report between them. */
  collectors: number;
}

// ---------------------------------------------------------------------------
// Wave 2: collectors, the guild and insights
// ---------------------------------------------------------------------------

/**
 * Everything below is computed from public, on-chain data, or from what the
 * artist wrote down. An install with no Alchemy key and no snapshot has none
 * of it, and every surface says so rather than inventing a number.
 *
 * Nothing here is a person's private record. An address is public on the
 * chain; a name, an avatar or an email is not, so a Collector carries only
 * what the chain, ENS or the artist's own settings already publish.
 */

/** A lowercase 0x address. Use normalizeAddress() from src/lib/chain before storing one. */
export type Address = string;

/** Who is looking. The artist owns the install; everyone signed in is a collector. */
export type SessionRole = 'collector' | 'owner';

/**
 * A signed-in visitor, or a wallet the snapshot knows about. Built from the
 * address alone: `ens` and `avatar` come from public ENS records, `label`
 * from the artist's own notes in settings, never from a sign-up form.
 */
export interface Collector {
  address: Address;
  chain: Chain;
  /** Public ENS (or other name-service) name, when the install resolves one. */
  ens?: string | null;
  /** The artist's own name for a wallet, e.g. "The Vellum Collection". Optional and off by default. */
  label?: string | null;
  /** Public avatar from the name-service record. */
  avatar?: string | null;
  /** True when this address is on the owner allow-list. */
  isOwner?: boolean;
  /** ISO date of the first acquisition the snapshot can see. */
  firstSeenAt?: string | null;
  /** ISO date of the most recent event involving this address. */
  lastSeenAt?: string | null;
}

/** One token an address holds, resolved against the catalogue where possible. */
export interface Holding {
  /** chain:contract:tokenId, the same id Work.id carries. */
  workId: string;
  chain: Chain;
  contract: string;
  tokenId: string;
  standard: TokenStandard;
  /** Editions held of this token. 1 for ERC-721. */
  balance: number;
  /** The catalogue series this token belongs to, when the install has one. */
  seriesSlug?: string | null;
  /** ISO date of the transfer that brought it in, when the event history reaches back that far. */
  acquiredAt?: string | null;
  /** The transaction that brought it in. */
  acquiredTx?: string | null;
  /** A token the reader found on a contract the catalogue does not carry. */
  unlisted?: boolean;
}

/**
 * What an address's holdings add up to. Counts are exact; anything involving
 * a price is only as good as the events the snapshot holds, so every money
 * field is optional and a surface that has none says "not available" rather
 * than zero.
 */
export interface CollectorStats {
  address: Address;
  worksOwned: number;
  editionsOwned: number;
  seriesCount: number;
  /** ISO dates from the event history. */
  firstAcquiredAt: string | null;
  lastAcquiredAt: string | null;
  /** Series slug to number of works held, largest first when a page sorts it. */
  bySeries: { seriesSlug: string; works: number }[];
  /** Sum of the prices paid, in the snapshot's settlement currency. Absent when the events carry no prices. */
  spend?: TokenAmount | null;
  /** Sum of the prices received for works sold on. */
  proceeds?: TokenAmount | null;
  /** Guild score, when the install computes one. */
  score?: number | null;
  /** Tier.id. */
  tierId?: string | null;
  /** Badge.id values earned. */
  badgeIds?: string[];
  /** 1-based position on the leaderboard. */
  rank?: number | null;
}

/** A guild rank the artist defines. Membership is a percentile of the score, or hand-set. */
export interface Tier {
  id: string;
  name: string;
  description: string | null;
  /** A token name from the theme's palette ("chart-1"), never a raw hex value. */
  color?: string | null;
  /** An icon name from the theme's icon set. */
  icon?: string | null;
  /** 0 to 100. A tier with no range is only ever assigned by hand. */
  minPercentile?: number | null;
  maxPercentile?: number | null;
  /** Plain-words requirement, e.g. "Top 5 percent of collectors". */
  requirements?: string | null;
  benefits: string[];
  /** Early access this tier grants, in plain words. */
  earlyAccess?: string | null;
  /** Position in the ladder, lowest first. */
  order?: number | null;
}

export interface BadgeCategory {
  id: string;
  name: string;
  description: string | null;
  order?: number | null;
}

/** Something an address did that the snapshot can see, named by the artist. */
export interface Badge {
  id: string;
  name: string;
  description: string | null;
  /** The signal that awards it, e.g. "early-supporter". Hand-awarded badges have none. */
  key?: string | null;
  categoryId?: string | null;
  icon?: string | null;
  color?: string | null;
  /** False for a badge that marks something unflattering. Default true. */
  positive?: boolean;
  /** How it is earned, in plain words. */
  howItWorks?: string | null;
}

/** One row of the public leaderboard. */
export interface LeaderboardRow {
  rank: number;
  address: Address;
  ens?: string | null;
  label?: string | null;
  worksOwned: number;
  seriesCount: number;
  firstAcquiredAt?: string | null;
  lastAcquiredAt?: string | null;
  score?: number | null;
  tierId?: string | null;
  badgeIds?: string[];
}

export type ActivityEventType = 'mint' | 'transfer' | 'sale' | 'burn';

/**
 * One public on-chain event. Prices are present only for events the reader
 * could price from the transaction itself; a sale whose price the install
 * cannot see is a 'transfer', never a sale with a zero price.
 */
export interface ActivityEvent {
  /** txHash:logIndex, so replaying a snapshot cannot duplicate a row. */
  id: string;
  type: ActivityEventType;
  chain: Chain;
  contract: string;
  tokenId: string;
  /** chain:contract:tokenId, when the token is in the catalogue. */
  workId?: string | null;
  seriesSlug?: string | null;
  from: Address | null;
  to: Address | null;
  quantity: number;
  /** ISO date-time of the block. */
  at: string;
  blockNumber?: number | null;
  txHash: string;
  /** Value moved with the transaction, when there was one. */
  price?: TokenAmount | null;
  /** Named only when the install can tell, e.g. from a known marketplace contract. */
  marketplace?: string | null;
}

/** An amount of a chain's own currency or a token, kept exact as a decimal string. */
export interface TokenAmount {
  /** The raw integer amount, as a string, so no precision is lost. */
  raw: string;
  decimals: number;
  /** "ETH", "WETH", "XTZ". */
  symbol: string;
  /** Converted value, only when the install holds a rate it can name. */
  usd?: number | null;
}

/** What one series traded for, computed from the events in the snapshot. */
export interface SalesStats {
  seriesSlug: string;
  /** Wallets holding at least one work of the series. */
  holders: number;
  /** Tokens the reader could see. */
  tokens: number;
  sales: number;
  transfers: number;
  mints: number;
  /** Sum of the priced sales. Absent when none of the events carried a price. */
  volume?: TokenAmount | null;
  /** Lowest and highest priced sale. */
  low?: TokenAmount | null;
  high?: TokenAmount | null;
  /** ISO date of the first and last event. */
  firstEventAt?: string | null;
  lastEventAt?: string | null;
}

/**
 * The insights pages in one object. Every field is optional: a surface
 * renders what the snapshot could compute and says plainly what it could
 * not, so a partial snapshot is still worth showing.
 */
export interface InsightsSummary {
  /** ISO date-time the snapshot was taken. */
  computedAt: string;
  /** Wallets holding at least one work now. */
  collectors: number;
  /** Everyone who has ever held one, including those who sold. */
  allTimeCollectors: number;
  works: number;
  series: number;
  sales: number;
  mints: number;
  transfers: number;
  volume?: TokenAmount | null;
  /** Per-series rows, for the tables and charts. */
  bySeries: SalesStats[];
  /** Works with the most events, most first. */
  mostTraded?: { workId: string; seriesSlug: string | null; tokenId: string; events: number; sales: number }[];
  /** Holdings per wallet, bucketed: "1", "2 to 5", "6 or more". */
  holdingDistribution?: { bucket: string; wallets: number }[];
  /** Events per month, oldest first, for the activity chart. */
  monthly?: { month: string; sales: number; mints: number; transfers: number }[];
  /** What this snapshot could not see, in plain words, so a page can say it. */
  gaps?: string[];
}

/**
 * The file an install refreshes with `pnpm snapshot:chain`. Public data
 * only: addresses, token ids, block numbers and transaction hashes.
 */
export interface ChainSnapshot {
  /** ISO date-time. */
  computedAt: string;
  /** Which contracts were read, and how far. */
  contracts: {
    chain: Chain;
    address: string;
    seriesSlug: string | null;
    /** Highest block the reader covered. */
    toBlock?: number | null;
    /** True when the run hit its event cap before the contract's history ran out. */
    truncated?: boolean;
  }[];
  holders: { address: Address; ens?: string | null; holdings: Holding[] }[];
  events: ActivityEvent[];
  leaderboard: LeaderboardRow[];
  insights: InsightsSummary | null;
}

/** Tiers and badges, which are the artist's writing rather than chain data. */
export interface GuildData {
  /** Page copy: what the guild is and how to join. */
  title?: string | null;
  description?: string | null;
  intro?: RichText | null;
  tiers: Tier[];
  badges: Badge[];
  badgeCategories: BadgeCategory[];
  /** Blocks of "how it works", each a heading and a paragraph. */
  howItWorks?: { title: string; description: string | null }[];
  /** True when the install ranks collectors at all. Off means tiers are hand-set. */
  scoring?: boolean;
}

/** A note from the artist to their collectors. Public: it is shown on the activity feed. */
export interface CollectorUpdate {
  id: string;
  title: string;
  body: string | null;
  /** ISO date. */
  date: string | null;
  url: string | null;
  /** Only collectors of this series see it. Null means everyone. */
  seriesSlug?: string | null;
}

// ---------------------------------------------------------------------------
// Wave 3: the store
// ---------------------------------------------------------------------------

/**
 * Money is always an integer in the currency's minor unit (cents for USD,
 * pence for GBP, and the currency's own exponent elsewhere), so no price is
 * ever a float. src/lib/money.ts formats it and converts to and from major
 * units; nothing else should do that arithmetic.
 */
export interface Money {
  /** Integer, in the currency's minor unit. */
  amount: number;
  /** ISO 4217, uppercase. */
  currency: string;
}

/** A postal address. Named so it never reads as a wallet address. */
export interface PostalAddress {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  /** ISO 3166-1 alpha-2, uppercase. */
  country: string;
  phone?: string | null;
}

export interface ProductCategory {
  slug: string;
  name: string;
  description: string | null;
  cover?: Asset | null;
  parentSlug?: string | null;
  featured?: boolean;
}

/** A themed group of products, with the artist's text around it. */
export interface StoreCollection {
  slug: string;
  name: string;
  description: string | null;
  cover?: Asset | null;
  /** The artist's own words, shown as tabs on the collection page. */
  statement?: string | null;
  vision?: string | null;
  process?: string | null;
  year?: number | null;
  medium?: string | null;
  featured?: boolean;
}

/** How a product reaches the buyer. 'pod' is printed on demand by a provider. */
export type FulfilmentKind = 'ship' | 'pod' | 'digital' | 'pickup';

/**
 * One buyable variation: a size, a frame, a paper. A product with no choices
 * still has exactly one variant, so a cart line always points at a variant
 * and the price never has to be assembled at checkout.
 */
export interface ProductVariant {
  id: string;
  name: string;
  /** The choices this variant is, e.g. { Size: "50 x 70 cm", Frame: "Oak" }. */
  options?: Record<string, string>;
  price: Money;
  /** The price this replaced, for a "was" line. */
  compareAtPrice?: Money | null;
  sku?: string | null;
  /** Null when the install does not track stock for this variant. */
  stock?: number | null;
  /** At or below this, the page says "only a few left". */
  lowStockAt?: number | null;
  /** Grams, for shipping rates. */
  weight?: number | null;
  /** Millimetres. */
  dimensions?: { length: number; width: number; height: number } | null;
  /** The provider's own id, when this variant is printed on demand. */
  podSku?: string | null;
  available?: boolean;
}

export interface Product {
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string | null;
  /** The long text on the product page. */
  body?: RichText | null;
  categorySlug?: string | null;
  collectionSlug?: string | null;
  cover: Asset | null;
  gallery: Asset[];
  variants: ProductVariant[];
  fulfilment: FulfilmentKind;
  /** The catalogue record this object is made from. */
  work?: RecordRef | null;
  edition?: { total: number | null; numbered: boolean; certificate: boolean; signed: boolean } | null;
  /** Rows for the details table: "Paper", "Hahnemuhle Photo Rag". */
  specs?: Fact[];
  highlights?: string[];
  materials?: string | null;
  year?: number | null;
  /** Free text, e.g. "Ships in 5 to 7 days". */
  leadTime?: string | null;
  shippingNote?: string | null;
  featured?: boolean;
  /** Left out of listings, still reachable by URL. */
  hidden?: boolean;
  tags?: string[];
  seo?: Seo | null;
}

/** A physical object made from a token the buyer already owns. */
export interface PhygitalProduct extends Product {
  /** Only holders of these series may order it. Empty means any holder. */
  requiresSeriesSlugs?: string[];
  /** True when the buyer picks which of their works it is made from. */
  pickWork?: boolean;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string | null;
  price: Money;
  /** Order subtotal at or above which this method costs nothing. */
  freeAbove?: Money | null;
  /** Business days. */
  estimatedDays?: { min: number | null; max: number | null } | null;
  /** ISO 3166-1 alpha-2 codes this method serves. Empty means everywhere. */
  countries?: string[];
  /** Grams. A basket heavier than this cannot use the method. */
  maxWeight?: number | null;
  order?: number | null;
}

/** A line in the browser's cart. The price is never read from here: the server resolves it. */
export interface CartLine {
  productSlug: string;
  variantId: string;
  quantity: number;
  /** For a phygital order: the buyer's own work the object is made from. */
  workId?: string | null;
}

/** What the server worked out a cart is worth. Every figure comes from the fixtures. */
export interface CartTotals {
  currency: string;
  lines: {
    line: CartLine;
    title: string;
    variantName: string;
    unitPrice: Money;
    lineTotal: Money;
    image: Asset | null;
    /** Set when the line could not be priced: an unknown product, or one out of stock. */
    problem?: string | null;
    /**
     * The same thing in two or three words, for the line itself.
     *
     * The long sentence names the product, which the row above it already
     * does, so printing it against the row said the title twice. The alert
     * beside the total gets the sentence; the row gets "Out of stock".
     */
    problemShort?: string | null;
    /**
     * How many of this variant could actually be had, when that is known and
     * smaller than the quantity asked for. A cart that says "out of stock"
     * when four are on the shelf sends a buyer away from a sale they could
     * have completed, so the number is carried and the page offers it.
     */
    available?: number | null;
  }[];
  subtotal: Money;
  shipping: Money;
  total: Money;
  /** Lines the server dropped, so the page can say why. */
  problems: string[];
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'failed';

export interface OrderLine {
  productSlug: string;
  variantId: string;
  title: string;
  variantName: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  workId?: string | null;
  podSku?: string | null;
}

/**
 * A persisted order. The order store owns these (src/lib/store/orders.ts);
 * nothing else writes one, and every money field was computed on the server
 * from the fixtures.
 */
export interface Order {
  id: string;
  /** What the buyer is told, e.g. "R-2026-0007". */
  number: string;
  status: OrderStatus;
  /** ISO date-times. */
  createdAt: string;
  updatedAt: string;
  lines: OrderLine[];
  subtotal: Money;
  shipping: Money;
  total: Money;
  shippingMethodId: string | null;
  shippingAddress: PostalAddress | null;
  /** The buyer's contact address, which is personal data: never in a snapshot, never in the public API. */
  email: string | null;
  /** The wallet that was signed in when the order was placed. */
  address?: Address | null;
  payment: {
    provider: string;
    /** The provider's session id, which is what checkout was created with. */
    reference: string | null;
    /**
     * The provider's payment intent, recorded when the payment succeeds.
     *
     * A refund names a charge and an intent, never the checkout session, so
     * without this an order can be paid and then refunded in the provider's
     * dashboard with nothing on this install ever hearing about it.
     */
    intent?: string | null;
    status: 'unpaid' | 'paid' | 'refunded' | 'failed';
    paidAt?: string | null;
  };
  fulfilment?: {
    provider?: string | null;
    providerOrderId?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    carrier?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
  } | null;
  /** What the buyer wrote at checkout. */
  note?: string | null;
  /** Free text the artist keeps. Never shown to the buyer. */
  internalNote?: string | null;
}

export type CommissionKind = 'digital' | 'phygital';

export type CommissionStatus = 'new' | 'reviewing' | 'quoted' | 'accepted' | 'declined' | 'in_progress' | 'delivered';

/** What a visitor sends: a brief, not an order. No money changes hands here. */
export interface CommissionRequest {
  kind: CommissionKind;
  /** The artist's own list, e.g. "Generative print", "Sculpture". */
  artefact?: string | null;
  brief: string;
  /** Answers to the artist's questions, as asked. */
  specs?: Record<string, string>;
  /** Links the visitor offered as references. */
  references?: string[];
  /** For a phygital commission: the buyer's own works. */
  workIds?: string[];
  budget?: Money | null;
  /** ISO date the visitor hopes for. */
  deadline?: string | null;
  email: string | null;
  address?: Address | null;
  shippingAddress?: PostalAddress | null;
}

/** A request the install has kept, with what happened to it. */
export interface Commission extends CommissionRequest {
  id: string;
  number: string;
  status: CommissionStatus;
  createdAt: string;
  updatedAt: string;
  /** What the artist quoted, when they have. */
  quote?: Money | null;
  internalNote?: string | null;
  /**
   * Whether this install checked that the signed-in wallet really holds the
   * works the brief names.
   *
   * The form accepts any workId anyone sends, because a visitor who is not
   * signed in has to be able to name a work they hold somewhere else. So the
   * claim is recorded as a claim: 'verified' when the wallet was signed in
   * and the install could see those tokens in it, 'unverified' when it could
   * not, and absent when the brief names no work at all. The artist reads a
   * flag rather than an unchecked assertion.
   */
  workIdsChecked?: 'verified' | 'unverified' | null;
}

/** A print-on-demand service. Integration is a stub: the shape is here, the calls are not. */
export interface PodProvider {
  id: string;
  name: string;
  /** The provider's API root. The key itself is an env var, never data. */
  apiBaseUrl?: string | null;
  /** Lower goes first when more than one can make a product. */
  priority?: number | null;
  enabled: boolean;
  /** What it can make, in the artist's words. */
  capabilities?: string[];
}

/** What an install sells, in one object. Absent when the store module is off. */
export interface StoreData {
  /** ISO 4217. Every price in the fixtures is in this currency. */
  currency: string;
  products: Product[];
  phygitals: PhygitalProduct[];
  categories: ProductCategory[];
  collections: StoreCollection[];
  shippingMethods: ShippingMethod[];
  podProviders: PodProvider[];
  /** The store front's own copy. */
  page?: { title: string | null; description: string | null; featured: string[] } | null;
  /** The commissions ordering flow: what the artist offers and what they ask. */
  commissionForm?: {
    kinds: { kind: CommissionKind; title: string; description: string | null; artefacts: string[] }[];
    /** Questions asked in the brief, in order. */
    questions: { id: string; label: string; help: string | null; required: boolean }[];
  } | null;
}

// ---------------------------------------------------------------------------
// The whole site
// ---------------------------------------------------------------------------

export interface SiteData {
  artist: Artist;
  series: Series[];
  works: Work[];
  exhibitions: Exhibition[];
  awards: Award[];
  press: PressItem[];

  /** Wave 1 from here. The loader fills a missing array with [] and a missing object with null or defaults. */
  installations: Installation[];
  immersives: Immersive[];
  physicalWorks: PhysicalWork[];
  collaborations: Collaboration[];
  writings: Writing[];
  drops: Drop[];
  landing: Landing | null;
  commissions: CommissionsPage | null;
  cv: Cv | null;
  /** SEO per page key: 'home', 'works', 'about', 'cv', 'press', 'exhibitions', 'installations', ... */
  pages: Record<string, Seo>;
  settings: SiteSettings;

  /**
   * Wave 2 and Wave 3, all optional. A fixture written before these existed
   * loads unchanged, and an install that keeps them in their own files
   * (local/chain.json, local/guild.json, local/store.json) leaves them out
   * here: the loader looks in both places. Absent means the surface renders
   * its "nothing to show yet" state, never a fabricated one.
   */
  chain?: ChainSnapshot | null;
  guild?: GuildData | null;
  store?: StoreData | null;
  /** Notes from the artist to their collectors. */
  collectorUpdates?: CollectorUpdate[];
}


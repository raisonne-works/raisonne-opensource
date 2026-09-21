/**
 * Turning a published page's address into a player address, for the two
 * providers a page can frame without loading any of their code first.
 *
 * YouTube goes through its no-cookie domain and Vimeo through its player
 * domain. Anything else (an X post, a site of its own) has no entry here on
 * purpose: those need a third-party script to render, and a catalogue page
 * should not run one. They are links out instead.
 *
 * Pure, so both the story block and the press page use the same rules.
 */

export type EmbedProvider = 'youtube' | 'vimeo' | 'x' | 'link';

/** The id in a YouTube watch, share, shorts or embed URL. */
function youtubeId(url: URL): string | null {
  if (url.hostname.endsWith('youtu.be')) return url.pathname.slice(1) || null;
  if (!url.hostname.endsWith('youtube.com') && !url.hostname.endsWith('youtube-nocookie.com')) return null;
  const v = url.searchParams.get('v');
  if (v) return v;
  const match = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/.exec(url.pathname);
  return match ? match[1] : null;
}

/** The numeric id of a Vimeo video. */
function vimeoId(url: URL): string | null {
  if (!url.hostname.endsWith('vimeo.com')) return null;
  const match = /\/(\d+)/.exec(url.pathname);
  return match ? match[1] : null;
}

/**
 * The player URL for a page, or null when it cannot be framed. `provider` is
 * what the record claims; the URL itself decides, so a mislabelled record
 * still plays or still links out rather than framing nothing.
 */
export function embedPlayerUrl(raw: string, provider?: EmbedProvider): string | null {
  if (provider === 'x') return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const youtube = youtubeId(url);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}?autoplay=1&rel=0`;

  const vimeo = vimeoId(url);
  if (vimeo) return `https://player.vimeo.com/video/${encodeURIComponent(vimeo)}?autoplay=1`;

  return null;
}

/** What the player is called, for the line that says nothing loads until play is pressed. */
export const EMBED_PROVIDER_LABEL: Record<EmbedProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  x: 'X',
  link: 'the source',
};

/** What a video iframe is allowed to do. Kept in one place so both players agree. */
export const EMBED_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';

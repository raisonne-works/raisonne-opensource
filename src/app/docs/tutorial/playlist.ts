/** Playlist metadata for the how-to-build tutorial film (15 chapters). */
export type TutorialPart = {
  n: string;
  slug: string;
  title: string;
  /** Seconds in the full film */
  start: number;
  end: number;
  duration: number;
  file: string;
  poster: string;
};

export const TUTORIAL_BASE = '/docs/tutorial';

export const TUTORIAL_PLAYLIST = {
  title: 'How to build a catalogue raisonné',
  subtitle: 'A to Z — domain, server, code, import, live.',
  /** Approximate total with draft VO; re-export after real takes. */
  duration: 641.26,
  repo: 'https://github.com/orkhan-art-web/raisonne-os',
  parts: [
    {
      n: '00',
      slug: 'what-you-are-building',
      title: 'What you are building',
      start: 0,
      end: 48.97,
      duration: 48.97,
      file: '00-what-you-are-building.mp4',
      poster: '00-what-you-are-building.jpg',
    },
    {
      n: '01',
      slug: 'the-accounts-you-need',
      title: 'The accounts you need',
      start: 48.97,
      end: 109.82,
      duration: 60.85,
      file: '01-the-accounts-you-need.mp4',
      poster: '01-the-accounts-you-need.jpg',
    },
    {
      n: '02',
      slug: 'the-domain',
      title: 'The domain',
      start: 109.82,
      end: 139.79,
      duration: 29.97,
      file: '02-the-domain.mp4',
      poster: '02-the-domain.jpg',
    },
    {
      n: '03',
      slug: 'cloudflare-the-layer-in-front',
      title: 'Cloudflare, the layer in front',
      start: 139.79,
      end: 179.02,
      duration: 39.23,
      file: '03-cloudflare-the-layer-in-front.mp4',
      poster: '03-cloudflare-the-layer-in-front.jpg',
    },
    {
      n: '04',
      slug: 'the-server',
      title: 'The server',
      start: 179.02,
      end: 236.25,
      duration: 57.23,
      file: '04-the-server.mp4',
      poster: '04-the-server.jpg',
    },
    {
      n: '05',
      slug: 'the-code',
      title: 'The code',
      start: 236.25,
      end: 282.6,
      duration: 46.35,
      file: '05-the-code.mp4',
      poster: '05-the-code.jpg',
    },
    {
      n: '06',
      slug: 'first-run',
      title: 'First run',
      start: 282.6,
      end: 313.55,
      duration: 30.95,
      file: '06-first-run.mp4',
      poster: '06-first-run.jpg',
    },
    {
      n: '07',
      slug: 'your-works',
      title: 'Your works',
      start: 313.55,
      end: 391.65,
      duration: 78.1,
      file: '07-your-works.mp4',
      poster: '07-your-works.jpg',
    },
    {
      n: '08',
      slug: 'making-it-yours',
      title: 'Making it yours',
      start: 391.65,
      end: 426.03,
      duration: 34.38,
      file: '08-making-it-yours.mp4',
      poster: '08-making-it-yours.jpg',
    },
    {
      n: '09',
      slug: 'keys-and-settings',
      title: 'Keys and settings',
      start: 426.03,
      end: 483.9,
      duration: 57.87,
      file: '09-keys-and-settings.mp4',
      poster: '09-keys-and-settings.jpg',
    },
    {
      n: '10',
      slug: 'the-newsletter',
      title: 'The newsletter',
      start: 483.9,
      end: 517.23,
      duration: 33.33,
      file: '10-the-newsletter.mp4',
      poster: '10-the-newsletter.jpg',
    },
    {
      n: '11',
      slug: 'going-live',
      title: 'Going live',
      start: 517.23,
      end: 559.06,
      duration: 41.83,
      file: '11-going-live.mp4',
      poster: '11-going-live.jpg',
    },
    {
      n: '12',
      slug: 'selling-if-you-want-to',
      title: 'Selling, if you want to',
      start: 559.06,
      end: 595.79,
      duration: 36.73,
      file: '12-selling-if-you-want-to.mp4',
      poster: '12-selling-if-you-want-to.jpg',
    },
    {
      n: '13',
      slug: 'keeping-it',
      title: 'Keeping it',
      start: 595.79,
      end: 623.64,
      duration: 27.85,
      file: '13-keeping-it.mp4',
      poster: '13-keeping-it.jpg',
    },
    {
      n: '14',
      slug: 'the-end',
      title: 'The end',
      start: 623.64,
      end: 641.26,
      duration: 17.62,
      file: '14-the-end.mp4',
      poster: '14-the-end.jpg',
    },
  ] satisfies TutorialPart[],
} as const;

export function partSrc(part: TutorialPart) {
  return `${TUTORIAL_BASE}/parts/${part.file}`;
}

export function partPoster(part: TutorialPart) {
  return `${TUTORIAL_BASE}/posters/${part.poster}`;
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `0:${r.toString().padStart(2, '0')}`;
}

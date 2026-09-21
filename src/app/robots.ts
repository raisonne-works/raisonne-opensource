import type { MetadataRoute } from 'next';

import { getSiteData } from '@/fixtures';
import { siteOrigin } from '@/lib/seo/urls';

/**
 * What crawlers may read.
 *
 * The important part is what is not blocked. Nothing under /_next/ is
 * disallowed: the pages need that JavaScript to render, and every optimized
 * image on the site is served from /_next/image, so blocking it would make
 * the whole image corpus uncrawlable. For an artist, image search is the
 * channel that matters most.
 *
 * AI crawlers are a setting, not a policy. settings.allowAiCrawlers decides,
 * and it is true by default: an artist who would rather assistants described
 * their work from marketplace listings than from their own pages can switch
 * it off, and this file is the one place that changes.
 */

/**
 * The agents that read pages for a model rather than for a search result:
 * training crawlers, retrieval agents and the assistants' own fetchers. Named
 * individually because that is the only thing they honour.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'Timpibot',
  'omgili',
  'YouBot',
];

/** Never worth indexing: the write endpoint, the machine-readable copy, the artist's tools. */
const PRIVATE_PATHS = ['/api/', '/import', '/design-system', '/maintenance'];

type RobotRule = Extract<MetadataRoute.Robots['rules'], unknown[]>[number];

export default function robots(): MetadataRoute.Robots {
  const { settings } = getSiteData();
  const origin = siteOrigin(settings);

  // While the site is closed, nothing should be indexed at all.
  if (settings.maintenance.enabled) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  const rules: RobotRule[] = [{ userAgent: '*', allow: '/', disallow: PRIVATE_PATHS }];

  if (!settings.allowAiCrawlers) {
    rules.push({ userAgent: AI_CRAWLERS, disallow: '/' });
  }

  return {
    rules,
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}

import Script from 'next/script';

import { getSiteData } from '@/fixtures';

/**
 * The install's own analytics, if it wants any. Provider and id come from
 * settings.analytics, never from code, so a fork does not carry someone
 * else's measurement id.
 *
 * Nothing loads when the provider is 'none', which is the default, and
 * nothing loads while the site is in maintenance. Self-hosted Plausible and
 * Umami point somewhere else, so RAISONNE_ANALYTICS_HOST overrides the
 * hosted address.
 */

const HOSTS = {
  plausible: 'https://plausible.io',
  umami: 'https://cloud.umami.is',
} as const;

function host(provider: keyof typeof HOSTS): string {
  const custom = process.env.RAISONNE_ANALYTICS_HOST?.trim().replace(/\/+$/, '');
  return custom || HOSTS[provider];
}

export function SiteAnalytics() {
  const { analytics, maintenance } = getSiteData().settings;
  const id = analytics.id?.trim();
  if (analytics.provider === 'none' || !id) return null;
  if (maintenance.enabled) return null;

  if (analytics.provider === 'ga4') {
    return (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
        <Script id="raisonne-ga4" strategy="afterInteractive">
          {[
            'window.dataLayer = window.dataLayer || [];',
            'function gtag(){dataLayer.push(arguments);}',
            "gtag('js', new Date());",
            `gtag('config', ${JSON.stringify(id)});`,
          ].join('\n')}
        </Script>
      </>
    );
  }

  if (analytics.provider === 'plausible') {
    // Plausible's id is the domain it records under.
    return <Script src={`${host('plausible')}/js/script.js`} data-domain={id} strategy="afterInteractive" defer />;
  }

  return <Script src={`${host('umami')}/script.js`} data-website-id={id} strategy="afterInteractive" defer />;
}

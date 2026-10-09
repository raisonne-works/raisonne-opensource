import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { connection } from 'next/server';

import { AccountSlot } from '@/components/raisonne/auth/account-slot';
import { SiteJsonLd } from '@/components/raisonne/seo/json-ld';
import { SiteAnalytics } from '@/components/raisonne/seo/site-analytics';
import { SiteBreadcrumbs } from '@/components/raisonne/shell/site-breadcrumbs';
import { SiteFooter } from '@/components/raisonne/shell/site-footer';
import { SiteHeader } from '@/components/raisonne/shell/site-header';
import { SkinScript } from '@/components/raisonne/shell/skin-script';
import { siteNav } from '@/components/raisonne/shell/nav';
import { ThemeProvider } from '@/components/raisonne/shell/theme-provider';
import { CartSlot } from '@/components/raisonne/store/cart-slot';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getProducts, getSiteData, getSiteSource } from '@/fixtures';
import { isModuleEnabled, worksLabel } from '@/lib/records';
import { defaultMetadata } from '@/lib/seo/metadata';
import { ownerToolsEnabled } from '@/lib/tools';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export function generateMetadata(): Metadata {
  return defaultMetadata();
}

/**
 * The frame around every page: the skip link, the header with the grouped
 * navigation, the breadcrumb trail, the page itself, and the footer in
 * whichever of its three modes the route asks for.
 *
 * The navigation is worked out once here, from the install's own data, and
 * handed to both the header and the footer, so a section that does not exist
 * cannot be linked from either.
 */
export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // An install's fixture files are mounted and updated at run time. Waiting
  // for a request keeps the shell and its navigation in step with those
  // files instead of freezing the build-time fixture into the image.
  await connection();
  const data = getSiteData();
  const { artist, settings, landing } = data;
  // An install can keep its shop in a fixture of its own, which the pure nav
  // builder cannot read, so the count is read here and handed to it.
  const shopProducts = isModuleEnabled(settings, 'store') ? getProducts().length : 0;
  const groups = siteNav(data, { shopProducts });
  // The tools pages exist when ownerToolsEnabled(); whether they are linked
  // is now the session's business rather than a second variable. SiteFooter
  // renders the block inside OwnerOnly.
  const tools = ownerToolsEnabled();
  const demoData = getSiteSource() === 'demo';

  // One name per destination. The shop's title and the guild's are the
  // artist's to choose, so the trail says what the page says rather than
  // what the path segment spells: /shop titled "Store" under a crumb
  // reading "Shop" was the same page called two things in one viewport.
  const crumbLabels = {
    works: worksLabel(settings),
    ...(data.store?.page?.title ? { shop: data.store.page.title } : {}),
    ...(data.guild?.title ? { guild: data.guild.title } : {}),
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/* The worn pack's styles, after the app's own. Empty on skin zero. See /skin.css.
            A pack is mounted at run time, so this cannot be an import. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/skin.css" precedence="skin" />
        <SkinScript />
        <ThemeProvider>
          <TooltipProvider>
            <a
              href="#main"
              className="sr-only rounded-lg bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:ring-3 focus:ring-ring/50"
            >
              Skip to content
            </a>
            <SiteHeader
              artist={artist}
              groups={groups}
              account={<AccountSlot enabled={isModuleEnabled(settings, 'collectors')} />}
              cart={<CartSlot enabled={shopProducts > 0} />}
              packLinks={data.collaborations.length > 0 ? [{ href: '/collaborations', label: 'Collabs' }] : []}
            />
            <SiteBreadcrumbs labels={crumbLabels} />
            <main id="main" data-shell="main" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <SiteFooter
              artist={artist}
              groups={groups}
              settings={settings}
              newsletter={landing?.newsletter ?? null}
              ambientVideo={isModuleEnabled(settings, 'showreel') ? (landing?.showreel?.video.src ?? null) : null}
              tools={tools}
              demoData={demoData}
            />
            <Toaster />
            <SiteJsonLd />
            <SiteAnalytics />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import { type HeadingLevel } from '@/components/raisonne/shell/heading';
import { READING_LEAD_CLASS } from '@/components/raisonne/shell/measure';
import { Skeleton } from '@/components/ui/skeleton';
import type { Landing } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CtaButton, headlineLines } from './lib';
import { Ticker } from './ticker';

/**
 * The first screen: an eyebrow, the artist's own headline, one sentence
 * under it and up to two calls to action. Everything but the headline is
 * optional, and the whole block is optional too: a site with no landing
 * data falls back to the artist's own hero (see /).
 *
 * The headline keeps the line breaks the artist typed, because where a line
 * turns is a decision about the sentence, not about the window.
 */
export function LandingHero({
  hero,
  ticker = null,
  headingLevel = 1,
  className,
}: {
  hero: Landing['hero'];
  /** The studio clock line; null when the module is off or there is no ticker. */
  ticker?: Landing['ticker'];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const lines = headlineLines(hero.headline);
  // A headline is either a few words or a sentence, and the two want
  // different sizes: four words at 72 px is a poster, a sentence at 72 px is
  // six lines of shouting.
  const sentence = hero.headline.replace(/\s+/g, ' ').trim().length > 80;

  return (
    <section data-slot="landing-hero" className={cn('flex flex-col items-start gap-6', className)}>
      {hero.eyebrow ? <p className="text-sm font-medium text-muted-foreground">{hero.eyebrow}</p> : null}

      <Heading
        className={cn(
          'font-semibold tracking-tight text-balance',
          sentence
            ? 'max-w-[28ch] text-2xl sm:text-3xl lg:text-4xl 3xl:text-5xl'
            : 'max-w-[18ch] text-4xl sm:text-5xl lg:text-6xl 3xl:text-7xl',
        )}
      >
        {lines.map((line, index) => (
          <span key={index} className="block">
            {line}
          </span>
        ))}
      </Heading>

      {hero.subtitle ? (
        <p className={cn('text-base text-pretty text-muted-foreground sm:text-lg/8', READING_LEAD_CLASS)}>
          {hero.subtitle}
        </p>
      ) : null}

      {hero.primaryCta || hero.secondaryCta ? (
        <div className="flex flex-wrap items-center gap-2">
          {hero.primaryCta ? <CtaButton cta={hero.primaryCta} /> : null}
          {hero.secondaryCta ? <CtaButton cta={hero.secondaryCta} variant="outline" /> : null}
        </div>
      ) : null}

      {ticker ? <Ticker ticker={ticker} /> : null}
    </section>
  );
}

export function LandingHeroSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col gap-6', className)}>
      <span className="sr-only">Loading the home page</span>
      <div aria-hidden className="flex flex-col gap-6">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-[26rem] max-w-full sm:h-14" />
          <Skeleton className="h-12 w-[20rem] max-w-full sm:h-14" />
        </div>
        <Skeleton className="h-5 w-[32rem] max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  );
}

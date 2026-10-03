'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp, ChevronUp, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BOTTOM_BAR_SLOT } from './bottom-bar-action';
import { isBareRoute } from './bare-shell';
import { type FooterMode, footerModeFor } from './nav';

/**
 * Three ways a page can end, picked per route in nav.ts:
 *
 *  - `flow`: the footer sits at the bottom of the document.
 *  - `panel`: a bar at the bottom of the window opens the footer over the
 *    page, and scrolling up, Escape or the close button puts it away. A long
 *    grid keeps its rhythm, and the footer is still one key away.
 *  - `off`: no footer. The CV is a document.
 *
 * Every mode is reachable from the keyboard: the bar's button is a real
 * button with aria-expanded, the closed panel is inert so it holds no tab
 * stops, and focus moves into the panel when it opens and back to the button
 * when it closes.
 */
export function FooterShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mode: FooterMode = footerModeFor(pathname);
  const scrolls = usePageScrolls(mode === 'panel');

  if (mode === 'off' || isBareRoute(pathname)) return null;
  // The panel earns its keep on a long grid. On a route whose content does
  // not even fill the window it leaves the page ending in white with a "Show
  // the footer" bar and no navigation in sight, so a short page keeps the
  // ordinary footer.
  if (mode === 'panel' && scrolls) return <FooterPanel>{children}</FooterPanel>;

  return (
    <footer className="mt-auto border-t print:hidden" data-footer-mode="flow">
      {children}
    </footer>
  );
}

/**
 * Whether this page is long enough to scroll. Measured rather than declared,
 * because the same route is long on one install and short on another: an
 * awards page holds six records here and sixty somewhere else.
 *
 * It starts true so the first paint matches the server's, and corrects
 * itself once the browser can measure; a page that shortens or lengthens on
 * a resize is measured again.
 */
function usePageScrolls(active: boolean): boolean {
  const [scrolls, setScrolls] = useState(true);

  useEffect(() => {
    if (!active) return undefined;
    const measure = () => {
      // The panel's own spacer and bar are 48 px; anything less than that
      // over the window is not a page worth hiding a footer behind.
      setScrolls(document.documentElement.scrollHeight > window.innerHeight + 48);
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [active]);

  return scrolls;
}

function FooterPanel({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The panel remembers which page it was opened on rather than carrying a
  // flag, so a new page starts with the footer put away without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;

  const close = useCallback(() => {
    setOpenedAt(null);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    // Scrolling back up is the gesture that puts the panel away again.
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) close();
    };
    let touchStart = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchStart = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? 0;
      if (y - touchStart > 30) close();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [open, close]);

  return (
    <>
      {/* The bar never covers the last row of a list. */}
      <div aria-hidden data-shell="bottom-spacer" className="h-12 print:hidden" />

      <BottomBar>
        <Button
          ref={toggleRef}
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls="site-footer-panel"
          onClick={() => (open ? close() : setOpenedAt(pathname))}
        >
          <ChevronUp
            aria-hidden
            data-icon="inline-start"
            className={cn('transition-transform', open && 'rotate-180')}
          />
          {open ? 'Hide the footer' : 'Show the footer'}
        </Button>
      </BottomBar>

      <div
        id="site-footer-panel"
        inert={!open}
        aria-hidden={!open}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 max-h-[85svh] overflow-y-auto overscroll-contain border-t bg-background transition-transform duration-500 ease-out print:hidden motion-reduce:transition-none',
          open ? 'translate-y-0 shadow-lg' : 'pointer-events-none translate-y-full',
        )}
      >
        <footer data-footer-mode="panel" className="relative">
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon-sm"
            aria-label="Hide the footer"
            className="absolute top-3 right-3 z-10"
            onClick={close}
          >
            <X aria-hidden />
          </Button>
          {children}
        </footer>
      </div>
    </>
  );
}

/**
 * The bar across the bottom of the window: a hint that there is more of the
 * list below, a back-to-top control once there is something to go back up
 * to, the slot a page puts its own control in through BottomBarAction, and
 * whatever the caller passes (the footer toggle).
 */
function BottomBar({ children }: { children?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div data-shell="bottom-bar" className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 print:hidden">
      <div className="mx-auto flex h-12 w-full max-w-[180rem] items-center gap-2 px-4 sm:px-6 lg:px-8 3xl:px-12">
        {/* A page mounts its own control here, through BottomBarAction. */}
        <div data-slot={BOTTOM_BAR_SLOT} className="flex min-w-0 flex-1 items-center gap-2" />
        {scrolled ? (
          <BackToTop size="sm" />
        ) : (
          <span aria-hidden className="text-xs text-muted-foreground">
            Keep scrolling for more
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

/** Sends the window back to the top, and the focus with it. */
export function BackToTop({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'default' }) {
  return (
    <Button
      variant="ghost"
      size={size}
      className={cn('print:hidden', className)}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('main')?.focus();
      }}
    >
      <ArrowUp aria-hidden data-icon="inline-start" />
      Back to top
    </Button>
  );
}

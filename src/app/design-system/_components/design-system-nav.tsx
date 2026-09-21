'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface DesignSystemNavGroup {
  id: string;
  label: string;
  topics?: readonly { id: string; label: string }[];
}

/** How far below the top of the viewport a section counts as the current one. */
const ACTIVE_OFFSET = 140;

/**
 * Sticky in-page navigation for long tool pages (design system, docs).
 * Below lg it is a sideways bar; from lg a left rail with nested topics.
 * The current section is tracked on scroll.
 */
export function DesignSystemNav({
  groups,
  label = 'Design system',
}: {
  groups: readonly DesignSystemNavGroup[];
  /** Accessible name for the nav landmark. */
  label?: string;
}) {
  const ids = useMemo(
    () => groups.flatMap(group => [group.id, ...(group.topics ?? []).map(topic => topic.id)]),
    [groups],
  );
  const [activeId, setActiveId] = useState<string>(groups[0]?.id ?? '');
  const barRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      let current = ids[0] ?? '';
      let currentTop = -Infinity;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) continue;
        const top = element.getBoundingClientRect().top;
        // The section that started most recently above the offset line wins.
        if (top <= ACTIVE_OFFSET && top >= currentTop) {
          current = id;
          currentTop = top;
        }
      }
      // At the very bottom, the last section is current even if it is short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        const last = [...ids].reverse().find(id => document.getElementById(id));
        if (last && groups.some(group => group.id === last)) current = last;
      }
      setActiveId(current);
    }

    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ids, groups]);

  const activeGroupId =
    groups.find(group => group.id === activeId || group.topics?.some(topic => topic.id === activeId))?.id ?? '';

  // Keep the current item visible in the sideways-scrolling bar on phones.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || bar.scrollWidth <= bar.clientWidth) return;
    const link = bar.querySelector<HTMLElement>('[data-current="true"]');
    if (!link) return;
    const left = link.offsetLeft;
    const right = left + link.offsetWidth;
    if (left < bar.scrollLeft || right > bar.scrollLeft + bar.clientWidth) {
      bar.scrollTo({ left: Math.max(0, left - 16) });
    }
  }, [activeGroupId]);

  return (
    <nav
      aria-label={label}
      className="sticky top-14 z-30 -mx-4 border-b bg-background px-4 sm:-mx-6 sm:px-6 lg:top-20 lg:mx-0 lg:max-h-[calc(100svh-6rem)] lg:self-start lg:overflow-y-auto lg:border-0 lg:bg-transparent lg:px-0"
    >
      {/* Phones and tablets: one row of the four groups. */}
      <ul ref={barRef} className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] lg:hidden">
        {groups.map(group => {
          const current = group.id === activeGroupId;
          return (
            <li key={group.id} className="shrink-0">
              <a
                href={`#${group.id}`}
                data-current={current}
                aria-current={current ? 'location' : undefined}
                className={cn(
                  'inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                  current && 'bg-muted text-foreground',
                )}
              >
                {group.label}
              </a>
            </li>
          );
        })}
      </ul>

      {/* lg and up: the rail, with the foundations topics nested. */}
      <ul className="hidden flex-col gap-1 py-1 lg:flex">
        {groups.map(group => {
          const groupCurrent = group.id === activeGroupId;
          return (
            <li key={group.id} className="flex flex-col gap-1">
              <a
                href={`#${group.id}`}
                aria-current={group.id === activeId ? 'location' : undefined}
                className={cn(
                  'flex h-8 items-center rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                  groupCurrent && 'text-foreground',
                  group.id === activeId && 'bg-muted',
                )}
              >
                {group.label}
              </a>
              {group.topics && group.topics.length > 0 ? (
                <ul className="ml-2.5 flex flex-col gap-0.5 border-l pl-2">
                  {group.topics.map(topic => {
                    const current = topic.id === activeId;
                    return (
                      <li key={topic.id}>
                        <a
                          href={`#${topic.id}`}
                          aria-current={current ? 'location' : undefined}
                          className={cn(
                            'flex h-7 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                            current && 'bg-muted text-foreground',
                          )}
                        >
                          {topic.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

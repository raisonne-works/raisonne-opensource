'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';

/**
 * The end of a list, for a design that grows the list instead of paging it.
 *
 * A pack turns it on by setting --catalogue-infinite: on in its stylesheet
 * and giving this element a box. Skin zero sets nothing, so the element stays
 * hidden and the pages stay pages. When it is on and comes into view, the
 * list is asked for again with one more page of rows (?through=), which the
 * server renders: the rows already on screen stay where they are.
 */
export function CatalogueMore({ href }: { href: string | null }) {
  const router = useRouter();
  const mark = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const element = mark.current;
    if (!element || !href || pending) return;
    if (getComputedStyle(element).getPropertyValue('--catalogue-infinite').trim() !== 'on') return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [href, pending, router]);

  return (
    <div
      ref={mark}
      data-slot="catalogue-more"
      data-more={href ? '' : undefined}
      data-pending={pending ? '' : undefined}
      aria-hidden
      className="hidden"
    />
  );
}

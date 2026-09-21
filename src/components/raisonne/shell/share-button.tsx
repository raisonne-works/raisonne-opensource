'use client';

import { CheckIcon, Share2Icon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

/**
 * Share this page: the system share sheet where the browser has one (phones),
 * a copied link everywhere else. Both paths confirm what happened, so the
 * button never looks like it did nothing.
 *
 * The URL is read in the browser, so the button works on a static page and
 * carries whatever origin the install is served from. `path` overrides it
 * when a page wants to share something other than itself.
 */
export function ShareButton({
  title,
  text,
  path,
  label = 'Share',
  variant = 'outline',
  size = 'default',
  className,
}: {
  /** The record's title, for the share sheet. */
  title: string;
  /** One line of context in the share sheet. */
  text?: string;
  /** Defaults to the page the button is on. */
  path?: string;
  label?: string;
  variant?: 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm';
  className?: string;
}) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function share() {
    const url = new URL(path ?? pathname, window.location.origin).toString();

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // A cancelled share sheet is not a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy the link. Copy it from the address bar instead.');
    }
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={share}>
      {copied ? <CheckIcon aria-hidden data-icon="inline-start" /> : <Share2Icon aria-hidden data-icon="inline-start" />}
      {copied ? 'Link copied' : label}
    </Button>
  );
}

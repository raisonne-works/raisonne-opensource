'use client';

import { useRouter } from 'next/navigation';
import { RefreshCwIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/**
 * "Re-sync my holdings".
 *
 * A collector who bought a work a minute ago should not have to wait for a
 * cache to expire to see it. The button drops this address's cached read on
 * the server and asks the page to render again; it never passes an address,
 * because the only address it may refresh is the one in the session cookie.
 *
 * Failures are said out loud. Nothing here silently shows stale data and
 * calls it fresh.
 */
export function ResyncButton({ className }: { className?: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const busy = sending || refreshing;

  async function resync() {
    setSending(true);
    try {
      const response = await fetch('/api/collector/resync', { method: 'POST' });
      const body: unknown = await response.json().catch(() => null);
      const message = typeof body === 'object' && body && 'error' in body ? String(body.error) : null;

      if (!response.ok) {
        toast.error(
          response.status === 429
            ? 'That is a few too many re-syncs. Try again in a couple of minutes.'
            : (message ?? 'The chain could not be read just now.'),
        );
        return;
      }

      startTransition(() => router.refresh());
      toast.success('Holdings re-read from the chain');
    } catch {
      toast.error('The re-sync could not be sent. Check the connection and try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className={className} disabled={busy} onClick={resync}>
      {busy ? <Spinner aria-hidden data-icon="inline-start" /> : <RefreshCwIcon aria-hidden data-icon="inline-start" />}
      {busy ? 'Re-syncing' : 'Re-sync my holdings'}
    </Button>
  );
}

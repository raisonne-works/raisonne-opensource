import { notFound } from 'next/navigation';

import { normalizeAddress } from '@/lib/chain/address';

/**
 * The address check, held above the loading boundary.
 *
 * /collector/0xdeadbeef used to answer 200 with a 131 KB document whose
 * <main> was empty: the page called notFound(), but loading.tsx puts a
 * Suspense boundary around it and Next flushes the shell, status and all, as
 * soon as the page suspends on `await params`. The 404 arrived inside the
 * stream, too late to be a status, so a malformed address got a blank page
 * that search engines and link previews read as a real one.
 *
 * A layout renders outside that boundary, so the status is still ours. The
 * page keeps its own notFound() for the case this cannot see: an address
 * that is well formed and simply not in the snapshot.
 */
export default async function CollectorProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  if (!normalizeAddress(address)) notFound();
  return children;
}

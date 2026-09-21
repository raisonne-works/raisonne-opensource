'use client';

import { CatalogueError } from '@/components/raisonne/catalogue/catalogue-error';

export default function LeaderboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogueError list="leaderboard" error={error} retry={retry} />;
}

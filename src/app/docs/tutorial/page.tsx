import type { Metadata } from 'next';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container, PageHeader } from '@/components/raisonne/shell/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ownerToolsEnabled } from '@/lib/tools';

import { TUTORIAL_PLAYLIST, formatDuration } from './playlist';
import { TutorialPlaylist } from './tutorial-playlist';

export const metadata: Metadata = {
  title: 'Tutorial — How to build a catalogue raisonné',
  description:
    'Video playlist: domain, server, code, import, keys, and going live — every chapter of the Raisonne how-to.',
  robots: { index: false, follow: false },
};

async function listAvailableParts(): Promise<Set<string>> {
  const dir = path.join(process.cwd(), 'public', 'docs', 'tutorial', 'parts');
  try {
    const names = await readdir(dir);
    return new Set(names.filter(n => n.endsWith('.mp4')));
  } catch {
    return new Set();
  }
}

/**
 * Artist-tool page: chapter-by-chapter tutorial film. Media is optional under
 * public/docs/tutorial (gitignored); metadata always ships in the app.
 */
export default async function DocsTutorialPage() {
  if (!ownerToolsEnabled()) notFound();

  const available = await listAvailableParts();
  const totalLabel = formatDuration(TUTORIAL_PLAYLIST.duration);
  const have = available.size;

  return (
    <Container className="pb-16 md:pb-24">
      <PageHeader
        eyebrow="For the artist"
        title={TUTORIAL_PLAYLIST.title}
        description={
          <>
            {TUTORIAL_PLAYLIST.subtitle} Fifteen chapters, about {totalLabel} on the draft voice. Follow along while
            you set up your own install — or watch one chapter at a time.
          </>
        }
        actions={
          <>
            <Badge variant="outline">{TUTORIAL_PLAYLIST.parts.length} chapters</Badge>
            <Badge variant="outline">{totalLabel}</Badge>
            {have > 0 ? (
              <Badge variant="secondary">
                {have}/{TUTORIAL_PLAYLIST.parts.length} on disk
              </Badge>
            ) : (
              <Badge variant="outline">Media not installed</Badge>
            )}
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/docs" />}>
              All docs
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<a href={TUTORIAL_PLAYLIST.repo} target="_blank" rel="noreferrer" />}
            >
              GitHub
            </Button>
          </>
        }
      />

      <TutorialPlaylist availableFiles={[...available]} />

      <section className="mt-12 max-w-[48rem] space-y-3 border-t pt-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">About this film</p>
        <p>
          Shot as one continuous timeline in Diffusion Studio, then split per chapter for this playlist. The voice on
          disk may still be a draft; replace the chapter wavs and re-export when you record the real takes. No live
          keys or signed-in dashboards appear on screen.
        </p>
        <p>
          Source project: <code className="text-xs">orkhan.art/social/video/raisonne-tutorial</code>. Sync media with{' '}
          <code className="text-xs">./sync-docs-media.sh</code> into <code className="text-xs">public/docs/tutorial/</code>{' '}
          (gitignored).
        </p>
      </section>
    </Container>
  );
}

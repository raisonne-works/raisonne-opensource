'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  TUTORIAL_PLAYLIST,
  formatDuration,
  partPoster,
  partSrc,
  type TutorialPart,
} from './playlist';

type Props = {
  /** Filenames present under public/docs/tutorial/parts */
  availableFiles: readonly string[];
};

/**
 * Chapter playlist: one player, list of parts, auto-advance when a part ends.
 * Media is optional — missing files show an honest empty state per row.
 */
export function TutorialPlaylist({ availableFiles }: Props) {
  const available = new Set(availableFiles);
  const parts = TUTORIAL_PLAYLIST.parts;
  const firstAvailable = parts.findIndex(p => available.has(p.file));
  const [index, setIndex] = useState(firstAvailable >= 0 ? firstAvailable : 0);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const part = parts[index] ?? parts[0];
  const hasFile = available.has(part.file);

  const select = useCallback(
    (i: number) => {
      setIndex(i);
      const el = videoRef.current;
      if (!el) return;
      // load() after src change is handled by key on video
    },
    [],
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !hasFile) return;
    void el.play().catch(() => {
      /* autoplay blocked until user gesture — fine */
    });
  }, [index, hasFile]);

  const onEnded = () => {
    if (!autoplayNext) return;
    for (let i = index + 1; i < parts.length; i++) {
      if (available.has(parts[i].file)) {
        setIndex(i);
        return;
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border bg-muted/30">
          {hasFile ? (
            <video
              key={part.file}
              ref={videoRef}
              className="aspect-video w-full bg-black"
              controls
              playsInline
              preload="metadata"
              poster={partPoster(part)}
              onEnded={onEnded}
            >
              <source src={partSrc(part)} type="video/mp4" />
            </video>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted/50 px-6 text-center">
              <p className="text-sm font-medium text-foreground">Chapter media not on this install</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Export parts into <code className="text-xs">public/docs/tutorial/parts/</code> (see the tutorial
                project <code className="text-xs">sync-docs-media.sh</code>). The list below still names every
                chapter.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">
              {part.n} / {parts[parts.length - 1].n}
            </p>
            <h2 className="text-xl font-medium tracking-tight text-foreground md:text-2xl">{part.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatDuration(part.duration)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAutoplayNext(v => !v)}
              aria-pressed={autoplayNext}
            >
              {autoplayNext ? 'Auto-next on' : 'Auto-next off'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={index <= 0}
              onClick={() => select(Math.max(0, index - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={index >= parts.length - 1}
              onClick={() => select(Math.min(parts.length - 1, index + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <aside className="min-w-0">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Chapters</p>
          <Badge variant="outline">{parts.length}</Badge>
        </div>
        <ol className="flex max-h-[min(70vh,40rem)] flex-col gap-1 overflow-y-auto rounded-xl border p-1">
          {parts.map((p, i) => (
            <ChapterRow
              key={p.file}
              part={p}
              active={i === index}
              available={available.has(p.file)}
              onSelect={() => select(i)}
            />
          ))}
        </ol>
      </aside>
    </div>
  );
}

function ChapterRow({
  part,
  active,
  available,
  onSelect,
}: {
  part: TutorialPart;
  active: boolean;
  available: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
          active ? 'bg-muted' : 'hover:bg-muted/60',
          !available && 'opacity-60',
        )}
      >
        <span className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
          {available ? (
            <Image
              src={partPoster(part)}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
              unoptimized
            />
          ) : (
            <span className="flex size-full items-center justify-center font-mono text-[10px] text-muted-foreground">
              {part.n}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{part.title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">
            {part.n} · {formatDuration(part.duration)}
            {!available ? ' · missing' : ''}
          </span>
        </span>
      </button>
    </li>
  );
}

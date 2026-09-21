'use client';

import { CodeIcon, ImageIcon, PlayIcon } from 'lucide-react';
import { useState } from 'react';

import { MediaViewer } from '@/components/raisonne/works/media-viewer';
import { Button } from '@/components/ui/button';
import type { Work } from '@/lib/types';

const ICONS = { image: ImageIcon, video: PlayIcon, html: CodeIcon, unknown: ImageIcon } as const;

/**
 * Buttons that open the MediaViewer on sample works, one per media kind.
 * `liveHtml` opens an interactive work the way a site with live HTML on does:
 * running in a sandboxed frame instead of showing its still.
 *
 * The label identifies a row, not the work: an install can offer the same
 * token as two demonstrations ("Interactive" and "Interactive, live HTML
 * on"), and keying on the work would give two children the same key and open
 * both viewers at once.
 */
export function MediaViewerDemo({ works }: { works: { label: string; work: Work; liveHtml?: boolean }[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {works.map(({ label, work, liveHtml }) => {
        const Icon = ICONS[work.media.kind];
        return (
          <div key={label}>
            <Button variant="outline" onClick={() => setOpenId(label)}>
              <Icon aria-hidden data-icon="inline-start" />
              {label}
            </Button>
            <MediaViewer
              work={work}
              liveHtml={liveHtml}
              open={openId === label}
              onOpenChange={open => setOpenId(open ? label : null)}
            />
          </div>
        );
      })}
    </div>
  );
}

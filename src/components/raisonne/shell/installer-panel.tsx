'use client';

import { KeyRoundIcon, WrenchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useSession } from '@/components/raisonne/auth/use-session';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { PANEL_CLASS } from './measure';

/**
 * The designed "not configured" state, addressed to the person who can fix it.
 *
 * Nothing in Waves 2 and 3 is configured by default, and that is a working
 * state rather than a broken one. But there are two readers of that state and
 * they need different things. A visitor needs one sentence: nothing can be
 * bought here yet, everything else works. The installer needs the variable
 * names, and those are deployment notes rather than page content.
 *
 * So the pages carry the visitor's sentence, and this carries the names. It
 * fetches them from /api/setup, which answers the artist and a development
 * server and nobody else, so the names are not in the page source of a live
 * site at all. Which means it renders nothing for a visitor, including in
 * their view-source.
 */

interface SetupFeature {
  id: string;
  configured: boolean;
  summary: string;
  detail: string;
  missing: { name: string; doc: string | null }[];
  notes: string[];
}

interface SetupBody {
  audience?: 'owner' | 'development';
  features?: SetupFeature[];
}

export function InstallerPanel({
  surface,
  className,
  headingLevel = 2,
}: {
  /** Which part of the install to report on: store, accounts, chain. */
  surface: 'store' | 'accounts' | 'chain';
  className?: string;
  headingLevel?: 2 | 3 | 4;
}) {
  const session = useSession();
  const [body, setBody] = useState<SetupBody | null>(null);

  // Re-asked whenever the session changes, so signing in as the artist shows
  // the panel without a reload and signing out takes it away.
  const signedInAs = session.status === 'signed-in' ? `${session.address}:${session.role}` : session.status;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/setup?surface=${surface}`, { cache: 'no-store' });
        if (!response.ok) {
          if (!cancelled) setBody(null);
          return;
        }
        const next = (await response.json().catch(() => null)) as SetupBody | null;
        if (!cancelled) setBody(next);
      } catch {
        if (!cancelled) setBody(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [surface, signedInAs]);

  const features = (body?.features ?? []).filter(feature => !feature.configured);
  if (features.length === 0) return null;

  const Heading = `h${headingLevel}` as const;

  return (
    <Card className={cn(PANEL_CLASS, className)}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <WrenchIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <Heading className="text-base font-semibold">Still to set up on this install</Heading>
          <Badge variant="secondary" className="font-normal">
            {body?.audience === 'owner' ? 'Only you can see this' : 'Development only'}
          </Badge>
        </CardTitle>
        <CardDescription className="text-pretty">
          Visitors see a short note saying what is not available yet. They do not see this block.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {features.map(feature => (
          <div key={feature.id} className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <KeyRoundIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              {feature.summary}
            </p>
            <p className="text-sm text-pretty text-muted-foreground">{feature.detail}</p>
            {feature.missing.length > 0 ? (
              <dl className="flex flex-col gap-3 border-l pl-4">
                {feature.missing.map(variable => (
                  <div key={variable.name} className="flex flex-col gap-1">
                    <dt className="font-mono text-xs font-medium break-all">{variable.name}</dt>
                    {variable.doc ? (
                      <dd className="text-sm text-pretty text-muted-foreground">{variable.doc}</dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            ) : null}
            {feature.notes.length > 0 ? (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {feature.notes.map(note => (
                  <li key={note} className="text-pretty">
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        <p className="text-sm text-pretty text-muted-foreground">
          Set these in <code className="font-mono text-xs">.env.local</code>, which is never committed, and restart the
          site. Every variable this install reads is listed in <code className="font-mono text-xs">.env.example</code>{' '}
          and explained in the README.
        </p>
      </CardContent>
    </Card>
  );
}

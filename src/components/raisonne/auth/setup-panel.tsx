import { CheckIcon, KeyRoundIcon, TriangleAlertIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ENV_DOCS, type FeatureStatus } from '@/lib/config';
import { READING_CLASS } from '@/components/raisonne/shell/measure';
import { cn } from '@/lib/utils';

/**
 * The designed "not configured" state.
 *
 * Nothing in Waves 2 and 3 is configured in a fresh clone, and that is a
 * working state rather than a broken one. So a surface that cannot run says
 * exactly what is missing, in the words of the variable that would fix it,
 * and the catalogue around it carries on.
 *
 * It is written for the person who can fix it, which on a self-hosted
 * install is the artist. It never says "something went wrong", never asks
 * anyone to contact support, and never prints a value: only the name of a
 * variable and the sentence from ENV_DOCS that explains what it is for.
 *
 * Shared on purpose. The collectors, insights and store packages render this
 * same panel from surfaceRequirements(id), so an install sees one kind of
 * setup notice rather than four.
 */
export function SetupPanel({
  /** Usually surfaceRequirements(id). Anything already configured is shown as satisfied. */
  statuses,
  /** What the visitor came for, e.g. "Sign-in". Heads the panel when given. */
  title,
  /** One sentence for a visitor who is not the artist. */
  visitorNote,
  className,
}: {
  statuses: readonly FeatureStatus[];
  title?: string;
  visitorNote?: string;
  className?: string;
}) {
  const blocking = statuses.filter(status => !status.configured);
  const missing = [...new Set(blocking.flatMap(status => status.missing))];

  return (
    <Card data-slot="setup-panel" className={cn('max-w-[46rem]', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          >
            <KeyRoundIcon className="size-4" />
          </span>
          <Badge variant="secondary">Setup needed</Badge>
        </div>
        <CardTitle className="text-xl">{title ?? blocking[0]?.summary ?? 'This part is not configured yet'}</CardTitle>
        <CardDescription className={READING_CLASS}>
          {visitorNote ??
            'The rest of the catalogue works as usual. This page needs one thing from whoever runs the install.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {blocking.map(status => (
          <div key={status.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="flex items-start gap-2 text-sm font-medium">
                <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {status.summary}
              </h3>
              <p className={cn('text-sm text-pretty text-muted-foreground', READING_CLASS)}>{status.detail}</p>
            </div>

            {status.missing.length > 0 ? (
              <dl className="flex flex-col gap-3 border-l pl-4">
                {status.missing.map(name => (
                  <div key={name} className="flex flex-col gap-1">
                    <dt>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">{name}</code>
                    </dt>
                    <dd className={cn('text-sm text-pretty text-muted-foreground', READING_CLASS)}>
                      {ENV_DOCS[name] ?? 'Set this in .env.local and restart the server.'}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {status.notes.length > 0 ? (
              <ul className="flex list-none flex-col gap-1 text-sm text-muted-foreground">
                {status.notes.map(note => (
                  <li key={note} className={READING_CLASS}>
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}

        {statuses
          .filter(status => status.configured)
          .map(status => (
            <p key={status.id} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {status.id === 'accounts' ? 'Sign-in' : status.id} is configured.
            </p>
          ))}

        {missing.length > 0 ? (
          <p className={cn('text-sm text-pretty text-muted-foreground', READING_CLASS)}>
            Put {missing.length === 1 ? 'it' : 'them'} in <code className="font-mono text-xs">.env.local</code>, which
            is never committed, and restart the server. Every variable this theme reads is listed in{' '}
            <code className="font-mono text-xs">.env.example</code> and in the README.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

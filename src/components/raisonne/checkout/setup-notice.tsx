import { InfoIcon, WrenchIcon } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeatureStatus } from '@/lib/config';
import { cn } from '@/lib/utils';

/**
 * What a surface shows when the install has not been given the keys it needs.
 *
 * Nothing in Waves 2 and 3 is configured by default, and that is a working
 * state rather than a broken one. A missing key never gives a visitor a 404
 * and never produces an invented number: the page renders this instead,
 * naming the exact variables and saying what each one is for, because the
 * person most likely to be looking at it is the artist who can set them.
 *
 * Server safe and prop driven: the page reads the environment through
 * src/lib/config.ts and hands the answers down, so nothing about the
 * environment reaches the browser except the names of the variables.
 */
export function SetupNotice({
  title,
  description,
  statuses,
  docs,
  className,
}: {
  title: string;
  description?: string;
  /** From surfaceRequirements(id) or featureStatus(id). */
  statuses: readonly FeatureStatus[];
  /** ENV_DOCS: the line printed under each variable name. */
  docs: Record<string, string>;
  className?: string;
}) {
  const unconfigured = statuses.filter(status => !status.configured);
  const notes = statuses.flatMap(status => status.notes);

  return (
    <Card className={cn('max-w-[48rem]', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WrenchIcon aria-hidden className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {unconfigured.map(status => (
          <div key={status.id} className="flex flex-col gap-3">
            <p className="text-sm font-medium">{status.summary}</p>
            <p className="text-sm text-pretty text-muted-foreground">{status.detail}</p>
            {status.missing.length > 0 ? (
              <dl className="flex flex-col gap-3 border-l border-border pl-4">
                {status.missing.map(name => (
                  <div key={name} className="flex flex-col gap-1">
                    <dt className="font-mono text-xs font-medium break-all">{name}</dt>
                    <dd className="text-sm text-pretty text-muted-foreground">{docs[name] ?? 'Set this in .env.local.'}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ))}

        {notes.length > 0 ? (
          <div className="flex flex-col gap-2">
            {notes.map(note => (
              <p key={note} className="flex items-start gap-2 text-sm text-muted-foreground">
                <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span className="text-pretty">{note}</span>
              </p>
            ))}
          </div>
        ) : null}

        <p className="text-sm text-pretty text-muted-foreground">
          Set these in <code className="font-mono text-xs">.env.local</code> and restart the site. Every variable this
          install reads is listed in <code className="font-mono text-xs">.env.example</code> and in the README.
        </p>
      </CardContent>
    </Card>
  );
}

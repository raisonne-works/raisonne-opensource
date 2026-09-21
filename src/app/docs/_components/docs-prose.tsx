import type { ReactNode } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { READING_CLASS } from '@/components/raisonne/shell/measure';

/** Body copy for a docs block: capped reading width, quiet spacing. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 text-base/relaxed text-pretty text-foreground',
        '[&_p]:text-muted-foreground [&_li]:text-muted-foreground',
        '[&_strong]:font-medium [&_strong]:text-foreground',
        '[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground',
        '[&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 hover:[&_a]:underline',
        READING_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProseList({ items, ordered = false }: { items: ReactNode[]; ordered?: boolean }) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <List className={cn('flex list-outside flex-col gap-1.5 pl-5', ordered ? 'list-decimal' : 'list-disc')}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </List>
  );
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith('http');
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return <Link href={href}>{children}</Link>;
}

export function Callout({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: ReactNode;
  tone?: 'default' | 'warn';
}) {
  return (
    <aside
      className={cn(
        'w-full max-w-[48rem] rounded-xl border p-4',
        tone === 'warn' ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/40',
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="mt-1 text-sm text-pretty text-muted-foreground">{children}</div>
    </aside>
  );
}

export function FeatureTable({
  rows,
  columns = ['Feature', 'Where'],
}: {
  rows: { name: ReactNode; where: ReactNode; note?: ReactNode }[];
  columns?: [string, string] | [string, string, string];
}) {
  const three = columns.length === 3 || rows.some(row => row.note);
  return (
    <div className="w-full max-w-[48rem] overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns[0]}</TableHead>
            <TableHead>{columns[1]}</TableHead>
            {three ? <TableHead>{columns[2] ?? 'Notes'}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="align-top font-medium">{row.name}</TableCell>
              <TableCell className="align-top text-muted-foreground">{row.where}</TableCell>
              {three ? <TableCell className="align-top text-muted-foreground">{row.note ?? '—'}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function EnvTable({
  rows,
}: {
  rows: { name: string; what: string; required?: boolean }[];
}) {
  return (
    <div className="w-full max-w-[56rem] overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[14rem]">Variable</TableHead>
            <TableHead>What it does</TableHead>
            <TableHead className="w-24">Need</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.name}>
              <TableCell className="align-top">
                <code className="font-mono text-xs">{row.name}</code>
              </TableCell>
              <TableCell className="align-top text-muted-foreground">{row.what}</TableCell>
              <TableCell className="align-top">
                {row.required ? <Badge variant="secondary">Often</Badge> : <Badge variant="outline">Optional</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="w-full max-w-[48rem] overflow-hidden rounded-xl border bg-muted/40">
      {title ? (
        <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">{title}</div>
      ) : null}
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Steps({ steps }: { steps: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="flex w-full max-w-[48rem] flex-col gap-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium"
          >
            {index + 1}
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <p className="text-sm font-medium text-foreground">{step.title}</p>
            <div className="text-sm text-pretty text-muted-foreground">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

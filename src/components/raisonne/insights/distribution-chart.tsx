'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatPercent } from '@/lib/money';
import { cn } from '@/lib/utils';

import { ChartNumbers } from './chart-numbers';
import { CHART_CLASS, CHART_INK } from './lib';

const config = {
  wallets: { label: 'Wallets', color: CHART_INK.accent },
} satisfies ChartConfig;

export interface DistributionRow {
  bucket: string;
  wallets: number;
}

/**
 * How many works each wallet holds, in buckets.
 *
 * Whether a body of work sits with many wallets holding one piece or a few
 * holding most of it is the question this answers, and four bars answer it
 * faster than four numbers. The share of wallets in each bucket is in the
 * table, which is the accessible form of the chart above it.
 */
export function HoldingDistributionChart({ rows }: { rows: DistributionRow[] }) {
  const present = rows.filter(row => row.wallets > 0);
  if (present.length === 0) return null;

  const total = rows.reduce((sum, row) => sum + row.wallets, 0);

  return (
    <figure className="flex flex-col gap-6">
      {present.length > 1 ? (
        <div aria-hidden="true">
          <ChartContainer config={config} className={cn(CHART_CLASS, 'h-[14rem] w-full sm:h-[16rem]')}>
            <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="wallets" fill="var(--color-wallets)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}

      <figcaption className="sr-only">
        Wallets by how many works they hold, from the chain snapshot. The same figures are in the table below.
      </figcaption>

      {/* No caption. The section above the chart already says "Wallets by
          how many works of this catalogue they hold", and the caption said
          it again in smaller type. */}
      <ChartNumbers label="Show the numbers">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Works held</TableHead>
            <TableHead scope="col" className="text-right">
              Wallets
            </TableHead>
            <TableHead scope="col" className="text-right">
              Share
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.bucket}>
              <TableHead scope="row" className="h-auto py-2 font-normal">
                {row.bucket}
              </TableHead>
              <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.wallets)}</TableCell>
              <TableCell className="py-2 text-right tabular-nums text-muted-foreground">
                {/* One decimal, so five wallets of eight and three of eight
                    read as 62.5 and 37.5 rather than as 63 and 38, which
                    add up to 101. */}
                {formatPercent(row.wallets, total, { maximumFractionDigits: 1 }) ?? ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </ChartNumbers>
    </figure>
  );
}

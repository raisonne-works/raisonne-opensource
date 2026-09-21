'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatTokenAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

import { ChartNumbers } from './chart-numbers';
import { CHART_CLASS, CHART_INK, chartValue, type SeriesRow } from './lib';

const config = {
  volume: { label: 'Volume', color: CHART_INK.accent },
} satisfies ChartConfig;

/**
 * Volume by series, over the priced sales the snapshot holds.
 *
 * Only the series that traded appear. A series whose sales all settled in
 * WETH or through a marketplace contract has no volume this install can
 * total, and it is left off the chart rather than drawn as a bar of zero,
 * which would read as "never sold". The table says which ones those are.
 */
export function SeriesVolumeChart({ rows }: { rows: SeriesRow[] }) {
  const priced = rows.filter(row => row.volume);
  const unpriced = rows.filter(row => !row.volume && row.sales + row.transfers > 0);
  if (priced.length === 0) return null;

  const symbol = priced[0]?.volume?.symbol ?? '';
  const sameSymbol = priced.every(row => row.volume?.symbol === symbol);

  const data = priced
    .map(row => ({
      slug: row.seriesSlug,
      title: row.title,
      value: chartValue(row.volume),
      exact: formatTokenAmount(row.volume) ?? '',
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <figure className="flex flex-col gap-6">
      {sameSymbol && data.length > 1 ? (
        <div aria-hidden="true">
          <ChartContainer config={config} className={cn(CHART_CLASS, 'h-[16rem] w-full sm:h-[20rem]')}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                type="category"
                dataKey="title"
                tickLine={false}
                axisLine={false}
                width={140}
                tickMargin={8}
                interval={0}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(_value, _name, item) => item?.payload?.exact ?? ''} />}
              />
              <Bar dataKey="value" fill="var(--color-volume)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}

      <figcaption className="sr-only">
        Volume by series{symbol ? `, in ${symbol}` : ''}, from the chain snapshot. The same figures are in the table
        below.
      </figcaption>

      <ChartNumbers label="Show the numbers">
        <Table>
        <TableCaption className="text-left">
          Volume by series, largest first. Priced sales only
          {unpriced.length > 0
            ? `; ${unpriced.length} ${unpriced.length === 1 ? 'series carries' : 'series carry'} events with no price in the transaction.`
            : '.'}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Series</TableHead>
            <TableHead scope="col" className="text-right">
              Priced sales
            </TableHead>
            <TableHead scope="col" className="text-right">
              Volume
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {priced
            .slice()
            .sort((a, b) => chartValue(b.volume) - chartValue(a.volume))
            .map(row => (
              <TableRow key={row.seriesSlug}>
                <TableHead scope="row" className="h-auto py-2 font-normal">
                  {row.href ? (
                    <Link
                      href={row.href}
                      className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {row.title}
                    </Link>
                  ) : (
                    row.title
                  )}
                </TableHead>
                <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.sales)}</TableCell>
                <TableCell className="py-2 text-right font-medium tabular-nums">
                  {formatTokenAmount(row.volume)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
        </Table>
      </ChartNumbers>
    </figure>
  );
}

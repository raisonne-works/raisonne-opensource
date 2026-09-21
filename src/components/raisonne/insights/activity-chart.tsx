'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/lib/money';
import { cn } from '@/lib/utils';

import { ChartNumbers } from './chart-numbers';
import { CHART_CLASS, CHART_INK, CHART_LEGEND_CLASS, CHART_MONTHS, monthLabel, shortMonthLabel, type MonthlyRow } from './lib';

const config = {
  // Sales are what anyone opens this chart for, so sales take the accent.
  // Mints and transfers are the context around them and stay grey, far
  // enough apart in lightness to be told apart at a value of one.
  sales: { label: 'Sales', color: CHART_INK.accent },
  mints: { label: 'Mints', color: CHART_INK.strong },
  transfers: { label: 'Transfers', color: CHART_INK.soft },
} satisfies ChartConfig;

/**
 * Events a month: mints, priced sales and transfers, stacked.
 *
 * A chart earns its place here because the shape of a catalogue's history
 * over years is the one thing a table of forty rows does not show at a
 * glance. The table is still underneath, carrying every month, and it is the
 * chart's accessible form rather than a duplicate: the drawing is hidden from
 * assistive technology and the numbers are not.
 *
 * Colours are mixes of the one foreground token, so the three bands keep
 * their order and their contrast in both themes.
 */
export function MonthlyActivityChart({ rows, months = CHART_MONTHS }: { rows: MonthlyRow[]; months?: number }) {
  if (rows.length === 0) return null;

  const drawn = rows.slice(-months);
  const newestFirst = [...rows].reverse();
  const clipped = rows.length > drawn.length;

  return (
    <figure className="flex flex-col gap-6">
      {drawn.length > 1 ? (
        <div aria-hidden="true">
          <ChartContainer config={config} className={cn(CHART_CLASS, 'h-[16rem] w-full sm:h-[20rem]')}>
            <BarChart data={drawn} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              {/* Every bar gets a label. minTickGap used to drop whatever
                  did not fit, which at 390 px left four of nine months
                  unidentifiable: a bar nobody can name is a bar nobody can
                  read. Angled, they all fit at every width. */}
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={56}
                tickMargin={6}
                tickFormatter={(value: string) => `${shortMonthLabel(value)} ${value.slice(2, 4)}`}
              />
              <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={value => monthLabel(String(value))} />} />
              <ChartLegend content={<ChartLegendContent className={CHART_LEGEND_CLASS} />} />
              <Bar dataKey="mints" stackId="events" fill="var(--color-mints)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="sales" stackId="events" fill="var(--color-sales)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="transfers" stackId="events" fill="var(--color-transfers)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}

      <figcaption className="sr-only">
        Events a month, from the chain snapshot. The same figures are in the table below.
      </figcaption>

      <ChartNumbers label="Show the numbers">
        <Table>
          <TableCaption className="text-left">
            Events a month, newest first
            {clipped ? `. The chart draws the last ${drawn.length} months; the table lists all ${rows.length}.` : '.'}
          </TableCaption>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead scope="col">Month</TableHead>
              <TableHead scope="col" className="text-right">
                Mints
              </TableHead>
              <TableHead scope="col" className="text-right">
                Sales
              </TableHead>
              <TableHead scope="col" className="text-right">
                Transfers
              </TableHead>
              <TableHead scope="col" className="text-right">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newestFirst.map(row => (
              <TableRow key={row.month}>
                <TableHead scope="row" className="h-auto py-2 font-normal">
                  {row.label}
                </TableHead>
                <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.mints)}</TableCell>
                <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.sales)}</TableCell>
                <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.transfers)}</TableCell>
                <TableCell className="py-2 text-right font-medium tabular-nums">{formatNumber(row.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartNumbers>
    </figure>
  );
}

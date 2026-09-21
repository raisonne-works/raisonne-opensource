'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatPercent } from '@/lib/money';
import { cn } from '@/lib/utils';

import { ChartNumbers } from './chart-numbers';
import { CHART_CLASS, CHART_INK, type PriceDistribution } from './lib';

const config = {
  sales: { label: 'Sales', color: CHART_INK.accent },
} satisfies ChartConfig;

/**
 * What works sold for, in bands.
 *
 * The highest sale is the figure a dashboard reaches for and the least
 * representative one it has. This says what a work of this catalogue usually
 * changed hands for, which is the question a collector is actually asking.
 *
 * The caption carries the count the bands are drawn from and the count they
 * had to leave out, because a distribution taken from half the sales without
 * saying so is a picture of nothing.
 */
export function PriceDistributionChart({ distribution }: { distribution: PriceDistribution }) {
  const { bands, symbol, counted, uncounted } = distribution;
  const data = bands.map(band => ({ ...band, tick: `${band.to}` }));

  return (
    <figure className="flex flex-col gap-6">
      {bands.length > 1 ? (
        <div aria-hidden="true">
          <ChartContainer config={config} className={cn(CHART_CLASS, 'h-[14rem] w-full sm:h-[16rem]')}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="from"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={8}
                tickFormatter={(value: number) => `${value}`}
              />
              <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_label, payload) => {
                      const band = payload?.[0]?.payload as { label?: string } | undefined;
                      return band?.label ?? '';
                    }}
                  />
                }
              />
              <Bar dataKey="sales" fill="var(--color-sales)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}

      <figcaption className="sr-only">
        Priced sales by price band, in {symbol}, from the chain snapshot. The same figures are in the table below.
      </figcaption>

      <ChartNumbers label="Show the numbers">
        <Table>
        <TableCaption className="text-left">
          {formatNumber(counted)} priced {counted === 1 ? 'sale' : 'sales'} by band, in {symbol}
          {uncounted > 0
            ? `. ${formatNumber(uncounted)} further ${uncounted === 1 ? 'sale carries' : 'sales carry'} no price in the transaction and ${uncounted === 1 ? 'is' : 'are'} not counted here.`
            : '.'}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Band</TableHead>
            <TableHead scope="col" className="text-right">
              Sales
            </TableHead>
            <TableHead scope="col" className="text-right">
              Share
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bands.map(band => (
            <TableRow key={band.label}>
              <TableHead scope="row" className="h-auto py-2 font-normal whitespace-nowrap">
                {band.label}
              </TableHead>
              <TableCell className="py-2 text-right tabular-nums">{formatNumber(band.sales)}</TableCell>
              <TableCell className="py-2 text-right tabular-nums text-muted-foreground">
                {formatPercent(band.sales, counted, { maximumFractionDigits: 1 }) ?? ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </ChartNumbers>
    </figure>
  );
}

import { CheckIcon, CircleIcon, DotIcon } from 'lucide-react';

import { formatDateTime } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { COMMISSION_STATUS_COPY, ORDER_STATUS_COPY, orderTimeline } from '@/lib/store/order-view';
import type { CommissionStatus, Order, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Where an order has got to.
 *
 * The badge and the timeline read from the same copy, so a list and a page
 * never disagree about what "in production" means. Steps that have not
 * happened carry no date, because this install does not know when they will:
 * a catalogue that guesses a delivery date is a catalogue that lies twice,
 * once now and once on Thursday.
 */

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const copy = ORDER_STATUS_COPY[status];
  return (
    <Badge variant={copy.tone} className={className}>
      {copy.label}
    </Badge>
  );
}

export function CommissionStatusBadge({ status, className }: { status: CommissionStatus; className?: string }) {
  const copy = COMMISSION_STATUS_COPY[status];
  return (
    <Badge variant={copy.tone} className={className}>
      {copy.label}
    </Badge>
  );
}

export function OrderTimeline({ order, className }: { order: Order; className?: string }) {
  const steps = orderTimeline(order);

  return (
    <ol className={cn('flex flex-col gap-3', className)}>
      {steps.map(step => {
        const Icon = step.state === 'done' ? CheckIcon : step.state === 'current' ? CircleIcon : DotIcon;
        return (
          <li key={step.id} className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                step.state === 'done' && 'border-transparent bg-primary text-primary-foreground',
                step.state === 'current' && 'border-primary text-primary',
                step.state === 'todo' && 'border-border text-muted-foreground',
              )}
            >
              <Icon aria-hidden className="size-3" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className={cn('text-sm', step.state === 'todo' ? 'text-muted-foreground' : 'font-medium')}>
                {step.label}
              </span>
              {step.at ? (
                <time dateTime={step.at} className="text-xs text-muted-foreground">
                  {formatDateTime(step.at)}
                </time>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

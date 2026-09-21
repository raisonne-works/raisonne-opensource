import type { ReactNode } from 'react';

import { CardTitle } from '@/components/ui/card';

import type { HeadingLevel } from './heading';

/**
 * A CardTitle that is also a heading. CardTitle is a div, so a flow made of
 * cards would have no outline at all; role and aria-level give each step a
 * place a screen reader can jump to, without changing how it looks.
 */
export function CardHeading({
  level = 2,
  children,
  className,
}: {
  level?: HeadingLevel;
  children: ReactNode;
  className?: string;
}) {
  return (
    <CardTitle role="heading" aria-level={level} className={className}>
      {children}
    </CardTitle>
  );
}

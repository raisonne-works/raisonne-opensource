import type { AwardedBadge, BadgeRule } from '@/lib/guild';
import type { BadgeCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

import { BadgeExplainer } from './badge-explainer';
import { badgeAnchor } from './lib';

/**
 * Every badge this install can award, grouped, each with the sentence that
 * earns it and the number of wallets holding it today.
 *
 * Grouping follows the artist's own categories where a badge names one, and
 * falls back to what the badge is about. Badges the install cannot work out
 * come last, under a heading that says they were given rather than earned, so
 * nobody reads a hand-picked mark as a measurement.
 */

interface Group {
  id: string;
  name: string;
  description: string | null;
  badges: AwardedBadge[];
}

const BUILT_IN_ORDER = ['Timing', 'Commitment', 'Breadth', 'Scale', 'Given by the artist'];

/**
 * Groups are keyed on the heading a reader sees, not on the id behind it, so
 * a badge the artist filed under their own "Timing" category and a rule this
 * install calls "Timing" land in the same section instead of two identical
 * headings one under the other.
 */
function groupsOf(badges: readonly AwardedBadge[], categories: readonly BadgeCategory[]): Group[] {
  const byId = new Map(categories.map(category => [category.id, category]));
  const groups = new Map<string, Group>();

  for (const badge of badges) {
    const category = badge.categoryId ? byId.get(badge.categoryId) : undefined;
    const name = category?.name ?? badge.categoryLabel;
    const key = name.trim().toLowerCase();
    const group = groups.get(key) ?? { id: key, name, description: null, badges: [] };
    group.description ??= category?.description ?? null;
    group.badges.push(badge);
    groups.set(key, group);
  }

  const order = (group: Group): number => {
    const category = categories.find(entry => entry.name.trim().toLowerCase() === group.id);
    if (category) return category.order ?? 0;
    const index = BUILT_IN_ORDER.findIndex(name => name.toLowerCase() === group.id);
    return 1000 + (index === -1 ? BUILT_IN_ORDER.length : index);
  };

  return [...groups.values()].sort((a, b) => order(a) - order(b));
}

export function BadgeBoard({
  badges,
  categories = [],
  counts,
  suspended = [],
  className,
  headingLevel = 3,
}: {
  badges: readonly AwardedBadge[];
  categories?: readonly BadgeCategory[];
  /** Badge id to the number of wallets holding it now. Absent means the page does not count them. */
  counts?: Map<string, number>;
  /** Rules standing down because the snapshot's history is incomplete. */
  suspended?: readonly BadgeRule[];
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const groups = groupsOf(badges, categories);
  if (groups.length === 0) return null;
  const Heading = `h${headingLevel}` as const;
  const suspendedKeys = new Set(suspended.map(rule => rule.key));

  return (
    <div className={cn('flex flex-col gap-10', className)}>
      {groups.map(group => (
        <section key={group.id} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Heading className="text-lg font-semibold tracking-tight">{group.name}</Heading>
            {group.description ? <p className="text-sm text-muted-foreground">{group.description}</p> : null}
          </div>
          <ul className="grid gap-x-8 gap-y-6 md:grid-cols-2 2xl:grid-cols-3">
            {group.badges.map(badge => (
              <li key={badge.id} id={badgeAnchor(badge.id)} className="scroll-mt-24">
                <BadgeExplainer
                  badge={badge}
                  wallets={counts?.get(badge.id)}
                  suspended={badge.key !== null && suspendedKeys.has(badge.key)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

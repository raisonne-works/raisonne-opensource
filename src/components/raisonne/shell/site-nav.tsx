'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { isActiveGroup, isActivePath, type NavGroup } from './nav';
import { ThemeToggle } from './theme-toggle';

/**
 * The main navigation, in two shapes over the same groups: menus from md up,
 * and one sheet below it. The groups come from the data (see nav.ts), so a
 * catalogue with no writings has no Writings entry anywhere.
 *
 * A group of one is a plain link rather than a menu, so a small install does
 * not make a visitor open a menu to find its only page.
 */
export function MainNav({ groups, className }: { groups: NavGroup[]; className?: string }) {
  const pathname = usePathname();
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    setValue(null);
  }, [pathname]);

  if (groups.length === 0) return null;

  return (
    <NavigationMenu className={className} aria-label="Main" value={value} onValueChange={setValue}>
      <NavigationMenuList className="gap-0.5">
        {groups.map(group => {
          const single = group.items.length === 1 ? group.items[0] : null;
          const active = isActiveGroup(pathname, group);

          if (single) {
            return (
              <NavigationMenuItem key={group.id}>
                <NavigationMenuLink
                  aria-current={isActivePath(pathname, single.href) ? 'page' : undefined}
                  className={cn(
                    'h-9 px-2.5 font-medium text-muted-foreground',
                    isActivePath(pathname, single.href) && 'bg-muted text-foreground',
                  )}
                  render={<Link href={single.href} />}
                >
                  {single.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }

          return (
            <NavigationMenuItem key={group.id} value={group.id}>
              <NavigationMenuTrigger
                className={cn('text-muted-foreground', active && 'text-foreground')}
                onClick={() => setValue(current => (current === group.id ? null : group.id))}
              >
                {group.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[min(22rem,calc(100vw-2rem))] gap-0.5">
                  {group.items.map(item => (
                    <li key={item.href}>
                      <NavigationMenuLink
                        aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
                        className={cn(
                          'flex-col items-start gap-0.5',
                          isActivePath(pathname, item.href) && 'bg-muted',
                        )}
                        render={<Link href={item.href} />}
                      >
                        <span className="flex w-full items-baseline justify-between gap-3 font-medium">
                          {item.label}
                          {typeof item.count === 'number' ? (
                            <span className="text-xs tabular-nums text-muted-foreground">{item.count}</span>
                          ) : null}
                        </span>
                        {item.description ? (
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        ) : null}
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

/** Below md: a menu button that opens the same groups in a sheet. */
export function MobileNav({
  groups,
  title,
  description,
  className,
}: {
  groups: NavGroup[];
  title: string;
  description?: string | null;
  className?: string;
}) {
  const pathname = usePathname();
  // The sheet remembers which page it was opened on rather than carrying a
  // flag: a link inside it navigates without unmounting it, and comparing
  // against the current path closes it when the route changes, with no
  // effect and no flash of the old menu.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  if (groups.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className={className} aria-label="Open menu" />}>
        <MenuIcon aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="pr-12">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        {/* The drawer covers the header, so the theme toggle comes with it. */}
        <div className="px-4 pb-2">
          <ThemeToggle />
        </div>
        <nav aria-label="Main" className="flex flex-col gap-6 px-2 pb-6">
          {groups.map(group => (
            <div key={group.id} className="flex flex-col gap-1">
              <h3 className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</h3>
              <ul className="flex flex-col gap-0.5">
                {group.items.map(item => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          // A rule and a weight, not a plate: a rounded grey
                          // block beside the focus ring reads as a focus ring
                          // on an item nobody has focused.
                          'flex h-11 items-center justify-between gap-3 rounded-lg border-l-2 border-transparent px-3 text-base font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                          active && 'border-foreground font-semibold text-foreground',
                        )}
                      >
                        {item.label}
                        {typeof item.count === 'number' ? (
                          <span className="text-xs tabular-nums">{item.count}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

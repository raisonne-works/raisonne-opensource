'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ShoppingBagIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { CartContents } from './cart-contents';
import { setCartOpen, syncCart, useCart, useCartPanel } from './cart-store';

/**
 * The cart in the header: a button with what is in it, and the panel it
 * opens. Both live here, so a shop install adds one element to the header
 * and gets the whole thing, and an install with no shop renders nothing at
 * all.
 *
 * The count waits for the browser to read local storage before it appears.
 * Rendering it any earlier would mean the server had to guess a number it
 * cannot know, which is the one thing a cart must never do.
 */
export function CartButton({ className }: { className?: string }) {
  const { count, ready } = useCart();
  const { open, setOpen } = useCartPanel();
  const pathname = usePathname();

  // Checkout empties the basket by writing the same local storage key, and a
  // page in this tab gets no storage event for its own writes. Re-reading on
  // every navigation keeps the count honest whoever wrote it last.
  useEffect(() => {
    syncCart();
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative', className)}
            aria-label={ready && count > 0 ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
          />
        }
      >
        <ShoppingBagIcon aria-hidden="true" />
        {ready && count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-medium text-primary-foreground tabular-nums">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </SheetTrigger>

      {/* Wider than the default sheet: a cart line is a picture, a title, a
          stepper and a price, and they do not fit in 24rem. */}
      <SheetContent side="right" className="flex w-full flex-col gap-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="pr-12">
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {ready && count > 0
              ? `${count} ${count === 1 ? 'item' : 'items'}, priced by the site.`
              : 'Nothing in it yet.'}
          </SheetDescription>
        </SheetHeader>
        <CartContents variant="panel" onNavigate={() => setCartOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

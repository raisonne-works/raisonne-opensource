import { CartButton } from './cart-button';

/**
 * The header's cart corner, as a slot the shell is handed rather than a
 * component the shell knows about. An install with no shop renders nothing
 * here and ships no cart code to the browser for it.
 *
 * `enabled` comes from the install's own data, which is static, so this adds
 * nothing dynamic to a page that prerenders.
 */
export function CartSlot({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <CartButton />;
}

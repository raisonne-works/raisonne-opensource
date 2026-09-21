'use client';

import { type ReactNode, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

/** Where the bar keeps a page's own control. One slot, named once. */
export const BOTTOM_BAR_SLOT = 'bottom-bar-actions';

function slotNode(): Element | null {
  return document.querySelector(`[data-slot="${BOTTOM_BAR_SLOT}"]`);
}

/**
 * The slot is read as an external source rather than copied into state: the
 * bar belongs to the shell, so it can mount a paint after the page that
 * wants it. Once it is there nothing more is watched, so a long grid pays
 * for this only until the footer exists.
 */
function subscribe(onChange: () => void): () => void {
  if (slotNode()) return () => {};
  const observer = new MutationObserver(() => {
    if (!slotNode()) return;
    observer.disconnect();
    onChange();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/**
 * A page's own control in the bar across the bottom of the window.
 *
 * The bar belongs to the shell and the control belongs to the page, and the
 * two are rendered in different trees, so the page hands its control over
 * through a portal. Anything rendered here appears at the left of the bar,
 * beside the back-to-top and the footer toggle.
 *
 * Nothing is rendered until the bar exists: routes that end in the ordinary
 * flow footer have no bar, and a page that asks for the slot there simply
 * shows nothing rather than failing.
 */
export function BottomBarAction({ children }: { children: ReactNode }) {
  const slot = useSyncExternalStore(subscribe, slotNode, () => null);
  return slot ? createPortal(children, slot) : null;
}

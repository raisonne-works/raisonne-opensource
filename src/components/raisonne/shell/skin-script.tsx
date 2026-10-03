'use client';

import { useEffect } from 'react';

/**
 * Loads the worn pack's script, when it has one.
 *
 * The pages are prerendered and cannot know which pack a host mounts, so the
 * pack says so itself: its stylesheet sets --skin-script on the root. Skin
 * zero sets nothing, and then nothing is requested.
 */
export function SkinScript() {
  useEffect(() => {
    const wanted = getComputedStyle(document.documentElement).getPropertyValue('--skin-script').trim();
    if (!wanted || wanted === 'none' || document.querySelector('script[data-skin]')) return;
    const script = document.createElement('script');
    script.src = '/skin.js';
    script.defer = true;
    script.dataset.skin = '';
    document.head.appendChild(script);
  }, []);
  return null;
}

import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

/**
 * Reads the colour and radius tokens straight from src/app/globals.css, so
 * the design system page always shows the values the site actually uses.
 * Light values come from the :root block, dark values from the .dark block.
 */

export type TokenValues = Record<string, string>;

export interface ThemeTokens {
  light: TokenValues;
  dark: TokenValues;
  /** False when globals.css could not be read; swatches then fall back to live CSS variables. */
  fromSource: boolean;
}

const GLOBALS_CSS = path.join(process.cwd(), 'src', 'app', 'globals.css');

function readBlock(css: string, selector: string): TokenValues {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  const values: TokenValues = {};
  if (!match) return values;
  for (const declaration of match[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    values[declaration[1]] = declaration[2].trim();
  }
  return values;
}

export function readThemeTokens(): ThemeTokens {
  try {
    const css = fs.readFileSync(GLOBALS_CSS, 'utf8');
    const light = readBlock(css, ':root');
    const dark = readBlock(css, '.dark');
    if (Object.keys(light).length === 0) throw new Error('No :root tokens found');
    return { light, dark, fromSource: true };
  } catch {
    return { light: {}, dark: {}, fromSource: false };
  }
}

/** A token's value for one mode, or the live CSS variable when the source is unavailable. */
export function tokenValue(tokens: TokenValues, name: string): string {
  return tokens[name] ?? `var(--${name})`;
}

/** The base radius in px (1rem = 16px), from --radius. */
export function baseRadiusPx(tokens: TokenValues): number | null {
  const raw = tokens.radius;
  if (!raw) return null;
  const rem = /^([\d.]+)rem$/.exec(raw);
  if (rem) return Number(rem[1]) * 16;
  const px = /^([\d.]+)px$/.exec(raw);
  return px ? Number(px[1]) : null;
}

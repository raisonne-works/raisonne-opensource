import 'server-only';

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { skinSettings } from '@/lib/config';

import { VARIANTS, type Composition } from './composition';
import { validateComposition } from './validate';

/**
 * The pack this install wears, read from a folder outside the app.
 *
 * RAISONNE_SKIN names the pack and RAISONNE_PACK_DIR is the folder that holds
 * it: <dir>/<id>/pack.json, with pack.css, an optional pack.js and any fonts
 * beside it. A pack may split its stylesheet into parts/*.css, which follow
 * pack.css in file-name order. Packs are
 * private, so none ship with the app. With either variable unset, or a pack
 * that does not pass the checks below, the install wears skin zero and
 * carries on: a missing pack is never a broken site.
 *
 * Both are read per request, not at build. Every hosted install runs the
 * same image, and the pages are prerendered, so what a pack changes is
 * served by /skin.css and /skin/<file> rather than baked into the HTML.
 */
export type WornPack = {
  id: string;
  name: string;
  /** Absolute folder of this pack. Files are served only from inside it. */
  dir: string;
  composition: Composition;
  /** The pack's stylesheet, or null when it has none. */
  css: string | null;
  /** The pack's script, or null when it has none. Behaviour a stylesheet cannot express. */
  script: string | null;
  /** Changes when the pack's files change. Used as the ETag. */
  version: string;
};

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
let cached: { key: string; pack: WornPack | null } | null = null;

function mtime(file: string): number {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

/** A pack's extra files of one kind (stylesheet parts, scripts), in the order they are served. */
function parts(dir: string, folder = 'parts', extension = '.css'): string[] {
  try {
    return readdirSync(path.join(dir, folder))
      .filter(name => name.endsWith(extension) && !name.startsWith('.'))
      .sort()
      .map(name => path.join(dir, folder, name));
  } catch {
    return [];
  }
}

function read(id: string, root: string): WornPack | null {
  const dir = path.resolve(root, id);
  const manifest = path.join(dir, 'pack.json');
  if (!existsSync(manifest)) return reject(id, `no pack.json in ${dir}`);
  let data: { id?: unknown; name?: unknown; slots?: unknown };
  try {
    data = JSON.parse(readFileSync(manifest, 'utf8'));
  } catch {
    return reject(id, 'pack.json is not valid JSON');
  }
  if (data.id !== id) return reject(id, 'pack.json names a different id');
  if (!data.slots || typeof data.slots !== 'object' || Array.isArray(data.slots)) return reject(id, 'pack.json has no slots');
  const checked = validateComposition({ slots: data.slots });
  if (!checked.ok)
    return reject(id, `slots do not match the contract (missing: ${checked.missing.join(', ') || 'none'}; unknown: ${checked.unknown.join(', ') || 'none'})`);
  const known = new Set<string>(VARIANTS);
  const wrong = Object.entries(data.slots as Record<string, { variant?: unknown }>).filter(
    ([, placed]) => typeof placed?.variant !== 'string' || !known.has(placed.variant),
  );
  if (wrong.length) return reject(id, `the app has no such layout for: ${wrong.map(([slot]) => slot).join(', ')}`);
  const stylesheet = path.join(dir, 'pack.css');
  const script = path.join(dir, 'pack.js');
  return {
    id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : id,
    dir,
    composition: { id, slots: data.slots as Composition['slots'] },
    css: (() => {
      const files = [...(existsSync(stylesheet) ? [stylesheet] : []), ...parts(dir)];
      return files.length ? files.map(file => readFileSync(file, 'utf8')).join('\n') : null;
    })(),
    script: (() => {
      const files = [...(existsSync(script) ? [script] : []), ...parts(dir, 'scripts', '.js')];
      return files.length ? files.map(file => readFileSync(file, 'utf8')).join('\n;\n') : null;
    })(),
    version: [manifest, stylesheet, script, ...parts(dir), ...parts(dir, 'scripts', '.js')].map(mtime).join('-'),
  };
}

const warned = new Set<string>();
function reject(id: string, reason: string): null {
  // Said once, on the server. The visitor gets skin zero either way.
  if (!warned.has(`${id}:${reason}`)) {
    warned.add(`${id}:${reason}`);
    console.warn(`[raisonne] pack "${id}" is not worn: ${reason}. Falling back to skin zero.`);
  }
  return null;
}

/** null means skin zero. */
export function getWornPack(): WornPack | null {
  const settings = skinSettings();
  const id = settings.id ?? '';
  const root = settings.dir ?? '';
  if (!id || id === 'skin-zero' || !root) return null;
  if (!ID.test(id)) return reject(id, 'the id may only use a-z, 0-9 and hyphens');
  const dir = path.resolve(root, id);
  const key = [dir, ...['pack.json', 'pack.css', 'pack.js'].map(name => mtime(path.join(dir, name))), ...[...parts(dir), ...parts(dir, 'scripts', '.js')].map(file => `${file}@${mtime(file)}`)].join(':');
  if (cached?.key !== key) cached = { key, pack: read(id, root) };
  return cached.pack;
}

const SERVED: Record<string, string> = {
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
};

/** A font or image inside the worn pack, or null. Never a file outside it, a dotfile, or the manifest. */
export function getPackFile(segments: string[]): { file: string; type: string } | null {
  const pack = getWornPack();
  if (!pack || !segments.length || segments.some(part => !part || part.startsWith('.') || part.includes('\\'))) return null;
  const file = path.resolve(pack.dir, ...segments);
  if (!file.startsWith(pack.dir + path.sep)) return null;
  const type = SERVED[path.extname(file).toLowerCase()];
  if (!type || !existsSync(file) || !statSync(file).isFile()) return null;
  return { file, type };
}

/**
 * The importer and the design system are the artist's own tools, not pages
 * for the people who come to look at the work: the import replays the
 * artist's wallets and lists contracts it calls "probably not yours", and
 * the design system is component documentation.
 *
 * They are on in development, and in production only when the install asks
 * for them with RAISONNE_TOOLS=1. RAISONNE_TOOLS=0 switches them off
 * everywhere. Routes that are off answer 404.
 *
 * /docs is different: it is the public how-to for building and running an
 * install (clone, import, series, A–Z). It is always on so a shared link and
 * a fresh clone both work without flipping a tools flag. Prerender is fine.
 *
 * Tool pages are prerendered, so the flag has to be set for the build as
 * well as for the server: RAISONNE_TOOLS=1 pnpm build && RAISONNE_TOOLS=1 pnpm start.
 */
export function ownerToolsEnabled(): boolean {
  const flag = process.env.RAISONNE_TOOLS?.trim().toLowerCase();
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return process.env.NODE_ENV === 'development';
}

/**
 * Whether the tools are also *linked* from the site.
 *
 * This used to be a second environment variable, because putting "For the
 * artist: Import, Design system" in the footer of every page a visitor reads
 * is navigation pointing at somebody else's workbench. The answer turned out
 * to be simpler than a variable: the install already knows who the artist
 * is, so the footer renders that block inside OwnerOnly and the links appear
 * for the owner session and for nobody else. RAISONNE_TOOLS_NAV is no longer
 * read. Public Docs is linked separately for everyone.
 *
 * Kept as a named export so a caller that wants "linked, not merely
 * reachable" has something to say, and so the two ideas stay distinct.
 */
export function ownerToolsNavEnabled(): boolean {
  return ownerToolsEnabled();
}

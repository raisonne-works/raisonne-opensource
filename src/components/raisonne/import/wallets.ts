/**
 * Wallet input for the import form: what counts as an address and how a
 * pasted list is split. One definition, so the form never accepts a list the
 * importer would refuse.
 */

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function isAddress(value: string): boolean {
  return ADDRESS.test(value);
}

/** Splits on commas, semicolons and any whitespace, so a pasted column works as well as a list. */
export function splitWalletTokens(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

/**
 * Valid addresses come back lowercased and deduplicated, in the order given,
 * so the same wallet pasted twice in two casings counts once. Anything else
 * comes back as written, so the form can point at it.
 */
export function parseWalletInput(text: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of splitWalletTokens(text)) {
    if (!isAddress(token)) {
      if (!invalid.includes(token)) invalid.push(token);
      continue;
    }
    const lower = token.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    valid.push(lower);
  }

  return { valid, invalid };
}


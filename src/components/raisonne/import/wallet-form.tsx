'use client';

import { type FormEvent, type KeyboardEvent, useId, useMemo, useRef, useState } from 'react';

import { CardHeading } from '@/components/raisonne/shell/card-heading';
import type { HeadingLevel } from '@/components/raisonne/shell/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { ImportChain } from '@/lib/import-events';

import { plural } from '../works/lib';
import type { ImportRequest } from './import-source';
import { CHAIN_LABELS, CHAIN_NOTES, IMPORT_CHAINS, MAX_IMPORT_WALLETS } from './import-state';
import { parseWalletInput } from './wallets';

export interface WalletFormProps {
  /** Addresses to start with, as a list or as pasted text. */
  defaultWallets?: readonly string[] | string;
  defaultChains?: readonly ImportChain[];
  onSubmit?: (request: ImportRequest) => void;
  /** While an import runs the submit button becomes Stop. */
  running?: boolean;
  onStop?: () => void;
  /**
   * The request cannot change, as with a replay, which can only play back
   * the wallets it was recorded with. Fields stay readable but read-only.
   */
  locked?: boolean;
  /** The level of this step's title in the page's outline. */
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * Step one of an import: the wallets the artist minted from and the chains to
 * search. Validates as you type (after the first blur) and again on submit;
 * Cmd or Ctrl + Enter in the field submits.
 */
export function WalletForm({
  defaultWallets = [],
  defaultChains = IMPORT_CHAINS,
  onSubmit,
  running = false,
  onStop,
  locked = false,
  headingLevel = 2,
  className,
}: WalletFormProps) {
  const id = useId();
  const walletsId = `${id}-wallets`;
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initialText = typeof defaultWallets === 'string' ? defaultWallets : defaultWallets.join('\n');
  const [text, setText] = useState(initialText);
  const [chains, setChains] = useState<ImportChain[]>(() => IMPORT_CHAINS.filter(c => defaultChains.includes(c)));
  // Pre-filled text is checked straight away, so a typo in it shows at once.
  const [touched, setTouched] = useState(initialText.trim().length > 0);
  const [submitted, setSubmitted] = useState(false);

  const { valid, invalid } = useMemo(() => parseWalletInput(text), [text]);
  const readOnly = locked || running;

  const walletError = describeWalletError(valid, invalid, submitted);
  const chainError = chains.length === 0 ? 'Choose at least one chain.' : null;
  const showWalletError = Boolean(walletError) && (touched || submitted);
  const showChainError = Boolean(chainError) && (touched || submitted);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (running) return;
    setSubmitted(true);
    if (describeWalletError(valid, invalid, true) || chainError) {
      if (!locked) textareaRef.current?.focus();
      return;
    }
    onSubmit?.({ wallets: valid, chains });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const toggleChain = (chain: ImportChain, on: boolean) => {
    setTouched(true);
    setChains(current => IMPORT_CHAINS.filter(c => (c === chain ? on : current.includes(c))));
  };

  const errorId = `${walletsId}-error`;
  const descriptionId = `${walletsId}-description`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardHeading level={headingLevel}>Wallets</CardHeading>
        <CardDescription>
          The wallets you minted from. The import looks for works these wallets created, not ones they collected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Import wallets">
          <FieldGroup>
            <Field data-invalid={showWalletError || undefined}>
              <FieldLabel htmlFor={walletsId}>Wallet addresses</FieldLabel>
              <Textarea
                ref={textareaRef}
                id={walletsId}
                name="wallets"
                value={text}
                onChange={event => setText(event.target.value)}
                onBlur={() => setTouched(true)}
                onKeyDown={handleKeyDown}
                readOnly={readOnly}
                rows={4}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                placeholder={'0x… one per line, or separated by commas'}
                aria-invalid={showWalletError || undefined}
                aria-describedby={showWalletError ? `${descriptionId} ${errorId}` : descriptionId}
                className="min-h-28 font-mono text-sm break-all read-only:bg-muted/50"
              />
              <FieldDescription id={descriptionId}>
                {locked
                  ? 'A replay always uses the wallets it was recorded with.'
                  : valid.length > 0
                    ? `${plural(valid.length, 'wallet')} ready. Up to ${MAX_IMPORT_WALLETS} per import.`
                    : `One address per line, or separated by commas. Up to ${MAX_IMPORT_WALLETS} per import.`}
              </FieldDescription>
              {showWalletError ? <FieldError id={errorId}>{walletError}</FieldError> : null}
            </Field>

            <FieldSet>
              <FieldLegend variant="label">Chains</FieldLegend>
              <FieldGroup data-slot="checkbox-group" className="gap-3">
                {IMPORT_CHAINS.map(chain => {
                  const checkboxId = `${id}-${chain}`;
                  return (
                    <FieldLabel key={chain} htmlFor={checkboxId}>
                      <Field orientation="horizontal">
                        <Checkbox
                          id={checkboxId}
                          name="chains"
                          value={chain}
                          checked={chains.includes(chain)}
                          onCheckedChange={checked => toggleChain(chain, checked)}
                          readOnly={readOnly}
                        />
                        <FieldContent>
                          <FieldTitle>{CHAIN_LABELS[chain]}</FieldTitle>
                          <FieldDescription>{CHAIN_NOTES[chain]}</FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  );
                })}
              </FieldGroup>
              {showChainError ? <FieldError>{chainError}</FieldError> : null}
            </FieldSet>

            <Field orientation="horizontal">
              {/* One button for both states, so keyboard focus survives the switch. */}
              <Button
                type={running ? 'button' : 'submit'}
                variant={running ? 'outline' : 'default'}
                onClick={running ? onStop : undefined}
                disabled={running && !onStop}
                className="w-full sm:w-auto"
              >
                {running ? (
                  <>
                    <Spinner data-icon="inline-start" aria-hidden className="motion-reduce:animate-none" />
                    Stop import
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function describeWalletError(valid: string[], invalid: string[], submitted: boolean): string | null {
  if (invalid.length > 0) {
    const shown = invalid.slice(0, 3).join(', ');
    const more = invalid.length > 3 ? ` and ${invalid.length - 3} more` : '';
    const ens = invalid.some(token => /\.eth$/i.test(token))
      ? ' ENS names are not supported yet, so paste the 0x address.'
      : ' An address is 0x followed by 40 letters and numbers.';
    return `Not ${invalid.length === 1 ? 'an address' : 'addresses'}: ${shown}${more}.${ens}`;
  }
  if (valid.length > MAX_IMPORT_WALLETS) {
    return `At most ${MAX_IMPORT_WALLETS} wallets per import; this list has ${valid.length}.`;
  }
  if (submitted && valid.length === 0) return 'Add at least one wallet address.';
  return null;
}

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightIcon, CircleAlertIcon, InfoIcon, RefreshCwIcon, WalletIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import {
  NETWORK_FAILED,
  NO_WALLET,
  RATE_LIMITED,
  type SignInProblem,
  serverProblem,
  walletProblem,
  wrongChainProblem,
} from './sign-in-errors';
import { announceSessionChange } from './session-events';
import {
  DEFAULT_CHAIN,
  type Eip1193Provider,
  type WalletOption,
  discoverWallets,
  isSupportedChain,
  readChainId,
  requestAddress,
  signMessage,
  switchChain,
} from './wallet';

/**
 * Connect a wallet, sign one message, and you are in.
 *
 * The whole flow in one component, because it is one decision a person is
 * making and splitting it across screens would only add places to get stuck:
 *
 *   pick a wallet  ->  approve the connection  ->  be on a chain we can
 *   check  ->  sign the message the server wrote  ->  signed in
 *
 * Every step that can fail says what happened in words, keeps the wallet
 * list on screen, and offers the one action that would fix it. Cancelling is
 * not treated as an error, because it is not one.
 *
 * Nothing about the session is held here. The cookie is httpOnly, so signing
 * in ends with a refresh and the server decides what a signed-in visitor
 * sees.
 */

type Phase =
  | 'discovering'
  | 'idle'
  | 'connecting'
  | 'wrong-chain'
  | 'preparing'
  | 'signing'
  | 'verifying'
  | 'done';

const BUSY: Phase[] = ['connecting', 'preparing', 'signing', 'verifying', 'done'];

const STEP_LABEL: Partial<Record<Phase, string>> = {
  connecting: 'Waiting for the wallet',
  preparing: 'Preparing the message',
  signing: 'Approve the message in your wallet',
  verifying: 'Checking the signature',
  done: 'Signed in',
};

export function SignInPanel({
  /** Where to go once signed in. Already checked on the server. */
  next,
  className,
}: {
  next?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [phase, setPhase] = useState<Phase>('discovering');
  const [problem, setProblem] = useState<SignInProblem | null>(null);
  const [pending, setPending] = useState<{ wallet: WalletOption; address: string } | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /**
   * Discovery, once on mount and again whenever "Look again" asks. Wallet
   * extensions announce themselves when they load, so a person who installs
   * one and comes back to the tab should be able to find it without a reload.
   */
  useEffect(() => {
    let cancelled = false;
    void discoverWallets().then(found => {
      if (cancelled) return;
      setWallets(found);
      setPhase('idle');
      if (found.length === 0) setProblem(NO_WALLET);
    });
    return () => {
      cancelled = true;
    };
  }, [scanKey]);

  const rescan = useCallback(() => {
    setWallets([]);
    setProblem(null);
    setPhase('discovering');
    setScanKey(key => key + 1);
  }, []);

  /** Steps 2 to 5, from an approved connection to a session. */
  const signIn = useCallback(
    async (wallet: WalletOption, provider: Eip1193Provider, address: string, chain: number) => {
      setPhase('preparing');
      let message: string;
      try {
        const asked = await fetch('/api/auth/nonce', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address, chainId: chain }),
        });
        const body = (await asked.json().catch(() => null)) as { message?: string; error?: string; reason?: string } | null;
        if (!asked.ok || typeof body?.message !== 'string') {
          if (!alive.current) return;
          setPhase('idle');
          setProblem(asked.status === 429 ? RATE_LIMITED : serverProblem(body?.reason, body?.error));
          return;
        }
        message = body.message;
      } catch {
        if (!alive.current) return;
        setPhase('idle');
        setProblem(NETWORK_FAILED);
        return;
      }

      if (!alive.current) return;
      setPhase('signing');

      let signature: string;
      try {
        signature = await signMessage(provider, message, address);
      } catch (error) {
        if (!alive.current) return;
        setPhase('idle');
        setProblem(walletProblem(error));
        return;
      }

      if (!alive.current) return;
      setPhase('verifying');

      try {
        const verified = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message, signature }),
        });
        const body = (await verified.json().catch(() => null)) as { error?: string; reason?: string } | null;
        if (!verified.ok) {
          if (!alive.current) return;
          setPhase('idle');
          setProblem(verified.status === 429 ? RATE_LIMITED : serverProblem(body?.reason, body?.error));
          return;
        }
      } catch {
        if (!alive.current) return;
        setPhase('idle');
        setProblem(NETWORK_FAILED);
        return;
      }

      if (!alive.current) return;
      setPhase('done');
      setPending({ wallet, address });
      // The cookie is set. The header's account slot is told directly, because
      // it stays mounted across navigation and would not notice otherwise.
      announceSessionChange();
      // The server renders what a signed-in visitor sees, here or wherever
      // they were headed before the gate sent them away.
      if (next) router.replace(next);
      router.refresh();
    },
    [next, router],
  );

  const connect = useCallback(
    async (wallet: WalletOption) => {
      setProblem(null);
      setPhase('connecting');

      let address: string;
      try {
        address = await requestAddress(wallet.provider);
      } catch (error) {
        if (!alive.current) return;
        setPhase('idle');
        setProblem(walletProblem(error));
        return;
      }

      const chain = await readChainId(wallet.provider);
      if (!alive.current) return;
      setPending({ wallet, address });

      if (!isSupportedChain(chain)) {
        setPhase('wrong-chain');
        setProblem(wrongChainProblem(chain));
        return;
      }

      await signIn(wallet, wallet.provider, address, chain);
    },
    [signIn],
  );

  const switchAndSign = useCallback(async () => {
    if (!pending) return;
    setProblem(null);
    setPhase('connecting');
    try {
      await switchChain(pending.wallet.provider, DEFAULT_CHAIN.id);
    } catch (error) {
      if (!alive.current) return;
      setPhase('wrong-chain');
      setProblem(walletProblem(error));
      return;
    }

    const chain = await readChainId(pending.wallet.provider);
    if (!alive.current) return;
    if (!isSupportedChain(chain)) {
      setPhase('wrong-chain');
      setProblem(wrongChainProblem(chain));
      return;
    }
    await signIn(pending.wallet, pending.wallet.provider, pending.address, chain);
  }, [pending, signIn]);

  const busy = BUSY.includes(phase);

  return (
    <div data-slot="sign-in-panel" className={cn('flex w-full max-w-[32rem] flex-col gap-4', className)}>
      {phase === 'discovering' ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner aria-hidden className="size-4" />
          Looking for wallets in this browser
        </p>
      ) : null}

      {wallets.length > 0 ? (
        <ul className="flex list-none flex-col gap-2">
          {wallets.map(wallet => {
            const active = pending?.wallet.id === wallet.id && busy;
            return (
              <li key={wallet.id}>
                <Item
                  variant="outline"
                  size="sm"
                  render={
                    <button
                      type="button"
                      onClick={() => void connect(wallet)}
                      disabled={busy}
                      aria-busy={active || undefined}
                      className="w-full text-left disabled:opacity-60"
                    />
                  }
                >
                  <ItemMedia variant="icon">
                    {wallet.icon ? (
                      <Image src={wallet.icon} alt="" width={20} height={20} className="size-5 rounded" unoptimized />
                    ) : (
                      <WalletIcon aria-hidden />
                    )}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{wallet.name}</ItemTitle>
                  </ItemContent>
                  {active ? <Spinner aria-hidden className="size-4" /> : <ArrowRightIcon aria-hidden className="size-4 text-muted-foreground" />}
                </Item>
              </li>
            );
          })}
        </ul>
      ) : null}

      {busy && STEP_LABEL[phase] ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          <Spinner aria-hidden className="size-4" />
          {STEP_LABEL[phase]}
        </p>
      ) : null}

      {problem ? (
        <div
          role={problem.severe ? 'alert' : 'status'}
          className={cn(
            'flex flex-col gap-2 rounded-lg border p-4 text-sm',
            problem.severe ? 'border-destructive/40 text-foreground' : 'text-muted-foreground',
          )}
        >
          <p className="flex items-start gap-2 font-medium">
            {problem.severe ? (
              <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
            ) : (
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            {problem.title}
          </p>
          <p className="text-pretty text-muted-foreground">{problem.detail}</p>

          <div className="flex flex-wrap items-center gap-2 pt-1 empty:hidden">
            {phase === 'wrong-chain' && pending ? (
              <Button size="sm" onClick={() => void switchAndSign()} disabled={busy}>
                Switch to {DEFAULT_CHAIN.name}
              </Button>
            ) : null}
            {problem === NO_WALLET ? (
              <Button variant="outline" size="sm" onClick={rescan} disabled={phase === 'discovering'}>
                <RefreshCwIcon aria-hidden data-icon="inline-start" />
                Look again
              </Button>
            ) : null}
            {problem.retryable && pending && phase === 'idle' ? (
              <Button variant="outline" size="sm" onClick={() => void connect(pending.wallet)}>
                Try again
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="text-sm text-pretty text-muted-foreground">
        Signing costs nothing and approves nothing. It proves the wallet is yours, and no transaction is created.
      </p>
    </div>
  );
}

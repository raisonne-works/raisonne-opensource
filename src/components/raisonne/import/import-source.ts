import { type ImportChain, type ImportEvent, isImportEvent } from '@/lib/import-events';

import { eventMs } from './import-state';

/**
 * Where an import's events come from. The flow only ever talks to this
 * interface, so swapping today's recorded replay for a live importer is a
 * one-prop change:
 *
 *   <ImportFlow replay={events} />                                     today
 *   <ImportFlow source={createStreamSource({ endpoint: '/api/import' })} />  later
 *
 * A source calls onEvent in stream order, resolves when the stream ends (with
 * or without a `done` event: the reducer tells a finished run from a cut-off
 * one) and rejects when it cannot be read. Aborting the signal stops it.
 */

export interface ImportRequest {
  wallets: string[];
  chains: ImportChain[];
}

export interface ImportRunHandlers {
  onEvent: (event: ImportEvent) => void;
  /** A line of the stream that could not be read. It is skipped, not fatal. */
  onMalformed?: () => void;
}

export interface ImportSource {
  kind: 'replay' | 'live';
  /**
   * A replay can only play back what it recorded, so the form shows these
   * wallets and chains and locks them. Null for a live source.
   */
  fixedRequest: ImportRequest | null;
  /** How long the recorded run took, when known. */
  durationMs: number | null;
  run(request: ImportRequest, handlers: ImportRunHandlers, signal: AbortSignal): Promise<void>;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function abortError(): DOMException {
  return new DOMException('The import was stopped.', 'AbortError');
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      window.clearTimeout(id);
      reject(abortError());
    };
    const id = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Plays a recorded run back at its original timing: each event is sent when
 * the importer's clock (`ms`) says it happened. Events due at the same moment
 * go out together, so React paints them as one frame. `speed` above 1 plays
 * faster.
 */
export function createReplaySource(events: readonly ImportEvent[], { speed = 1 }: { speed?: number } = {}): ImportSource {
  const start = events.find(event => event.type === 'start');
  const done = events.find(event => event.type === 'done');
  const rate = speed > 0 ? speed : 1;

  return {
    kind: 'replay',
    fixedRequest: start?.type === 'start' ? { wallets: start.wallets, chains: start.chains } : null,
    durationMs: done ? eventMs(done) : null,
    async run(_request, { onEvent }, signal) {
      const t0 = performance.now();
      let clock = 0;
      let index = 0;
      while (index < events.length) {
        if (signal.aborted) throw abortError();
        // Events with no time of their own (start, score) go with the one before.
        clock = Math.max(clock, eventMs(events[index]) ?? clock);
        const due = clock / rate - (performance.now() - t0);
        if (due > 4) await wait(due, signal);
        if (signal.aborted) throw abortError();
        // Send everything that is due by now in one go.
        const now = (performance.now() - t0) * rate;
        do {
          onEvent(events[index]);
          index += 1;
          clock = Math.max(clock, events[index] ? (eventMs(events[index]) ?? clock) : clock);
        } while (index < events.length && clock <= now);
      }
    },
  };
}

/**
 * A recorded run the page fetches instead of carrying in its HTML: the
 * server streams the NDJSON recording (see src/app/import/replay/route.ts)
 * and it is then played back at its original timing, exactly as
 * createReplaySource does. The wallets and the duration come from the page,
 * so the form can show and lock them before anything is fetched.
 */
export function createRemoteReplaySource({
  endpoint,
  request,
  durationMs,
  speed = 1,
}: {
  endpoint: string;
  request: ImportRequest | null;
  durationMs: number | null;
  speed?: number;
}): ImportSource {
  return {
    kind: 'replay',
    fixedRequest: request,
    durationMs,
    async run(runRequest, handlers, signal) {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/x-ndjson' },
        signal,
        cache: 'no-store',
      });
      if (!response.ok || !response.body) {
        throw new Error(`The recording answered ${response.status}.`);
      }
      const events: ImportEvent[] = [];
      await readNdjson(response.body, event => events.push(event), handlers.onMalformed);
      await createReplaySource(events, { speed }).run(runRequest, handlers, signal);
    },
  };
}

/** What a page needs to describe a recording before it fetches it. */
export function replayMeta(events: readonly ImportEvent[]): { request: ImportRequest | null; durationMs: number | null } {
  const start = events.find(event => event.type === 'start');
  const done = events.find(event => event.type === 'done');
  return {
    request: start?.type === 'start' ? { wallets: start.wallets, chains: start.chains } : null,
    durationMs: done ? eventMs(done) : null,
  };
}

/**
 * A live importer that answers a POST of ImportRequest with newline-delimited
 * JSON, one ImportEvent per line. Not wired to anything yet: it is here so the
 * flow's contract is proven against both kinds of source.
 */
export function createStreamSource({ endpoint }: { endpoint: string }): ImportSource {
  return {
    kind: 'live',
    fixedRequest: null,
    durationMs: null,
    async run(request, { onEvent, onMalformed }, signal) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
        body: JSON.stringify(request),
        signal,
        cache: 'no-store',
      });
      if (!response.ok || !response.body) {
        throw new Error(`The importer answered ${response.status}.`);
      }
      await readNdjson(response.body, onEvent, onMalformed);
    },
  };
}

/**
 * Reads newline-delimited JSON as it arrives. A network chunk usually ends
 * mid-line, so the unfinished tail waits for the next chunk. A line that does
 * not parse, or is not an ImportEvent, costs one event, not the import.
 */
export async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ImportEvent) => void,
  onMalformed?: () => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let tail = '';

  const parseLine = (raw: string) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!line.trim()) return;
    try {
      const value: unknown = JSON.parse(line);
      if (isImportEvent(value)) onEvent(value);
      else onMalformed?.();
    } catch {
      onMalformed?.();
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = (tail + decoder.decode(value, { stream: true })).split('\n');
      tail = lines.pop() ?? '';
      lines.forEach(parseLine);
    }
    parseLine(tail + decoder.decode());
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Already released by an abort.
    }
  }
}

/**
 * A recorded run trimmed to what the import screens read. Descriptions,
 * originals and per-work evidence notes are dropped, which roughly halves
 * what the page sends to the browser for a large run.
 */
export function slimReplay(events: readonly ImportEvent[]): ImportEvent[] {
  return events.map(event =>
    event.type === 'works'
      ? {
          ...event,
          works: event.works.map(work => ({
            ...work,
            description: null,
            image: null,
            animationUrl: null,
            evidence: { signal: work.evidence.signal, wallet: work.evidence.wallet },
          })),
        }
      : event
  );
}

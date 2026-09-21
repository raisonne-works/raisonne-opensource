import type { ReactNode } from 'react';

import { ImportFlow } from '@/components/raisonne/import/import-flow';
import { ImportProgress } from '@/components/raisonne/import/import-progress';
import { importReducer, initialImportState, replayState } from '@/components/raisonne/import/import-state';
import { ImportSummary } from '@/components/raisonne/import/import-summary';
import { SeriesReview } from '@/components/raisonne/import/series-review';
import { WalletForm } from '@/components/raisonne/import/wallet-form';
import { WorksPreview } from '@/components/raisonne/import/works-preview';
import { Section } from '@/components/raisonne/shell/page';

import { Specimen, SpecimenGrid } from '../_foundations/specimen';
import { EMPTY_IMPORT, FAILED_IMPORT, SAMPLE_IMPORT, SAMPLE_WALLETS } from './import-samples';

/** Frozen moments of the sample runs, built by the same reducer the live page uses. */
function states() {
  const early = replayState(SAMPLE_IMPORT, { untilMs: 900 });
  const mid = replayState(SAMPLE_IMPORT, { untilMs: 3800 });
  const done = replayState(SAMPLE_IMPORT);
  return {
    idle: initialImportState,
    early,
    mid,
    done,
    stopped: importReducer(mid, { kind: 'aborted', at: null }),
    failed: replayState(FAILED_IMPORT, { settle: true }),
    empty: replayState(EMPTY_IMPORT),
    /** Every series switched off, as someone might leave it. */
    noneOn: Object.fromEntries(done.seriesOrder.map(key => [key, false])),
  };
}

function StateGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 }) {
  return (
    <div
      className={
        columns === 2
          ? 'grid w-full items-start gap-x-6 gap-y-8 xl:grid-cols-2'
          : 'grid w-full items-start gap-x-6 gap-y-8 lg:grid-cols-2 2xl:grid-cols-3'
      }
    >
      {children}
    </div>
  );
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** The import components in each of their states, then the whole flow replaying a short sample run. */
export function ImportSection() {
  const s = states();

  return (
    <Section
      id="import"
      title="Import"
      description="The moment an artist connects wallets and watches their works appear. Every step renders the same reducer over the importer's event stream, so a live run, a recorded replay and these frozen samples look alike. Samples use the fictional demo artist and CC0 images from The Met."
    >
      <Section id="import-flow" headingLevel={3} title="The whole flow" className="py-6 md:py-8">
        <SpecimenGrid>
          <Specimen
            title="ImportFlow"
            source="raisonne/import/import-flow"
            span="full"
            stageClassName="block border-0 p-0 sm:p-0"
            note="Orchestrates the steps. Today it replays a recorded run at its original timing, labelled with a Badge and restartable; passing a live source (createStreamSource) instead of a replay runs a real import with no other change. Press Import or Play to watch this six-second sample."
          >
            <ImportFlow replay={SAMPLE_IMPORT} headingLevel={5} />
          </Specimen>
        </SpecimenGrid>
      </Section>

      <Section id="import-steps" headingLevel={3} title="Steps" className="py-6 md:py-8">
        <SpecimenGrid>
          <Specimen
            title="WalletForm"
            source="raisonne/import/wallet-form"
            span="full"
            stageClassName="block border-0 p-0 sm:p-0"
            note="A Textarea in a Field for the addresses, checked after the first blur and on submit (bad tokens are named, ENS names get their own hint, ten wallets at most), and chain choice cards with what each chain scans. Cmd or Ctrl + Enter submits. While a run is live the same button becomes Stop, so focus stays put."
          >
            <StateGrid>
              <State label="Empty">
                <WalletForm headingLevel={5} />
              </State>
              <State label="Invalid input">
                <WalletForm
                  headingLevel={5}
                  defaultWallets={`${SAMPLE_WALLETS[0]}\nstudio.eth\n0x12ab`}
                  defaultChains={['ethereum']}
                />
              </State>
              <State label="Replay: locked to the recorded wallets">
                <WalletForm headingLevel={5} defaultWallets={SAMPLE_WALLETS} locked />
              </State>
              <State label="Running">
                <WalletForm headingLevel={5} defaultWallets={SAMPLE_WALLETS} locked running />
              </State>
            </StateGrid>
          </Specimen>

          <Specimen
            title="ImportProgress"
            source="raisonne/import/import-progress"
            span="full"
            stageClassName="block border-0 p-0 sm:p-0"
            note="The six passes per chain in a Table: a Spinner and live timer while a pass runs, a check with its count and duration when it is done, and the importer's own note underneath from sm up. A pass that runs once for all chains spans the columns. Problems land in a destructive Alert; a stop gets a plain one."
          >
            <StateGrid columns={2}>
              <State label="Ready">
                <ImportProgress state={s.idle} headingLevel={5} />
              </State>
              <State label="Running">
                <ImportProgress state={s.mid} headingLevel={5} />
              </State>
              <State label="Done">
                <ImportProgress state={s.done} headingLevel={5} />
              </State>
              <State label="Failed">
                <ImportProgress state={s.failed} headingLevel={5} />
              </State>
              <State label="Stopped">
                <ImportProgress state={s.stopped} headingLevel={5} />
              </State>
            </StateGrid>
          </Specimen>

          <Specimen
            title="WorksPreview"
            source="raisonne/import/works-preview"
            span="full"
            stageClassName="flex-col items-stretch gap-10"
            note="The art, as soon as it loads: stills from the series being included, one work per series at a time, in the site's media grid. Always two full rows, from 2 columns on phones to 6 at 2560 px."
          >
            <State label="Loading">
              <WorksPreview state={s.early} headingLevel={5} />
            </State>
            <State label="Loaded">
              <WorksPreview state={s.done} headingLevel={5} />
            </State>
            <State label="Empty: nothing switched on">
              <WorksPreview state={s.done} overrides={s.noneOn} headingLevel={5} />
            </State>
          </Specimen>

          <Specimen
            title="SeriesReview"
            source="raisonne/import/series-review"
            span="full"
            stageClassName="block border-0 p-0 sm:p-0"
            note="A Table of what was found: name and contract, chain, work count, EvidenceBadges and an include Switch. Confirmed series start on; co-authored ones start off with the reason in words; suggested ones sit under a collapsed Probably not yours, each with why. On phones the columns fold under the name."
          >
            <StateGrid columns={2}>
              <State label="Found (open Probably not yours)">
                <SeriesReview state={s.done} headingLevel={5} />
              </State>
              <State label="Partly found, still running">
                <SeriesReview state={s.mid} headingLevel={5} />
              </State>
              <State label="Loading">
                <SeriesReview state={s.early} headingLevel={5} />
              </State>
              <State label="Nothing yet">
                <SeriesReview state={s.idle} headingLevel={5} />
              </State>
              <State label="Nothing found">
                <SeriesReview state={s.empty} headingLevel={5} />
              </State>
            </StateGrid>
          </Specimen>

          <Specimen
            title="ImportSummary"
            source="raisonne/import/import-summary"
            span="full"
            stageClassName="block border-0 p-0 sm:p-0"
            note="Series and works that would be added, time to the first series and total time. The next step is shown but off until the site is installed: the Button stays focusable so its Tooltip opens on hover and keyboard focus."
          >
            <StateGrid columns={2}>
              <State label="Done">
                <ImportSummary state={s.done} headingLevel={5} />
              </State>
              <State label="Running">
                <ImportSummary state={s.mid} headingLevel={5} />
              </State>
              <State label="Stopped">
                <ImportSummary state={s.stopped} headingLevel={5} />
              </State>
            </StateGrid>
          </Specimen>
        </SpecimenGrid>
      </Section>
    </Section>
  );
}

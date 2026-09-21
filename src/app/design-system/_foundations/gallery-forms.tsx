import { SearchIcon, WalletIcon } from 'lucide-react';

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
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { Specimen } from './specimen';

const CHAINS = [
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Base', value: 'base' },
  { label: 'Tezos', value: 'tezos' },
  { label: 'Bitcoin', value: 'bitcoin' },
  { label: 'Solana', value: 'solana' },
];

const SORTS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Title, A to Z', value: 'title' },
];

export function FormSpecimens() {
  return (
    <>
      <Specimen
        title="Field and input"
        source="ui/field, ui/input, ui/label"
        span={2}
        stageClassName="items-start"
        note="Every control has a visible label. Descriptions say what is expected before the viewer types; errors say how to fix the value, next to it, and set aria-invalid."
      >
        <FieldGroup className="grid gap-6 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ds-artist-name">Artist name</FieldLabel>
            <Input id="ds-artist-name" defaultValue="Demo Artist" autoComplete="off" />
            <FieldDescription>Shown in the header and in every page title.</FieldDescription>
          </Field>
          <Field data-invalid="true">
            <FieldLabel htmlFor="ds-wallet">Wallet address</FieldLabel>
            <Input
              id="ds-wallet"
              defaultValue="0x0000de01"
              aria-invalid="true"
              aria-describedby="ds-wallet-error"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <FieldError id="ds-wallet-error">Enter the full address: 0x followed by 40 characters.</FieldError>
          </Field>
          <Field data-disabled="true">
            <FieldLabel htmlFor="ds-contract">Contract</FieldLabel>
            <Input id="ds-contract" defaultValue="0x000000000000000000000000000000de000001" disabled className="font-mono" />
            <FieldDescription>Set by the importer. It cannot be edited.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="ds-statement">Statement</FieldLabel>
            <Textarea id="ds-statement" placeholder="A few paragraphs about the practice." rows={3} />
          </Field>
        </FieldGroup>
      </Specimen>

      <Specimen
        title="Input group"
        source="ui/input-group"
        stageClassName="flex-col items-stretch"
        note="An input with an icon, a prefix or a hint attached. The addon is decoration; the input keeps its own label (visible or sr-only)."
      >
        <div className="flex w-full flex-col gap-2">
          <Label htmlFor="ds-search">Search works</Label>
          <InputGroup>
            <InputGroupInput id="ds-search" placeholder="Title, series or token id" />
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Kbd>/</Kbd>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Label htmlFor="ds-ens">Wallet or ENS name</Label>
          <InputGroup>
            <InputGroupAddon>
              <WalletIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput id="ds-ens" placeholder="name.eth or 0x..." className="font-mono" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>Ethereum</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Specimen>

      <Specimen
        title="Select"
        source="ui/select"
        stageClassName="items-end"
        note="For one choice from a short, known list. Pass items to Select so the trigger shows the label, not the value."
      >
        <Field className="w-full max-w-56">
          <FieldLabel htmlFor="ds-chain">Chain</FieldLabel>
          <Select items={CHAINS} defaultValue="ethereum">
            <SelectTrigger id="ds-chain" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CHAINS.map(chain => (
                  <SelectItem key={chain.value} value={chain.value}>
                    {chain.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-full max-w-56">
          <FieldLabel htmlFor="ds-sort">Sort</FieldLabel>
          <Select items={SORTS} defaultValue="newest">
            <SelectTrigger id="ds-sort" size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SORTS.map(sort => (
                  <SelectItem key={sort.value} value={sort.value}>
                    {sort.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </Specimen>

      <Specimen
        title="Checkbox and switch"
        source="ui/checkbox, ui/switch"
        stageClassName="items-start"
        note="Checkboxes choose items (several may be on). Switches change a setting that applies at once. The whole row is the label."
      >
        <FieldSet className="w-full">
          <FieldLegend variant="label">Include in the catalogue</FieldLegend>
          <FieldGroup className="gap-3">
            <Field orientation="horizontal">
              <Checkbox id="ds-include-series" defaultChecked />
              <FieldLabel htmlFor="ds-include-series">Series (contracts you deployed)</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="ds-include-shared" />
              <FieldContent>
                <FieldLabel htmlFor="ds-include-shared">Marketplace 1/1s</FieldLabel>
                <FieldDescription>Your tokens on shared platform contracts.</FieldDescription>
              </FieldContent>
            </Field>
            <Field orientation="horizontal" data-disabled="true">
              <Checkbox id="ds-include-airdrops" disabled />
              <FieldLabel htmlFor="ds-include-airdrops">Airdrops you received</FieldLabel>
            </Field>
          </FieldGroup>
        </FieldSet>
        <FieldGroup className="w-full gap-3">
          <Field orientation="horizontal">
            <Switch id="ds-token-ids" defaultChecked />
            <FieldLabel htmlFor="ds-token-ids">Show token ids on work cards</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id="ds-html" size="sm" />
            <FieldLabel htmlFor="ds-html">Run interactive (HTML) works in the viewer</FieldLabel>
          </Field>
        </FieldGroup>
      </Specimen>
    </>
  );
}

'use client';

import Link from 'next/link';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { CheckCircle2Icon, PlusIcon, SendIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

import { AddressFields } from '@/components/raisonne/checkout/address-fields';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

/**
 * Two conventions this form keeps, because it used to keep neither.
 *
 * Optional was marked two ways, as a "(optional)" label suffix on two fields
 * and as helper text under another, so a reader could not tell whether the
 * three were the same kind of thing. And the field widths ran 260, 280 and
 * 530 px with nothing deciding which was which. One marker, one width for a
 * short answer, and helper text reserved for actual help.
 */
const OPTIONAL = <span className="font-normal text-muted-foreground">(optional)</span>;

const FIELD_WIDTH = 'max-w-[28rem]';

import type { CheckoutErrors } from '@/lib/store/checkout';
import { emptyAddress } from '@/lib/store/checkout';
import {
  BRIEF_MAX_LENGTH,
  COMMISSION_HONEYPOT_FIELD,
  type CommissionErrors,
  type CommissionForm,
  MAX_REFERENCES,
  MAX_WORKS,
  parseCommissionRequest,
} from '@/lib/store/commission-request';
import type { CommissionKind, PostalAddress } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The commission enquiry.
 *
 * One page rather than a wizard. A brief is a piece of writing, and a person
 * writing one wants to see the whole of what is being asked before they
 * start: a five-step flow hides the address field until after somebody has
 * spent ten minutes on the description.
 *
 * Nothing is charged and nothing is reserved. What the studio needs to
 * answer is asked for, in the artist's own words, and the questions come
 * from the install's data rather than from this file.
 */

export interface HoldingOption {
  workId: string;
  title: string;
}

type Phase = 'editing' | 'sending' | 'sent';

export function CommissionRequestForm({
  form,
  currency,
  holdings = [],
  holdingsNote = null,
  signedIn = false,
  /** Which kind to start on, e.g. when a phygital product sent the visitor here. */
  startKind,
  className,
}: {
  form: CommissionForm;
  currency: string;
  /** The signed-in collector's own works, for a physical object made from one. */
  holdings?: readonly HoldingOption[];
  /** Why there is no list of works to pick from, when there is not one. */
  holdingsNote?: string | null;
  signedIn?: boolean;
  startKind?: CommissionKind | null;
  className?: string;
}) {
  const id = useId();
  const [kind, setKind] = useState<CommissionKind>(
    (startKind && form.kinds.some(entry => entry.kind === startKind) ? startKind : form.kinds[0]?.kind) ?? 'digital',
  );
  const [artefact, setArtefact] = useState('');
  const [brief, setBrief] = useState('');
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<string[]>(['']);
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [email, setEmail] = useState('');
  const [workIds, setWorkIds] = useState<string[]>([]);
  const [address, setAddress] = useState<PostalAddress>(() => emptyAddress());
  const [wantsAddress, setWantsAddress] = useState(false);

  const [errors, setErrors] = useState<CommissionErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('editing');
  const [reference, setReference] = useState<string | null>(null);

  const chosen = form.kinds.find(entry => entry.kind === kind) ?? null;
  const artefacts = chosen?.artefacts ?? [];
  const isPhygital = kind === 'phygital';

  const addressErrors: CheckoutErrors = useMemo(() => {
    const found: Record<string, string> = {};
    for (const [key, message] of Object.entries(errors)) {
      if (key.startsWith('address.')) found[key.slice('address.'.length)] = message;
    }
    return found as CheckoutErrors;
  }, [errors]);

  function payload() {
    return {
      kind,
      artefact: artefact || null,
      brief,
      specs,
      references: references.filter(Boolean),
      workIds,
      budget,
      deadline,
      email,
      shippingAddress: isPhygital && wantsAddress ? address : null,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === 'sending') return;

    // The same function the route runs, so the form says what the server
    // would say rather than guessing at it.
    const checked = parseCommissionRequest(payload(), { form, currency });
    if (!checked.ok) {
      setErrors(checked.errors);
      setFailure(checked.message);
      return;
    }

    setErrors({});
    setFailure(null);
    setPhase('sending');

    try {
      const trap = new FormData(event.currentTarget).get(COMMISSION_HONEYPOT_FIELD);
      const response = await fetch('/api/commissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload(), [COMMISSION_HONEYPOT_FIELD]: trap ?? '' }),
      });
      const data = (await response.json().catch(() => null)) as
        | { number?: string | null; error?: string; errors?: CommissionErrors }
        | null;

      if (!response.ok) {
        setErrors(data?.errors ?? {});
        setFailure(data?.error ?? 'That did not go through. Try again in a moment.');
        setPhase('editing');
        return;
      }

      setReference(data?.number ?? null);
      setPhase('sent');
    } catch {
      setFailure('That did not go through. Try again in a moment.');
      setPhase('editing');
    }
  }

  if (phase === 'sent') {
    return (
      <Card className={cn('max-w-[40rem]', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon aria-hidden className="size-5" />
            The brief is with the studio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          {reference ? (
            <p className="text-sm">
              Your reference is <span className="font-mono font-medium">{reference}</span>. Keep it: it is how the
              studio finds this brief.
            </p>
          ) : null}
          <p className="text-sm text-pretty text-muted-foreground">
            Nothing has been charged and nothing is agreed yet. The studio reads the brief and writes back with what it
            would take.
          </p>
          {signedIn ? (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/orders" />}>
              See it on your orders page
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const sending = phase === 'sending';

  return (
    <form onSubmit={submit} noValidate className={cn('flex max-w-[46rem] flex-col gap-10', className)}>
      {form.kinds.length > 1 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="pb-3 text-lg font-semibold tracking-tight">What kind of commission</legend>
          <div role="radiogroup" aria-label="Kind of commission" className="grid gap-3 sm:grid-cols-2">
            {form.kinds.map(entry => (
              <label
                key={entry.kind}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-lg border border-border p-4 transition-colors',
                  kind === entry.kind ? 'bg-muted' : 'hover:bg-muted/50',
                )}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={`${id}-kind`}
                    value={entry.kind}
                    checked={kind === entry.kind}
                    onChange={() => {
                      setKind(entry.kind);
                      setArtefact('');
                    }}
                    disabled={sending}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span className="text-sm font-medium">{entry.title}</span>
                </span>
                {entry.description ? (
                  <span className="text-sm text-pretty text-muted-foreground">{entry.description}</span>
                ) : null}
              </label>
            ))}
          </div>
          <FieldError>{errors.kind}</FieldError>
        </fieldset>
      ) : null}

      {artefacts.length > 0 ? (
        <Field className={FIELD_WIDTH}>
          <FieldLabel htmlFor={`${id}-artefact`}>What should it be {OPTIONAL}</FieldLabel>
          <Select
            items={artefacts.map(value => ({ value, label: value }))}
            value={artefact || null}
            onValueChange={value => setArtefact(typeof value === 'string' ? value : '')}
            disabled={sending}
          >
            <SelectTrigger id={`${id}-artefact`} className="w-full">
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {artefacts.map(value => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>The studio will suggest something if you are not sure.</FieldDescription>
          <FieldError>{errors.artefact}</FieldError>
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={`${id}-brief`} className="text-lg font-semibold tracking-tight">
          The brief
        </FieldLabel>
        <Textarea
          id={`${id}-brief`}
          rows={7}
          maxLength={BRIEF_MAX_LENGTH}
          value={brief}
          onChange={event => setBrief(event.target.value)}
          aria-invalid={errors.brief ? true : undefined}
          disabled={sending}
          placeholder="What you have in mind: the idea, the feeling, where it would live, anything it has to do."
          required
        />
        {/* Only once there is something to count. "4000 characters left"
            over an empty box is a limit announced before anyone has come
            near it. */}
        {brief.length > 0 ? (
          <FieldDescription>{BRIEF_MAX_LENGTH - brief.length} characters left.</FieldDescription>
        ) : null}
        <FieldError>{errors.brief}</FieldError>
      </Field>

      {form.questions.length > 0 ? (
        <fieldset className="flex flex-col gap-5">
          <legend className="pb-3 text-lg font-semibold tracking-tight">What the studio asks</legend>
          {form.questions.map(question => (
            <Field key={question.id}>
              <FieldLabel htmlFor={`${id}-q-${question.id}`}>
                {question.label}
                {question.required ? null : <> {OPTIONAL}</>}
              </FieldLabel>
              <Input
                id={`${id}-q-${question.id}`}
                value={specs[question.id] ?? ''}
                onChange={event => setSpecs(current => ({ ...current, [question.id]: event.target.value }))}
                aria-invalid={errors[`specs.${question.id}`] ? true : undefined}
                disabled={sending}
              />
              {question.help ? <FieldDescription>{question.help}</FieldDescription> : null}
              <FieldError>{errors[`specs.${question.id}`]}</FieldError>
            </Field>
          ))}
        </fieldset>
      ) : null}

      {isPhygital ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="pb-3 text-lg font-semibold tracking-tight">Which work it is made from</legend>
          {holdings.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Read from the chain for the wallet you signed in with. Pick up to {MAX_WORKS}.
              </p>
              <ul className="flex flex-col gap-2">
                {holdings.map(holding => {
                  const checked = workIds.includes(holding.workId);
                  return (
                    <li key={holding.workId}>
                      <Field orientation="horizontal">
                        <Checkbox
                          id={`${id}-work-${holding.workId}`}
                          checked={checked}
                          disabled={sending || (!checked && workIds.length >= MAX_WORKS)}
                          onCheckedChange={next =>
                            setWorkIds(current =>
                              next ? [...current, holding.workId] : current.filter(entry => entry !== holding.workId),
                            )
                          }
                        />
                        <FieldLabel htmlFor={`${id}-work-${holding.workId}`}>{holding.title}</FieldLabel>
                      </Field>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-pretty text-muted-foreground">
              {holdingsNote ?? 'Name the work in the brief above and the studio will find it.'}
            </p>
          )}
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="pb-3 text-lg font-semibold tracking-tight">References</legend>
        <p className="text-sm text-muted-foreground">
          Links to anything that helps: work of the studio&rsquo;s you are thinking of, a room, a palette. Up to{' '}
          {MAX_REFERENCES}.
        </p>
        <ul className="flex flex-col gap-2">
          {references.map((value, index) => (
            // The index is the identity here: these are positions in a list
            // the person is editing, not records with ids of their own.
            <li key={`reference-${index}`} className="flex items-center gap-2">
              <Input
                type="url"
                inputMode="url"
                placeholder="https://"
                value={value}
                aria-label={`Reference ${index + 1}`}
                onChange={event =>
                  setReferences(current => current.map((entry, position) => (position === index ? event.target.value : entry)))
                }
                disabled={sending}
              />
              {references.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove reference ${index + 1}`}
                  disabled={sending}
                  onClick={() => setReferences(current => current.filter((_, position) => position !== index))}
                >
                  <XIcon aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {references.length < MAX_REFERENCES ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={sending}
            onClick={() => setReferences(current => [...current, ''])}
          >
            <PlusIcon aria-hidden data-icon="inline-start" />
            Another link
          </Button>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="pb-3 text-lg font-semibold tracking-tight">Budget and timing</legend>
        <Field>
          <FieldLabel htmlFor={`${id}-budget`}>Budget, in {currency} {OPTIONAL}</FieldLabel>
          <Input
            id={`${id}-budget`}
            inputMode="decimal"
            value={budget}
            onChange={event => setBudget(event.target.value)}
            disabled={sending}
            placeholder="2500"
          />
          <FieldDescription>It does not have to be exact. It saves a round of email.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-deadline`}>Needed by {OPTIONAL}</FieldLabel>
          <Input
            id={`${id}-deadline`}
            type="date"
            value={deadline}
            onChange={event => setDeadline(event.target.value)}
            aria-invalid={errors.deadline ? true : undefined}
            disabled={sending}
          />
          <FieldError>{errors.deadline}</FieldError>
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="pb-3 text-lg font-semibold tracking-tight">How to reach you</legend>
        <Field className={FIELD_WIDTH}>
          <FieldLabel htmlFor={`${id}-email`}>Email address</FieldLabel>
          <Input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            disabled={sending}
            required
          />
          <FieldError>{errors.email}</FieldError>
        </Field>

        {isPhygital ? (
          <>
            <Field orientation="horizontal">
              <Checkbox
                id={`${id}-wants-address`}
                checked={wantsAddress}
                onCheckedChange={next => setWantsAddress(next === true)}
                disabled={sending}
              />
              <FieldLabel htmlFor={`${id}-wants-address`}>
                Add the address it would be sent to, so the studio can quote the shipping
              </FieldLabel>
            </Field>
            {wantsAddress ? (
              <AddressFields
                address={address}
                onChange={setAddress}
                errors={addressErrors}
                idPrefix={`${id}-addr`}
                disabled={sending}
              />
            ) : null}
          </>
        ) : null}
      </fieldset>

      {/* Honeypot: off screen, not announced, never filled by a person. */}
      <div aria-hidden className="sr-only">
        <label htmlFor={`${id}-trap`}>Website</label>
        <input id={`${id}-trap`} name={COMMISSION_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {failure ? (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>The brief was not sent</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? <Spinner aria-hidden data-icon="inline-start" /> : <SendIcon aria-hidden data-icon="inline-start" />}
          {sending ? 'Sending' : 'Send the brief'}
        </Button>
        <p className="text-sm text-muted-foreground">Nothing is charged and nothing is agreed by sending this.</p>
      </div>
    </form>
  );
}

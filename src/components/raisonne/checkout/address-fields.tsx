'use client';

import { useMemo } from 'react';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type CheckoutErrors, COUNTRY_CODES, countryOptions, needsPostalCode } from '@/lib/store/checkout';
import type { PostalAddress } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Where a parcel goes.
 *
 * Used at checkout and again when somebody commissions a physical object, so
 * the two ask for the same things in the same order and validate them the
 * same way.
 *
 * Two decisions worth naming. The country comes first, because it decides
 * whether a postcode is asked for at all and which shipping methods exist:
 * asking for it last is how a form tells somebody in Hong Kong that their
 * postcode is required. And every field carries a real autocomplete token,
 * so a browser can fill the whole thing at once.
 */
export function AddressFields({
  address,
  onChange,
  errors = {},
  idPrefix,
  /** Only these countries are offered, when the install ships to a few. */
  countries,
  disabled = false,
  className,
}: {
  address: PostalAddress;
  onChange: (next: PostalAddress) => void;
  errors?: CheckoutErrors;
  idPrefix: string;
  countries?: readonly string[];
  disabled?: boolean;
  className?: string;
}) {
  const options = useMemo(() => countryOptions(countries?.length ? countries : COUNTRY_CODES), [countries]);
  const postcodeWanted = !address.country || needsPostalCode(address.country);

  function set<K extends keyof PostalAddress>(key: K, value: PostalAddress[K]) {
    onChange({ ...address, [key]: value });
  }

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Field>
        <FieldLabel htmlFor={id('country')}>Country</FieldLabel>
        <Select
          items={options}
          value={address.country || null}
          onValueChange={value => set('country', typeof value === 'string' ? value : '')}
          disabled={disabled}
        >
          <SelectTrigger id={id('country')} className="w-full" aria-invalid={errors.country ? true : undefined}>
            <SelectValue placeholder="Choose a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError>{errors.country}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={id('name')}>Full name</FieldLabel>
        <Input
          id={id('name')}
          name="name"
          autoComplete="name"
          value={address.name}
          onChange={event => set('name', event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          disabled={disabled}
          required
        />
        <FieldError>{errors.name}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={id('line1')}>Street and number</FieldLabel>
        <Input
          id={id('line1')}
          name="address-line1"
          autoComplete="address-line1"
          value={address.line1}
          onChange={event => set('line1', event.target.value)}
          aria-invalid={errors.line1 ? true : undefined}
          disabled={disabled}
          required
        />
        <FieldError>{errors.line1}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={id('line2')}>Apartment, floor or company</FieldLabel>
        <Input
          id={id('line2')}
          name="address-line2"
          autoComplete="address-line2"
          value={address.line2 ?? ''}
          onChange={event => set('line2', event.target.value)}
          disabled={disabled}
        />
        <FieldDescription>Optional.</FieldDescription>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={id('city')}>Town or city</FieldLabel>
          <Input
            id={id('city')}
            name="city"
            autoComplete="address-level2"
            value={address.city}
            onChange={event => set('city', event.target.value)}
            aria-invalid={errors.city ? true : undefined}
            disabled={disabled}
            required
          />
          <FieldError>{errors.city}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor={id('postalCode')}>Postal code</FieldLabel>
          <Input
            id={id('postalCode')}
            name="postal-code"
            autoComplete="postal-code"
            inputMode="text"
            value={address.postalCode}
            onChange={event => set('postalCode', event.target.value)}
            aria-invalid={errors.postalCode ? true : undefined}
            disabled={disabled || !postcodeWanted}
            required={postcodeWanted}
          />
          <FieldError>{errors.postalCode}</FieldError>
          {!postcodeWanted ? <FieldDescription>Not used in this country.</FieldDescription> : null}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={id('region')}>State, province or region</FieldLabel>
          <Input
            id={id('region')}
            name="region"
            autoComplete="address-level1"
            value={address.region ?? ''}
            onChange={event => set('region', event.target.value)}
            disabled={disabled}
          />
          <FieldDescription>Optional.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor={id('phone')}>Phone</FieldLabel>
          <Input
            id={id('phone')}
            name="tel"
            type="tel"
            autoComplete="tel"
            value={address.phone ?? ''}
            onChange={event => set('phone', event.target.value)}
            disabled={disabled}
          />
          <FieldDescription>Couriers ask for one. Optional.</FieldDescription>
        </Field>
      </div>
    </div>
  );
}

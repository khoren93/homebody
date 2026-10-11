import type { InputHTMLAttributes } from 'react';

import { formatNumber } from '@/i18n/format';
import { useLocale } from '@/i18n/useFormat';
import { parseNumber } from '@/lib/parseNumber';
import { useDraft } from '@/lib/useDraft';

import { Input } from './Field';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max'
> & {
  value: number | null;
  /** Called with a valid number once the user leaves the field or presses Enter. */
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  /** Only whole numbers are accepted. */
  integer?: boolean;
};

/**
 * A numeric field that accepts decimal commas and commits on blur or Enter.
 * Values outside the range are clamped; text that is not a number is dropped.
 */
export function NumberInput({ value, onCommit, min, max, integer = false, ...rest }: Props) {
  const locale = useLocale();
  const shown = value === null ? '' : formatNumber(value, locale);

  const draft = useDraft(shown, (text) => {
    let parsed = parseNumber(text);
    if (parsed === null) return;
    if (integer) parsed = Math.round(parsed);
    if (min !== undefined) parsed = Math.max(min, parsed);
    if (max !== undefined) parsed = Math.min(max, parsed);
    if (parsed !== value) onCommit(parsed);
  });

  return (
    <Input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      {...rest}
      {...draft}
    />
  );
}

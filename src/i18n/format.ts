import type { IsoDate } from '@/engine';

import type { Locale } from './locale';

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

const DATE_STYLES = {
  /** Mon, Oct 12 */
  short: { weekday: 'short', day: 'numeric', month: 'short' },
  /** Mon, Oct 12, 2026 */
  long: { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
  /** Oct 12 */
  dayMonth: { day: 'numeric', month: 'short' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof DATE_STYLES;

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) {
    // ISO dates are calendar days, so they are always formatted in UTC.
    format = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    dateFormats.set(key, format);
  }
  return format;
}

function toDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function capitalize(text: string, locale: Locale): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** Formats a number with at most `maxDigits` decimals and the locale's decimal separator. */
export function formatNumber(value: number, locale: Locale, maxDigits = 2): string {
  const key = `${locale}|${maxDigits}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      maximumFractionDigits: maxDigits,
      useGrouping: false,
    });
    numberFormats.set(key, format);
  }
  return format.format(value);
}

/** A number with an explicit sign: `+1.5`, `−2`, `0`. */
export function formatSigned(value: number, locale: Locale, maxDigits = 1): string {
  const text = formatNumber(Math.abs(value), locale, maxDigits);
  if (value > 0) return `+${text}`;
  if (value < 0) return `−${text}`;
  return text;
}

export function formatDate(date: IsoDate, locale: Locale, style: DateStyle = 'short'): string {
  return capitalize(dateFormat(locale, DATE_STYLES[style]).format(toDate(date)), locale);
}

/** Weekday, day of month and month as separate strings, for calendar-style badges. */
export function dateParts(
  date: IsoDate,
  locale: Locale,
): { weekday: string; day: string; month: string } {
  const value = toDate(date);
  return {
    weekday: dateFormat(locale, { weekday: 'short' }).format(value),
    day: dateFormat(locale, { day: 'numeric' }).format(value),
    month: dateFormat(locale, { month: 'short' }).format(value).replace(/\.$/, ''),
  };
}

/** Short weekday names starting with Monday. */
export function weekdayNames(locale: Locale): string[] {
  const format = dateFormat(locale, { weekday: 'short' });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) =>
    capitalize(format.format(new Date(Date.UTC(2024, 0, 1 + i))), locale),
  );
}

/** Seconds as `m:ss`. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

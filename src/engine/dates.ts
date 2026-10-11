import type { IsoDate } from './types';

const DAY_MS = 86_400_000;

/**
 * Dates are handled as calendar days in UTC, so the arithmetic never depends
 * on the device time zone or on daylight saving changes.
 */
function toUtc(date: IsoDate): number {
  const [year = NaN, month = NaN, day = NaN] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): value is IsoDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUtc(toUtc(value)) === value;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** Day of the week with Monday as 0 and Sunday as 6. */
export function weekday(date: IsoDate): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

/** The first Monday on or after `date`. */
export function mondayOnOrAfter(date: IsoDate): IsoDate {
  return addDays(date, (7 - weekday(date)) % 7);
}

/** The calendar date of a `Date` in the device's local time zone. */
export function toIsoDate(date: Date): IsoDate {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

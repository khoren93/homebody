import { describe, expect, it } from 'vitest';

import { addDays, diffDays, isIsoDate, mondayOnOrAfter, toIsoDate, weekday } from '../dates';

describe('dates', () => {
  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-10-12', 0)).toBe('2026-10-12');
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is not affected by daylight saving changes', () => {
    // Clocks change on 2026-03-29 and 2026-10-25 in Europe.
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });

  it('counts whole days between dates', () => {
    expect(diffDays('2026-10-12', '2026-10-12')).toBe(0);
    expect(diffDays('2026-10-12', '2026-11-12')).toBe(31);
    expect(diffDays('2026-10-12', '2026-10-05')).toBe(-7);
  });

  it('numbers weekdays from Monday', () => {
    expect(weekday('2026-10-12')).toBe(0); // Monday
    expect(weekday('2026-10-14')).toBe(2);
    expect(weekday('2026-10-18')).toBe(6); // Sunday
  });

  it('finds the first Monday on or after a date', () => {
    expect(mondayOnOrAfter('2026-10-12')).toBe('2026-10-12');
    expect(mondayOnOrAfter('2026-10-13')).toBe('2026-10-19');
    expect(mondayOnOrAfter('2026-10-18')).toBe('2026-10-19');
  });

  it('recognises valid ISO dates', () => {
    expect(isIsoDate('2026-10-12')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-1-5')).toBe(false);
    expect(isIsoDate('12.10.2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('formats the local calendar date of a Date', () => {
    expect(toIsoDate(new Date(2026, 9, 12, 23, 59))).toBe('2026-10-12');
    expect(toIsoDate(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });
});

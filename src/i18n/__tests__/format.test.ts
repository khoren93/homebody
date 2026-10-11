import { describe, expect, it } from 'vitest';

import { requireExercise } from '@/data';

import { exerciseName, photoMismatch } from '../exercise';
import {
  capitalize,
  dateParts,
  formatClock,
  formatDate,
  formatNumber,
  formatSigned,
  weekdayNames,
} from '../format';

describe('number formatting', () => {
  it('uses the decimal separator of the locale and at most two decimals', () => {
    expect(formatNumber(22.5, 'en')).toBe('22.5');
    expect(formatNumber(22.5, 'ru')).toBe('22,5');
    expect(formatNumber(1.256, 'en')).toBe('1.26');
    expect(formatNumber(80, 'ru')).toBe('80');
    expect(formatNumber(1234.5, 'en')).toBe('1234.5');
    expect(formatNumber(37.64, 'en', 1)).toBe('37.6');
  });

  it('formats signed numbers', () => {
    expect(formatSigned(1.5, 'ru')).toBe('+1,5');
    expect(formatSigned(-2, 'en')).toBe('−2');
    expect(formatSigned(0, 'en')).toBe('0');
  });
});

describe('date formatting', () => {
  it('formats calendar dates independently of the time zone', () => {
    expect(formatDate('2026-10-12', 'en')).toBe('Mon, Oct 12');
    expect(formatDate('2026-10-12', 'en', 'long')).toBe('Mon, Oct 12, 2026');
    expect(formatDate('2026-10-12', 'en', 'dayMonth')).toBe('Oct 12');
    expect(formatDate('2026-10-12', 'ru')).toMatch(/^Пн, 12 окт/);
  });

  it('splits a date into badge parts', () => {
    expect(dateParts('2026-10-12', 'en')).toEqual({ weekday: 'Mon', day: '12', month: 'Oct' });
    expect(dateParts('2026-10-12', 'ru')).toEqual({ weekday: 'пн', day: '12', month: 'окт' });
  });

  it('lists weekdays from Monday', () => {
    expect(weekdayNames('en')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayNames('ru')).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
  });
});

describe('other helpers', () => {
  it('formats seconds as a clock', () => {
    expect(formatClock(105)).toBe('1:45');
    expect(formatClock(60)).toBe('1:00');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(-5)).toBe('0:00');
  });

  it('capitalizes the first letter', () => {
    expect(capitalize('грудь', 'ru')).toBe('Грудь');
    expect(capitalize('middle back', 'en')).toBe('Middle back');
    expect(capitalize('', 'en')).toBe('');
  });
});

describe('exercise names', () => {
  const swing = requireExercise('One-Arm_Kettlebell_Swings');
  const goblet = requireExercise('Goblet_Squat');
  const plank = requireExercise('Plank');

  it('uses the localized name', () => {
    expect(exerciseName(plank, 'en', {})).toBe('Plank');
    expect(exerciseName(plank, 'ru', {})).toBe('Планка');
  });

  it('names an exercise after the implement the user owns', () => {
    expect(exerciseName(swing, 'en', { kb: true })).toBe('Kettlebell Swing');
    expect(exerciseName(swing, 'en', { db: true })).toBe('Dumbbell Swing');
    expect(exerciseName(swing, 'ru', { db: true })).toBe('Махи гантелью');
    expect(exerciseName(goblet, 'ru', { db: true, kb: true })).toBe('Гоблет-присед с гантелью');
  });

  it('reports when the photos show a different implement', () => {
    expect(photoMismatch(goblet, { db: true })).toEqual({ shown: 'kb', used: 'db' });
    expect(photoMismatch(goblet, { kb: true })).toBeUndefined();
    expect(photoMismatch(plank, {})).toBeUndefined();
  });
});

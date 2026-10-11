import { describe, expect, it } from 'vitest';

import { type Exercise, EXERCISES } from '@/data';
import { hasEquipment } from '@/engine';

import { filterLibrary, type LibraryContext, type LibraryFilter } from './filterLibrary';

const owned = { db: true, bench: true };
const context: LibraryContext = {
  isAvailable: (exercise) => hasEquipment(exercise, owned),
  inPlan: new Set(['Dumbbell_Bench_Press', 'Goblet_Squat', 'Plank']),
  nameOf: (exercise) => exercise.name.en,
  searchTextOf: (exercise) =>
    [exercise.name.en, exercise.name.ru, ...exercise.primary, ...exercise.equipment.flat()]
      .join(' ')
      .toLowerCase(),
  locale: 'en',
};

const run = (filter: Partial<LibraryFilter>) =>
  filterLibrary(EXERCISES, { query: '', availability: 'all', ...filter }, context);
const ids = (list: Exercise[]) => list.map((e) => e.id);

describe('filterLibrary', () => {
  it('returns the whole catalog without filters, plan exercises first', () => {
    const all = run({});
    expect(all).toHaveLength(EXERCISES.length);
    expect(new Set(ids(all).slice(0, 3))).toEqual(context.inPlan);
  });

  it('orders by plan, then availability, then name', () => {
    const all = run({});
    const firstUnavailable = all.findIndex((e) => !context.isAvailable(e));
    const lastAvailable = all.map((e) => context.isAvailable(e)).lastIndexOf(true);
    expect(firstUnavailable).toBeGreaterThan(lastAvailable);

    const available = all.slice(3, lastAvailable + 1).map((e) => e.name.en);
    expect(available).toEqual([...available].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('keeps only what the owned equipment allows, or what is in the plan', () => {
    expect(run({ availability: 'owned' }).every(context.isAvailable)).toBe(true);
    expect(new Set(ids(run({ availability: 'plan' })))).toEqual(context.inPlan);
  });

  it('filters by muscle and puts direct work before assisting work', () => {
    const chest = run({ muscle: 'chest' });
    expect(chest.every((e) => [...e.primary, ...e.secondary].includes('chest'))).toBe(true);
    const lastPrimary = chest.map((e) => e.primary.includes('chest')).lastIndexOf(true);
    const firstSecondary = chest.findIndex((e) => !e.primary.includes('chest'));
    expect(firstSecondary).toBeGreaterThan(lastPrimary);
    expect(chest[0]?.id).toBe('Dumbbell_Bench_Press');
  });

  it('searches names in both languages, muscles and equipment', () => {
    expect(ids(run({ query: 'goblet' }))).toContain('Goblet_Squat');
    expect(ids(run({ query: 'ПЛАНКА' }))).toEqual(['Plank', 'Side_Bridge']);
    expect(run({ query: 'medball' }).map((e) => e.id)).toEqual(['Overhead_Slam']);
    expect(run({ query: 'calves' }).length).toBeGreaterThan(0);
  });

  it('needs every word of the query to match', () => {
    const result = ids(run({ query: 'dumbbell press' }));
    expect(result).toContain('Dumbbell_Bench_Press');
    expect(result).not.toContain('Barbell_Bench_Press_-_Medium_Grip');
    expect(run({ query: 'zzz' })).toEqual([]);
  });

  it('combines every filter', () => {
    const result = run({ query: 'press', availability: 'owned', muscle: 'shoulders' });
    expect(result.length).toBeGreaterThan(0);
    for (const exercise of result) {
      expect(context.isAvailable(exercise)).toBe(true);
      expect(exercise.name.en.toLowerCase()).toContain('press');
    }
  });
});

import { describe, expect, it } from 'vitest';

import { requireExercise } from '@/data';

import { buildPlan } from '../plan';
import { pickRandomSwap, slotAlternatives, swapPool } from '../swap';
import { catalog, makeInput } from './helpers';

describe('slotAlternatives', () => {
  it('lists doable, non-excluded exercises of the same pattern, current one included', () => {
    const input = makeInput({ excluded: { Dumbbell_Squat: true } });
    const ids = slotAlternatives({ pattern: 'squat' }, input, catalog).map((e) => e.id);
    expect(ids).toContain('Goblet_Squat');
    expect(ids).toContain('Bodyweight_Squat');
    expect(ids).not.toContain('Dumbbell_Squat'); // excluded
    expect(ids).not.toContain('Barbell_Squat'); // no barbell
  });
});

describe('swapPool', () => {
  const input = makeInput();
  const session = buildPlan(input, catalog).sessions[0]!;

  it('leaves out exercises that are already in the session', () => {
    for (const item of session.items) {
      const pool = swapPool(session, item, input, catalog).map((e) => e.id);
      for (const other of session.items) expect(pool).not.toContain(other.exerciseId);
    }
  });

  it('prefers exercises that train the same primary muscles', () => {
    const row = session.items.find((i) => i.pattern === 'pull_horizontal')!;
    const current = requireExercise(row.exerciseId);
    const pool = swapPool(session, row, input, catalog);
    expect(pool.length).toBeGreaterThan(0);
    for (const option of pool) {
      expect(option.primary.some((m) => current.primary.includes(m))).toBe(true);
    }
  });

  it('falls back to the whole pattern when no option shares a primary muscle', () => {
    // A squat sitting in the calves slot: no calf exercise trains the quads.
    const item = { pattern: 'calves' as const, exerciseId: 'Goblet_Squat' };
    const pool = swapPool({ items: [] }, item, input, catalog);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((e) => e.patterns.includes('calves'))).toBe(true);
    expect(pool.some((e) => e.primary.includes('quads'))).toBe(false);
  });

  it('is empty when nothing else fits', () => {
    const [only, ...others] = slotAlternatives({ pattern: 'core' }, input, catalog);
    const excluded = Object.fromEntries(others.map((e) => [e.id, true as const]));
    const item = { pattern: 'core' as const, exerciseId: only!.id };
    expect(swapPool({ items: [item] }, item, { ...input, excluded }, catalog)).toEqual([]);
  });
});

describe('pickRandomSwap', () => {
  const pool = ['Pushups', 'Push-Up_Wide', 'Incline_Push-Up'].map(requireExercise);

  it('maps the random number onto the pool', () => {
    expect(pickRandomSwap(pool, () => 0)?.id).toBe('Pushups');
    expect(pickRandomSwap(pool, () => 0.5)?.id).toBe('Push-Up_Wide');
    expect(pickRandomSwap(pool, () => 0.999)?.id).toBe('Incline_Push-Up');
    expect(pickRandomSwap(pool, () => 1)?.id).toBe('Incline_Push-Up');
  });

  it('avoids the exercise the user just swapped away from', () => {
    expect(pickRandomSwap(pool, () => 0, 'Pushups')?.id).toBe('Push-Up_Wide');
  });

  it('still offers the avoided exercise when it is the only one', () => {
    expect(pickRandomSwap(pool.slice(0, 1), () => 0, 'Pushups')?.id).toBe('Pushups');
  });

  it('returns nothing for an empty pool', () => {
    expect(pickRandomSwap([], () => 0)).toBeUndefined();
  });
});

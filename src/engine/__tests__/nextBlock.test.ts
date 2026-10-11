import { describe, expect, it } from 'vitest';

import { computeLoads, e1rm, overrideKey } from '../loads';
import { nextBlock } from '../nextBlock';
import { buildPlan } from '../plan';
import type { EngineInput } from '../types';
import { catalog, makeInput } from './helpers';

function run(input: EngineInput, today: string) {
  const loaded = computeLoads(buildPlan(input, catalog), input, catalog);
  return nextBlock(loaded, input, catalog, today);
}

describe('nextBlock', () => {
  it('projects every exercise to the end of the block', () => {
    const { carried } = run(makeInput(), '2026-11-06');
    expect(carried.Goblet_Squat).toBeCloseTo(36 * 1.015 ** 4);
    expect(carried.Plank).toBeCloseTo(75 * 1.035 ** 4);
  });

  it('projects an edited exercise from the week it was edited in', () => {
    const input = makeInput({
      overrides: { [overrideKey('Goblet_Squat', '2026-10-19')]: { weight: 24, reps: 14 } },
    });
    const { carried } = run(input, '2026-11-06');
    expect(carried.Goblet_Squat).toBeCloseTo(e1rm(24, 14, 2) * 1.015 ** 3);
  });

  it('bakes the load scale into calculated weights but not into edits or reps', () => {
    const input = makeInput({
      loadScale: 0.8,
      overrides: { [overrideKey('Dumbbell_Bench_Press', '2026-10-12')]: { weight: 20, reps: 8 } },
    });
    const { carried } = run(input, '2026-11-06');
    expect(carried.Goblet_Squat).toBeCloseTo(36 * 1.015 ** 4 * 0.8);
    expect(carried.Dumbbell_Bench_Press).toBeCloseTo(e1rm(20, 8, 3) * 1.015 ** 4);
    expect(carried.Plank).toBeCloseTo(75 * 1.035 ** 4);
  });

  it('keeps capacities carried from earlier blocks for exercises no longer in the plan', () => {
    const { carried } = run(makeInput({ carried: { Barbell_Squat: 120 } }), '2026-11-06');
    expect(carried.Barbell_Squat).toBe(120);
  });

  it('starts on the Monday after the last session', () => {
    // The plan ends on Friday 2026-11-06.
    expect(run(makeInput(), '2026-10-20').start).toBe('2026-11-09');
    expect(run(makeInput(), '2026-11-06').start).toBe('2026-11-09');
  });

  it('starts on the Monday after today when the plan ended long ago', () => {
    expect(run(makeInput(), '2026-11-09').start).toBe('2026-11-16');
    expect(run(makeInput(), '2026-12-02').start).toBe('2026-12-07');
  });

  it('follows shifted sessions', () => {
    const input = makeInput({ shifts: [{ at: '2026-11-06', days: 3 }] }); // last session on Monday 11-09
    expect(run(input, '2026-11-01').start).toBe('2026-11-16');
  });

  it('starts next Monday when there is no plan at all', () => {
    const input = makeInput({ schedule: { ...makeInput().schedule, days: [] } });
    expect(run(input, '2026-10-14')).toEqual({ carried: {}, start: '2026-10-19' });
  });
});

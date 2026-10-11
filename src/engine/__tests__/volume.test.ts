import { describe, expect, it } from 'vitest';

import { MUSCLE_IDS } from '@/data';

import { buildPlan } from '../plan';
import type { HistoryEntry } from '../types';
import { muscleLoad, optimalWeeklySets, volumeTier, weeklyVolume } from '../volume';
import volumeGoldenJson from './fixtures/volume.golden.json?raw';
import { catalog, makeInput, scenarios } from './helpers';

const golden = JSON.parse(volumeGoldenJson) as Record<string, Record<string, number>>;

function entry(exerciseId: string, date: string, sets: number): HistoryEntry {
  return {
    sessionId: date,
    exerciseId,
    date,
    weight: null,
    reps: 10,
    sets,
    capacity: 20,
    rating: null,
  };
}

describe('weeklyVolume: parity with the prototype', () => {
  it.each(scenarios)('$name', ({ name, input }) => {
    expect(weeklyVolume(buildPlan(input, catalog), catalog)).toEqual(golden[name]);
  });
});

describe('weeklyVolume', () => {
  it('counts a set in full for primary muscles and as half for secondary ones', () => {
    const plan = {
      sessions: [
        {
          week: 0,
          deload: false,
          // Goblet squat: quads primary; calves, glutes, hamstrings secondary.
          items: [{ exerciseId: 'Goblet_Squat', sets: 3 }],
        },
      ],
    };
    expect(weeklyVolume(plan as never, catalog)).toEqual({
      quads: 3,
      calves: 1.5,
      glutes: 1.5,
      hamstrings: 1.5,
    });
  });

  it('looks at the first week only and skips unknown exercises', () => {
    const plan = {
      sessions: [
        { week: 0, deload: false, items: [{ exerciseId: 'Plank', sets: 2 }] },
        { week: 0, deload: false, items: [{ exerciseId: 'Nope', sets: 5 }] },
        { week: 1, deload: false, items: [{ exerciseId: 'Plank', sets: 2 }] },
        { week: 0, deload: true, items: [{ exerciseId: 'Plank', sets: 2 }] },
      ],
    };
    expect(weeklyVolume(plan as never, catalog)).toEqual({ abs: 2 });
  });

  it('is empty for an empty plan', () => {
    const input = makeInput({ schedule: { ...makeInput().schedule, days: [] } });
    expect(weeklyVolume(buildPlan(input, catalog), catalog)).toEqual({});
  });
});

describe('muscleLoad', () => {
  const today = '2026-10-20';
  const history = [
    entry('Goblet_Squat', '2026-10-01', 3), // 19 days ago
    entry('Goblet_Squat', '2026-10-14', 3), // 6 days ago: inside a 7-day window
    entry('Plank', '2026-10-13', 2), // 7 days ago: just outside
    entry('Pushups', '2026-10-20', 4), // today
    entry('Pushups', '2026-10-25', 4), // in the future: ignored
    entry('Nope', '2026-10-19', 9), // unknown exercise: ignored
  ];

  it('sums the sets of the last seven days', () => {
    const load = muscleLoad(history, catalog, { today, days: 7 });
    expect(load.weeks).toBe(1);
    expect(load.total).toEqual({
      quads: 3,
      calves: 1.5,
      glutes: 1.5,
      hamstrings: 1.5,
      chest: 4,
      shoulders: 2,
      triceps: 2,
    });
    expect(load.perWeek).toEqual(load.total);
  });

  it('averages a longer window per week', () => {
    const load = muscleLoad(history, catalog, { today, days: 30 });
    expect(load.weeks).toBeCloseTo(30 / 7);
    expect(load.total.quads).toBe(6);
    expect(load.total.abs).toBe(2);
    expect(load.perWeek.quads).toBeCloseTo(6 / (30 / 7));
  });

  it('averages all time over the span since the first session', () => {
    const load = muscleLoad(history, catalog, { today, days: 0 });
    expect(load.weeks).toBeCloseTo(20 / 7); // 1 to 20 October inclusive
    expect(load.perWeek.quads).toBeCloseTo(6 / (20 / 7));
  });

  it('uses at least one week for the all-time average', () => {
    const load = muscleLoad([entry('Plank', today, 3)], catalog, { today, days: 0 });
    expect(load.weeks).toBe(1);
    expect(load.perWeek.abs).toBe(3);
  });

  it('remembers when each primary muscle was last trained, even outside the window', () => {
    const load = muscleLoad(history, catalog, { today, days: 7 });
    expect(load.last.quads).toBe('2026-10-14');
    expect(load.last.abs).toBe('2026-10-13');
    expect(load.last.chest).toBe('2026-10-20');
    expect(load.last.glutes).toBeUndefined(); // only ever a secondary muscle
  });

  it('is empty without history', () => {
    expect(muscleLoad([], catalog, { today, days: 7 })).toEqual({
      perWeek: {},
      total: {},
      last: {},
      weeks: 1,
    });
    expect(muscleLoad([], catalog, { today, days: 0 }).weeks).toBe(1);
  });
});

describe('volume tiers', () => {
  it('scales the optimal range down for small muscles', () => {
    expect(optimalWeeklySets('chest', 'hypertrophy')).toEqual([10, 20]);
    expect(optimalWeeklySets('chest', 'strength')).toEqual([8, 15]);
    expect(optimalWeeklySets('calves', 'hypertrophy')).toEqual([8, 16]);
    expect(optimalWeeklySets('neck', 'hypertrophy')).toEqual([4, 8]);
  });

  it.each([
    [0, 0],
    [-1, 0],
    [Number.NaN, 0],
    [0.5, 1],
    [4.9, 1],
    [5, 2],
    [9.9, 2],
    [10, 3],
    [20, 3],
    [20.5, 4],
  ])('rates %f weekly sets for a large muscle as tier %i', (sets, tier) => {
    expect(volumeTier('chest', sets, 'hypertrophy')).toBe(tier);
  });

  it('rates small muscles against their own range', () => {
    expect(volumeTier('forearms', 5, 'hypertrophy')).toBe(3); // 5–10 is optimal
    expect(volumeTier('forearms', 11, 'hypertrophy')).toBe(4);
    expect(volumeTier('chest', 5, 'hypertrophy')).toBe(2);
  });

  it('has a range for every muscle', () => {
    for (const muscle of MUSCLE_IDS) {
      const [min, max] = optimalWeeklySets(muscle, 'endurance');
      expect(min).toBeGreaterThan(0);
      expect(max).toBeGreaterThan(min);
    }
  });
});

import { describe, expect, it } from 'vitest';

import { createSampleSnapshot } from '../../defaults';
import { derivePlan } from '../../derived';
import { diffPlanExercises, latestBodyWeight, planExerciseIds } from '../../selectors';
import type { Snapshot } from '../../types';
import * as settings from '../settings';

const today = '2026-10-14';
const sample = createSampleSnapshot(today);
const own: Snapshot = { ...sample, state: { ...sample.state, setupDone: true } };

/** Applies a patch the way the store does. */
function apply(snapshot: Snapshot, patch: Partial<Snapshot>): Snapshot {
  return { ...snapshot, ...patch };
}

describe('profile', () => {
  it('merges changes and ends the sample mode', () => {
    const next = apply(sample, settings.setProfile(sample, { age: 41, sex: 'female' })).state;
    expect(next.profile).toEqual({ ...sample.state.profile, age: 41, sex: 'female' });
    expect(next.setupDone).toBe(true);
    expect(sample.state.setupDone).toBe(false); // the input is not mutated
  });

  it('replaces the sample weight with the first real one', () => {
    const next = apply(sample, settings.setBodyWeight(sample, 72.5, today)).state;
    expect(next.bodyWeights).toEqual([{ date: today, kg: 72.5 }]);
    expect(next.setupDone).toBe(true);
  });

  it('keeps earlier entries and replaces today once the profile is the user’s own', () => {
    const logged = {
      ...own,
      state: {
        ...own.state,
        bodyWeights: [
          { date: '2026-10-01', kg: 81 },
          { date: today, kg: 80 },
        ],
      },
    };
    expect(apply(logged, settings.setBodyWeight(logged, 79.4, today)).state.bodyWeights).toEqual([
      { date: '2026-10-01', kg: 81 },
      { date: today, kg: 79.4 },
    ]);
  });
});

describe('load scale', () => {
  it('clamps to 40–130 % and rounds to whole percent', () => {
    const scale = (value: number) => apply(own, settings.setLoadScale(own, value)).state.loadScale;
    expect(scale(0.85)).toBe(0.85);
    expect(scale(0.1)).toBe(0.4);
    expect(scale(2)).toBe(1.3);
    expect(scale(0.8500001)).toBe(0.85);
  });

  it('nudges without accumulating rounding errors', () => {
    let snapshot = own;
    for (let i = 0; i < 3; i++) snapshot = apply(snapshot, settings.nudgeLoadScale(snapshot, -0.1));
    expect(snapshot.state.loadScale).toBe(0.7);
    for (let i = 0; i < 20; i++)
      snapshot = apply(snapshot, settings.nudgeLoadScale(snapshot, 0.05));
    expect(snapshot.state.loadScale).toBe(1.3);
  });
});

describe('schedule', () => {
  it('toggles training days and keeps them sorted', () => {
    const added = apply(own, settings.toggleTrainingDay(own, 1));
    expect(added.state.schedule.days).toEqual([0, 1, 2, 4]);
    expect(apply(added, settings.toggleTrainingDay(added, 0)).state.schedule.days).toEqual([
      1, 2, 4,
    ]);
  });

  it('changes the session length', () => {
    expect(apply(own, settings.setSessionMinutes(own, 60)).state.schedule.minutes).toBe(60);
  });

  it('moves the plan without ending the sample mode', () => {
    const next = apply(sample, settings.setPlanShape(sample, { weeks: 8, deload: false })).state;
    expect(next.schedule).toMatchObject({ weeks: 8, deload: false, days: [0, 2, 4] });
    expect(next.setupDone).toBe(false);
  });
});

describe('equipment', () => {
  it('toggles an item on and off', () => {
    const on = apply(own, settings.toggleEquipment(own, 'kb'));
    expect(on.state.equipment.kb).toBe(true);
    expect(apply(on, settings.toggleEquipment(on, 'kb')).state.equipment.kb).toBe(false);
  });

  it('merges equipment configuration', () => {
    const next = apply(own, settings.setEquipmentConfig(own, { db: [5, 10] })).state;
    expect(next.equipmentConfig.db).toEqual([5, 10]);
    expect(next.equipmentConfig.bb).toEqual(own.state.equipmentConfig.bb);
  });
});

describe('selectors', () => {
  it('finds the latest body weight', () => {
    expect(latestBodyWeight([])).toBeUndefined();
    expect(
      latestBodyWeight([
        { date: '2026-10-05', kg: 80 },
        { date: '2026-10-12', kg: 79 },
        { date: '2026-10-01', kg: 81 },
      ]),
    ).toEqual({ date: '2026-10-12', kg: 79 });
  });

  it('lists the exercises of a plan once each', () => {
    const ids = planExerciseIds(derivePlan(own.state).plan);
    expect(ids[0]).toBe('Goblet_Squat');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports which exercises a change added to and removed from the plan', () => {
    const before = derivePlan(own.state).plan;
    const withBarbell = apply(own, settings.toggleEquipment(own, 'bb')).state;
    const diff = diffPlanExercises(before, derivePlan(withBarbell).plan);
    expect(diff.added).toContain('Barbell_Deadlift');
    expect(diff.removed.length).toBeGreaterThan(0);
    expect(diffPlanExercises(before, before)).toEqual({ added: [], removed: [] });
  });
});

import { describe, expect, it } from 'vitest';

import { createSampleSnapshot } from '../../defaults';
import { derivePlan } from '../../derived';
import type { Snapshot } from '../../types';
import {
  editPrescription,
  excludeExercise,
  restoreCalculation,
  restoreExercise,
  swapExercise,
} from '../exercises';
import { toggleSessionDone } from '../sessions';

const base = createSampleSnapshot('2026-10-14');
const first = derivePlan(base.state).plan.sessions[0]!;

function apply(snapshot: Snapshot, patch: Partial<Snapshot>): Snapshot {
  return { ...snapshot, ...patch };
}

const firstItems = (snapshot: Snapshot) =>
  derivePlan(snapshot.state).plan.sessions[0]!.items.map((item) => item.exerciseId);

describe('swaps and exclusions', () => {
  it('puts the chosen exercise into the slot and returns to the automatic pick', () => {
    const swapped = apply(base, swapExercise(base, 'FA|0', 'Dumbbell_Squat'));
    expect(swapped.state.swaps).toEqual({ 'FA|0': 'Dumbbell_Squat' });
    expect(firstItems(swapped)[0]).toBe('Dumbbell_Squat');

    const back = apply(swapped, swapExercise(swapped, 'FA|0', null));
    expect(back.state.swaps).toEqual({});
    expect(firstItems(back)[0]).toBe('Goblet_Squat');
  });

  it('excludes an exercise from the plan and restores it', () => {
    const excluded = apply(base, excludeExercise(base, 'Goblet_Squat'));
    expect(firstItems(excluded)).not.toContain('Goblet_Squat');

    const restored = apply(excluded, restoreExercise(excluded, 'Goblet_Squat'));
    expect(restored.state.excluded).toEqual({});
    expect(firstItems(restored)[0]).toBe('Goblet_Squat');
  });
});

describe('edits', () => {
  it('stores the edit under the exercise and session', () => {
    const edited = apply(
      base,
      editPrescription(base, 'Goblet_Squat', first.id, { weight: 20, reps: 10 }),
    );
    expect(edited.state.overrides).toEqual({
      [`Goblet_Squat|${first.id}`]: { weight: 20, reps: 10 },
    });
    expect(derivePlan(edited.state).plan.sessions[0]!.items[0]!.prescription).toMatchObject({
      weight: 20,
      reps: 10,
      edited: true,
    });
  });

  it('keeps a rating that was given before the edit', () => {
    const rated: Snapshot = {
      ...base,
      state: { ...base.state, overrides: { [`Plank|${first.id}`]: { rating: 'hard' } } },
    };
    const edited = apply(rated, editPrescription(rated, 'Plank', first.id, { reps: 60 }));
    expect(edited.state.overrides[`Plank|${first.id}`]).toEqual({ rating: 'hard', reps: 60 });
  });

  it('removes the edit and the rating when the calculation is restored', () => {
    const edited = apply(
      base,
      editPrescription(base, 'Goblet_Squat', first.id, { weight: 20, reps: 10 }),
    );
    const restored = apply(edited, restoreCalculation(edited, 'Goblet_Squat', first.id));
    expect(restored.state.overrides).toEqual({});
  });

  it('rewrites the recorded result when a finished session is edited', () => {
    const done = apply(base, toggleSessionDone(base, first.id));
    const edited = apply(
      done,
      editPrescription(done, 'Goblet_Squat', first.id, { weight: 20, reps: 10 }),
    );

    const squat = edited.history.find((e) => e.exerciseId === 'Goblet_Squat');
    expect(squat).toMatchObject({ weight: 20, reps: 10, sets: 3, capacity: 28.67 });
    expect(edited.history).toHaveLength(done.history.length);
    expect(edited.history.filter((e) => e.exerciseId !== 'Goblet_Squat')).toEqual(
      done.history.filter((e) => e.exerciseId !== 'Goblet_Squat'),
    );

    const restored = apply(edited, restoreCalculation(edited, 'Goblet_Squat', first.id));
    expect(restored.history.find((e) => e.exerciseId === 'Goblet_Squat')).toMatchObject({
      weight: 24,
      reps: 12,
    });
  });

  it('leaves the history alone when nothing was recorded for the exercise', () => {
    const edited = apply(
      base,
      editPrescription(base, 'Goblet_Squat', first.id, { weight: 20, reps: 10 }),
    );
    expect(edited.history).toBe(base.history);
  });
});

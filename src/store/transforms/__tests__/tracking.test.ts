import { describe, expect, it } from 'vitest';

import { createSampleSnapshot } from '../../defaults';
import { derivePlan } from '../../derived';
import type { Snapshot } from '../../types';
import { toggleSessionDone } from '../sessions';
import { rateExercise, toggleSet } from '../tracking';

const base = createSampleSnapshot('2026-10-14');
const first = derivePlan(base.state).plan.sessions[0]!;
const id = first.id;

function apply(snapshot: Snapshot, patch: Partial<Snapshot>): Snapshot {
  return { ...snapshot, ...patch };
}

/** Ticks every set of the given exercises, in order. */
function tickAll(snapshot: Snapshot, exerciseIds: string[]): Snapshot {
  let next = snapshot;
  for (const exerciseId of exerciseIds) {
    const item = first.items.find((i) => i.exerciseId === exerciseId)!;
    for (let set = 0; set < item.sets; set++)
      next = apply(next, toggleSet(next, id, exerciseId, set));
  }
  return next;
}

describe('toggleSet', () => {
  it('ticks a set without recording anything yet', () => {
    const next = apply(base, toggleSet(base, id, 'Goblet_Squat', 0));
    expect(next.setLogs[id]).toEqual({ Goblet_Squat: [true, false, false] });
    expect(next.history).toEqual([]);
    expect(next.state.done).toEqual({});
  });

  it('records the exercise when its last set is ticked', () => {
    const next = tickAll(base, ['Goblet_Squat']);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toMatchObject({
      exerciseId: 'Goblet_Squat',
      sets: 3,
      weight: 24,
      reps: 12,
    });
    expect(next.state.done).toEqual({});
  });

  it('marks the session as done and records all of it with the last set', () => {
    const skipped = { ...base, state: { ...base.state, skipped: { [id]: true as const } } };
    const next = tickAll(
      skipped,
      first.items.map((i) => i.exerciseId),
    );
    expect(next.state.done).toEqual({ [id]: true });
    expect(next.state.skipped).toEqual({});
    expect(next.history.map((e) => [e.exerciseId, e.sets])).toEqual(
      first.items.map((i) => [i.exerciseId, i.sets]),
    );
  });

  it('corrects the record when a set of a recorded exercise is unticked', () => {
    let next = tickAll(base, ['Goblet_Squat']);
    next = apply(next, toggleSet(next, id, 'Goblet_Squat', 2));
    expect(next.setLogs[id]?.Goblet_Squat).toEqual([true, true, false]);
    expect(next.history[0]?.sets).toBe(2);

    next = apply(next, toggleSet(next, id, 'Goblet_Squat', 0));
    next = apply(next, toggleSet(next, id, 'Goblet_Squat', 1));
    expect(next.history).toEqual([]);
  });

  it('leaves the history alone when an unrecorded exercise is unticked', () => {
    let next = apply(base, toggleSet(base, id, 'Goblet_Squat', 0));
    next = apply(next, toggleSet(next, id, 'Goblet_Squat', 0));
    expect(next.setLogs[id]?.Goblet_Squat).toEqual([false, false, false]);
    expect(next.history).toBe(base.history);
  });

  it('ignores sets and sessions that do not exist', () => {
    expect(toggleSet(base, id, 'Goblet_Squat', 3)).toEqual({});
    expect(toggleSet(base, id, 'Goblet_Squat', -1)).toEqual({});
    expect(toggleSet(base, id, 'Barbell_Squat', 0)).toEqual({});
    expect(toggleSet(base, '2020-01-01', 'Goblet_Squat', 0)).toEqual({});
  });
});

describe('rateExercise', () => {
  const key = `Goblet_Squat|${id}`;

  it('stores the rating and changes later loads', () => {
    const rated = apply(base, rateExercise(base, 'Goblet_Squat', id, 'easy'));
    expect(rated.state.overrides[key]).toEqual({ rating: 'easy' });
    const squats = derivePlan(rated.state).plan.sessions.flatMap((s) =>
      s.items.filter((i) => i.exerciseId === 'Goblet_Squat'),
    );
    expect(squats[0]!.prescription.capacity).toBeCloseTo(24 * (1 + (12 + 5) / 30));
    expect(squats[1]!.prescription.capacity).toBeGreaterThan(37.6);
  });

  it('clears the rating when the same one is chosen again', () => {
    const rated = apply(base, rateExercise(base, 'Goblet_Squat', id, 'hard'));
    const cleared = apply(rated, rateExercise(rated, 'Goblet_Squat', id, 'hard'));
    expect(cleared.state.overrides).toEqual({});
  });

  it('replaces one rating with another and keeps an edit', () => {
    const edited: Snapshot = {
      ...base,
      state: { ...base.state, overrides: { [key]: { weight: 20, reps: 10, rating: 'easy' } } },
    };
    const next = apply(edited, rateExercise(edited, 'Goblet_Squat', id, 'fail'));
    expect(next.state.overrides[key]).toEqual({ weight: 20, reps: 10, rating: 'fail' });
    const cleared = apply(next, rateExercise(next, 'Goblet_Squat', id, 'fail'));
    expect(cleared.state.overrides[key]).toEqual({ weight: 20, reps: 10 });
  });

  it('updates a result that was already recorded', () => {
    const done = apply(base, toggleSessionDone(base, id));
    const rated = apply(done, rateExercise(done, 'Goblet_Squat', id, 'easy'));
    const entry = rated.history.find((e) => e.exerciseId === 'Goblet_Squat');
    expect(entry).toMatchObject({ rating: 'easy', sets: 3, capacity: 37.6 });
    expect(rated.history).toHaveLength(done.history.length);
  });

  it('does not create a history entry for an exercise that was not done', () => {
    expect(apply(base, rateExercise(base, 'Goblet_Squat', id, 'easy')).history).toBe(base.history);
  });
});

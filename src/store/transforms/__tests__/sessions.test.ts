import { describe, expect, it } from 'vitest';

import { createSampleSnapshot } from '../../defaults';
import { derivePlan } from '../../derived';
import {
  completedSets,
  firstMissed,
  isBlockOver,
  isFinished,
  isMissed,
  nextSession,
  sessionProgress,
} from '../../selectors';
import type { Snapshot } from '../../types';
import { recordSession, startNextBlock, toggleSessionDone } from '../sessions';

// Wednesday; the sample plan starts on Monday 2026-10-19.
const today = '2026-10-14';
const base = createSampleSnapshot(today);
const sessions = derivePlan(base.state).plan.sessions;
const first = sessions[0]!;

function apply(snapshot: Snapshot, patch: Partial<Snapshot>): Snapshot {
  return { ...snapshot, ...patch };
}

describe('toggleSessionDone', () => {
  it('marks the session as done and records every exercise with all its sets', () => {
    const next = apply(base, toggleSessionDone(base, first.id));

    expect(next.state.done).toEqual({ [first.id]: true });
    expect(next.history.map((e) => [e.exerciseId, e.sets])).toEqual(
      first.items.map((item) => [item.exerciseId, item.sets]),
    );
    expect(next.history[0]).toMatchObject({
      sessionId: first.id,
      date: first.date,
      exerciseId: 'Goblet_Squat',
      weight: 24,
      reps: 12,
      capacity: 36,
    });
  });

  it('records the ticked sets where some were ticked', () => {
    const ticked = { ...base, setLogs: { [first.id]: { Goblet_Squat: [true, false, true] } } };
    const next = apply(ticked, toggleSessionDone(ticked, first.id));
    const sets = Object.fromEntries(next.history.map((e) => [e.exerciseId, e.sets]));
    expect(sets.Goblet_Squat).toBe(2);
    expect(sets.Plank).toBe(2); // nothing ticked: counted in full
  });

  it('un-skips a session that is marked as done', () => {
    const skipped = { ...base, state: { ...base.state, skipped: { [first.id]: true as const } } };
    expect(apply(skipped, toggleSessionDone(skipped, first.id)).state.skipped).toEqual({});
  });

  it('takes the mark and the recorded results back', () => {
    const other = sessions[1]!;
    let snapshot = apply(base, toggleSessionDone(base, first.id));
    snapshot = apply(snapshot, toggleSessionDone(snapshot, other.id));
    snapshot = apply(snapshot, toggleSessionDone(snapshot, first.id));

    expect(snapshot.state.done).toEqual({ [other.id]: true });
    expect(new Set(snapshot.history.map((e) => e.sessionId))).toEqual(new Set([other.id]));
  });

  it('only flags a session that is no longer in the plan', () => {
    const next = apply(base, toggleSessionDone(base, '2020-01-01'));
    expect(next.state.done).toEqual({ '2020-01-01': true });
    expect(next.history).toEqual([]);
  });
});

describe('recordSession', () => {
  it('replaces the earlier record of the same session', () => {
    const once = recordSession([], first, {});
    const twice = recordSession(once, first, { [first.id]: { Goblet_Squat: [true] } });
    expect(twice).toHaveLength(first.items.length);
    expect(twice.find((e) => e.exerciseId === 'Goblet_Squat')?.sets).toBe(1);
  });
});

describe('startNextBlock', () => {
  const edited: Snapshot = {
    ...base,
    state: {
      ...base.state,
      loadScale: 0.9,
      overrides: { [`Goblet_Squat|${first.id}`]: { weight: 24, reps: 15 } },
      shifts: [{ at: first.id, days: 1 }],
      carried: { Barbell_Squat: 100 },
    },
  };

  it('carries capacities over, clears edits and restarts on the Monday after the plan', () => {
    const next = apply(edited, startNextBlock(edited, today)).state;

    expect(next.block).toBe(2);
    expect(next.loadScale).toBe(1);
    expect(next.overrides).toEqual({});
    expect(next.shifts).toEqual([]);
    // The plan ran 2026-10-19 … 2026-11-13, pushed back one day by the shift.
    expect(next.schedule.start).toBe('2026-11-16');
    expect(next.carried.Barbell_Squat).toBe(100);
    expect(next.carried.Goblet_Squat).toBeCloseTo(24 * (1 + 18 / 30) * 1.015 ** 4);
    expect(next.carried.Dumbbell_Bench_Press).toBeCloseTo(30.4 * 1.015 ** 4 * 0.9);
  });

  it('gives a new plan that starts from the carried capacities', () => {
    const next = apply(edited, startNextBlock(edited, today)).state;
    const squat = derivePlan(next).plan.sessions[0]!.items[0]!.prescription;
    expect(squat.capacity).toBeCloseTo(next.carried.Goblet_Squat!);
  });

  it('keeps finished sessions and their history', () => {
    const done = apply(edited, toggleSessionDone(edited, first.id));
    const next = apply(done, startNextBlock(done, today));
    expect(next.state.done).toEqual({ [first.id]: true });
    expect(next.history).toBe(done.history);
  });
});

describe('session selectors', () => {
  const flags = {
    done: { [sessions[0]!.id]: true as const },
    skipped: { [sessions[1]!.id]: true as const },
  };

  it('treats done and skipped sessions as finished', () => {
    expect(isFinished(flags, sessions[0]!.id)).toBe(true);
    expect(isFinished(flags, sessions[1]!.id)).toBe(true);
    expect(isFinished(flags, sessions[2]!.id)).toBe(false);
  });

  it('calls a session missed once its date has passed unfinished', () => {
    const third = sessions[2]!; // Friday 2026-10-23
    expect(isMissed(third, flags, '2026-10-23')).toBe(false);
    expect(isMissed(third, flags, '2026-10-24')).toBe(true);
    expect(isMissed(sessions[0]!, flags, '2026-10-24')).toBe(false);
    expect(firstMissed(sessions, flags, '2026-10-30')?.id).toBe(third.id);
    expect(firstMissed(sessions, flags, '2026-10-20')).toBeUndefined();
  });

  it('finds the next session that is still to be done', () => {
    expect(nextSession(sessions, flags, today)?.id).toBe(sessions[2]!.id);
    expect(nextSession(sessions, { done: {}, skipped: {} }, '2026-10-21')?.id).toBe(
      sessions[1]!.id,
    );
    expect(nextSession(sessions, flags, '2027-01-01')).toBeUndefined();
  });

  it('counts ticked sets, never more than planned', () => {
    const squat = first.items[0]!;
    const logs = {
      [first.id]: { Goblet_Squat: [true, true, true, true, true], Plank: [false, true] },
    };
    expect(completedSets(logs, first.id, squat)).toBe(3);
    expect(completedSets({}, first.id, squat)).toBe(0);
    expect(sessionProgress(first, logs)).toEqual({ done: 4, total: 17 });
  });

  it('knows when the block is over', () => {
    const none = { done: {}, skipped: {} };
    const all = {
      done: Object.fromEntries(sessions.map((s) => [s.id, true as const])),
      skipped: {},
    };
    expect(isBlockOver(sessions, none, today)).toBe(false);
    expect(isBlockOver(sessions, all, today)).toBe(true);
    expect(isBlockOver(sessions, none, '2026-11-14')).toBe(true);
    expect(isBlockOver([], none, today)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { exerciseHistory, historyEntry, summarizeHistory } from '../history';
import { computeLoads, overrideKey } from '../loads';
import { buildPlan } from '../plan';
import type { HistoryEntry } from '../types';
import { catalog, makeInput } from './helpers';

const input = makeInput({
  overrides: { [overrideKey('Goblet_Squat', '2026-10-12')]: { rating: 'easy' } },
  shifts: [{ at: '2026-10-12', days: 1 }],
});
const session = computeLoads(buildPlan(input, catalog), input, catalog).sessions[0]!;
const item = (id: string) => session.items.find((i) => i.exerciseId === id)!;

function entry(date: string, capacity: number, exerciseId = 'Goblet_Squat'): HistoryEntry {
  return {
    sessionId: date,
    exerciseId,
    date,
    weight: 20,
    reps: 10,
    sets: 3,
    capacity,
    rating: null,
  };
}

describe('historyEntry', () => {
  it('records a weighted exercise with the date it was done on', () => {
    expect(historyEntry(session, item('Goblet_Squat'), 3)).toEqual({
      sessionId: '2026-10-12',
      exerciseId: 'Goblet_Squat',
      date: '2026-10-13',
      weight: 24,
      reps: 12,
      sets: 3,
      capacity: 37.6,
      rating: 'easy',
    });
  });

  it('records seconds for timed exercises and no weight', () => {
    expect(historyEntry(session, item('Plank'), 1)).toMatchObject({
      weight: null,
      reps: 55,
      sets: 1,
      capacity: 75,
      rating: null,
    });
  });

  it('rounds the capacity to two decimals', () => {
    const press = historyEntry(session, item('Dumbbell_Bench_Press'), 2);
    expect(press?.capacity).toBe(30.4);
  });

  it('records nothing when no set was completed', () => {
    expect(historyEntry(session, item('Plank'), 0)).toBeUndefined();
  });
});

describe('exerciseHistory', () => {
  it('returns the entries of one exercise, oldest first', () => {
    const history = [
      entry('2026-10-19', 30),
      entry('2026-10-12', 28, 'Plank'),
      entry('2026-10-12', 28),
      entry('2026-10-12', 29),
    ];
    expect(exerciseHistory(history, 'Goblet_Squat').map((e) => [e.date, e.capacity])).toEqual([
      ['2026-10-12', 28],
      ['2026-10-12', 29],
      ['2026-10-19', 30],
    ]);
    expect(exerciseHistory(history, 'Pushups')).toEqual([]);
  });
});

describe('summarizeHistory', () => {
  it('returns nothing without entries', () => {
    expect(summarizeHistory([])).toBeUndefined();
  });

  it('has no gain with a single session', () => {
    const only = entry('2026-10-12', 28);
    expect(summarizeHistory([only])).toEqual({
      sessions: 1,
      first: only,
      last: only,
      best: only,
      gainPercent: null,
    });
  });

  it('reports the last and best sessions and the gain since the first', () => {
    const entries = [entry('2026-10-12', 28), entry('2026-10-19', 31), entry('2026-10-26', 29.4)];
    const summary = summarizeHistory(entries);
    expect(summary?.sessions).toBe(3);
    expect(summary?.best.date).toBe('2026-10-19');
    expect(summary?.last.date).toBe('2026-10-26');
    expect(summary?.gainPercent).toBe(5);
  });

  it('reports a loss as a negative gain', () => {
    expect(summarizeHistory([entry('2026-10-12', 30), entry('2026-10-19', 27)])?.gainPercent).toBe(
      -10,
    );
  });
});

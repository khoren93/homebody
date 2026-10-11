import { describe, expect, it } from 'vitest';

import { computeLoads } from '../loads';
import { buildPlan } from '../plan';
import { exerciseSessions, progressSeries } from '../progress';
import type { HistoryEntry } from '../types';
import { catalog, makeInput } from './helpers';

const input = makeInput();
const sessions = computeLoads(buildPlan(input, catalog), input, catalog).sessions;

function entry(date: string, capacity: number): HistoryEntry {
  return {
    sessionId: date,
    exerciseId: 'Goblet_Squat',
    date,
    weight: 24,
    reps: 12,
    sets: 3,
    capacity,
    rating: null,
  };
}

describe('exerciseSessions', () => {
  it('lists every occurrence of an exercise with its item', () => {
    const rows = exerciseSessions(sessions, 'Goblet_Squat');
    expect(rows.map((r) => r.session.id)).toEqual([
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
    expect(rows.every((r) => r.item.exerciseId === 'Goblet_Squat')).toBe(true);
    expect(exerciseSessions(sessions, 'Barbell_Squat')).toEqual([]);
  });
});

describe('progressSeries', () => {
  const none = () => false;

  it('shows only the plan before anything was done', () => {
    const series = progressSeries([], sessions, 'Goblet_Squat', {
      today: '2026-10-01',
      isFinished: none,
    });
    expect(series.actual).toEqual([]);
    expect(series.planned.map((p) => p[0])).toEqual([
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
    expect(series.planned[0]?.[1]).toBeCloseTo(36);
  });

  it('joins the plan to the last achieved point', () => {
    const history = [entry('2026-10-12', 36), entry('2026-10-19', 38.2)];
    const series = progressSeries(history, sessions, 'Goblet_Squat', {
      today: '2026-10-20',
      isFinished: (id) => id <= '2026-10-19',
    });
    expect(series.actual).toEqual([
      ['2026-10-12', 36],
      ['2026-10-19', 38.2],
    ]);
    expect(series.planned.map((p) => p[0])).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
    expect(series.planned[0]).toEqual(['2026-10-19', 38.2]);
  });

  it('leaves out sessions that are in the past or finished', () => {
    const series = progressSeries([], sessions, 'Goblet_Squat', {
      today: '2026-10-19',
      isFinished: (id) => id === '2026-10-26',
    });
    expect(series.planned.map((p) => p[0])).toEqual(['2026-10-19', '2026-11-02']);
  });

  it('has no plan once the block is over', () => {
    const series = progressSeries([entry('2026-10-12', 36)], sessions, 'Goblet_Squat', {
      today: '2026-12-01',
      isFinished: none,
    });
    expect(series.planned).toEqual([]);
    expect(series.actual).toHaveLength(1);
  });
});

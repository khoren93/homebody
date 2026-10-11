import { describe, expect, it } from 'vitest';

import { createSampleSnapshot } from '../../defaults';
import { metricSeries, valueOn } from '../../selectors';
import type { Snapshot } from '../../types';
import { deleteMeasurement, logMeasurement } from '../body';

const sample = createSampleSnapshot('2026-10-14');
const own: Snapshot = { ...sample, state: { ...sample.state, setupDone: true } };

function apply(snapshot: Snapshot, patch: Partial<Snapshot>): Snapshot {
  return { ...snapshot, ...patch };
}

describe('logMeasurement', () => {
  it('replaces the sample weight with the first real entry', () => {
    const next = apply(sample, logMeasurement(sample, '2026-10-10', { kg: 81.2 })).state;
    expect(next.bodyWeights).toEqual([{ date: '2026-10-10', kg: 81.2 }]);
    expect(next.setupDone).toBe(true);
  });

  it('adds entries and replaces the weight of the same date', () => {
    let snapshot = apply(own, logMeasurement(own, '2026-10-20', { kg: 79.5 }));
    snapshot = apply(snapshot, logMeasurement(snapshot, '2026-10-20', { kg: 79.3 }));
    expect(snapshot.state.bodyWeights).toEqual([
      { date: '2026-10-14', kg: 80 },
      { date: '2026-10-20', kg: 79.3 },
    ]);
  });

  it('merges girths into what was logged for the date', () => {
    let snapshot = apply(own, logMeasurement(own, '2026-10-20', { neck: 38, waist: 84 }));
    snapshot = apply(snapshot, logMeasurement(snapshot, '2026-10-20', { waist: 83.5, arm: 36 }));
    expect(snapshot.state.measurements).toEqual([
      { date: '2026-10-20', neck: 38, waist: 83.5, arm: 36 },
    ]);
    expect(snapshot.state.bodyWeights).toEqual(own.state.bodyWeights);
  });

  it('ends the sample mode when only girths are logged, keeping the sample weight', () => {
    const next = apply(sample, logMeasurement(sample, '2026-10-20', { waist: 84 })).state;
    expect(next.setupDone).toBe(true);
    expect(next.bodyWeights).toEqual(sample.state.bodyWeights);
  });

  it('ignores empty and non-positive input', () => {
    expect(logMeasurement(own, '2026-10-20', {})).toEqual({});
    expect(logMeasurement(own, '2026-10-20', { kg: 0, waist: -1, neck: undefined })).toEqual({});
  });
});

describe('deleteMeasurement', () => {
  it('removes the weight and the girths of a date', () => {
    let snapshot = apply(own, logMeasurement(own, '2026-10-20', { kg: 79, waist: 84 }));
    snapshot = apply(snapshot, deleteMeasurement(snapshot, '2026-10-20'));
    expect(snapshot.state.bodyWeights).toEqual(own.state.bodyWeights);
    expect(snapshot.state.measurements).toEqual([]);
  });
});

describe('metricSeries', () => {
  const state = {
    ...own.state,
    bodyWeights: [
      { date: '2026-10-20', kg: 79 },
      { date: '2026-10-01', kg: 81 },
    ],
    measurements: [
      { date: '2026-10-20', neck: 38, waist: 84 },
      { date: '2026-10-01', neck: 38, waist: 88, arm: 36 },
      { date: '2026-10-10', arm: 36.5 },
    ],
  };

  it('sorts weights by date', () => {
    expect(metricSeries(state, 'kg')).toEqual([
      ['2026-10-01', 81],
      ['2026-10-20', 79],
    ]);
  });

  it('returns a girth only for the dates it was measured on', () => {
    expect(metricSeries(state, 'arm')).toEqual([
      ['2026-10-01', 36],
      ['2026-10-10', 36.5],
    ]);
    expect(metricSeries(state, 'thigh')).toEqual([]);
  });

  it('estimates body fat where neck and waist are known', () => {
    const series = metricSeries(state, 'bf');
    expect(series.map(([date]) => date)).toEqual(['2026-10-01', '2026-10-20']);
    expect(series[1]?.[1]).toBe(15.7);
    expect(series[0]?.[1]).toBeGreaterThan(15.7);
  });

  it('looks up the value that was current on a date', () => {
    const weights = metricSeries(state, 'kg');
    expect(valueOn(weights, '2026-09-30')).toBeNull();
    expect(valueOn(weights, '2026-10-01')).toBe(81);
    expect(valueOn(weights, '2026-10-15')).toBe(81);
    expect(valueOn(weights, '2026-11-01')).toBe(79);
  });
});

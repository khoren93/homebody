import { type IsoDate, mondayOnOrAfter } from '@/engine';

import { type AppState, STATE_VERSION } from './schema';
import type { Snapshot } from './types';

/**
 * The example profile shown on first launch, so that the app has a real plan
 * to show before the user enters anything. It is clearly labelled as a sample
 * until `setupDone` becomes true.
 */
export function createSampleState(today: IsoDate): AppState {
  return {
    version: STATE_VERSION,
    setupDone: false,
    profile: { sex: 'male', age: 30, heightCm: 178, level: 'intermediate', goal: 'hypertrophy' },
    schedule: {
      days: [0, 2, 4],
      minutes: 45,
      start: mondayOnOrAfter(today),
      weeks: 4,
      deload: true,
    },
    loadScale: 1,
    equipment: { db: true, bench: true, bands: true, box: true, bar: true },
    equipmentConfig: {
      db: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
      kb: [8, 12, 16],
      bb: { bar: 20, step: 2.5, max: 100 },
      ez: { bar: 10, step: 2.5, max: 50 },
    },
    bodyWeights: [{ date: today, kg: 80 }],
    measurements: [],
    swaps: {},
    overrides: {},
    excluded: {},
    carried: {},
    shifts: [],
    done: {},
    skipped: {},
    block: 1,
  };
}

export function createSampleSnapshot(today: IsoDate): Snapshot {
  return { state: createSampleState(today), history: [], setLogs: {} };
}

import { EXERCISES } from '@/data';

import { createCatalog } from '../catalog';
import type { EngineInput } from '../types';
import scenariosJson from './fixtures/scenarios.json?raw';

export const catalog = createCatalog(EXERCISES);

/** The sample profile: 80 kg intermediate man, three 45-minute days, basic home kit. */
export function makeInput(patch: Partial<EngineInput> = {}): EngineInput {
  return {
    profile: { sex: 'male', age: 30, heightCm: 178, level: 'intermediate', goal: 'hypertrophy' },
    schedule: { days: [0, 2, 4], minutes: 45, start: '2026-10-12', weeks: 4, deload: true },
    loadScale: 1,
    equipment: { db: true, bench: true, bands: true, box: true, bar: true },
    equipmentConfig: {
      db: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
      kb: [8, 12, 16],
      bb: { bar: 20, step: 2.5, max: 100 },
      ez: { bar: 10, step: 2.5, max: 50 },
    },
    bodyWeights: [{ date: '2026-10-11', kg: 80 }],
    swaps: {},
    overrides: {},
    excluded: {},
    carried: {},
    shifts: [],
    ...patch,
  };
}

export const ALL_EQUIPMENT = {
  db: true,
  bench: true,
  bb: true,
  rack: true,
  ez: true,
  kb: true,
  bar: true,
  dip: true,
  bands: true,
  box: true,
  ball: true,
  medball: true,
} as const;

export type Scenario = { name: string; input: EngineInput };

/**
 * Inputs of the parity scenarios. The matching `*.golden.json` files hold the
 * values the original prototype engine produced for them; see fixtures/README.md.
 */
export const scenarios = JSON.parse(scenariosJson) as Scenario[];

/** Rounds like the golden files do, so floats compare exactly. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

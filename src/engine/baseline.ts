import type { Exercise } from '@/data/schema';

import { AGE, DEFAULT_BODY_WEIGHT, FEMALE_FACTORS, LEVELS, LOWER_BODY_PATTERNS } from './constants';
import type { EngineInput } from './types';

type BaselineInput = Pick<EngineInput, 'profile' | 'schedule' | 'bodyWeights'>;

/**
 * Body weight the starting loads are based on: the last entry logged on or
 * before the plan start, else the earliest entry, else a default.
 */
export function bodyWeightAtStart(input: Pick<EngineInput, 'schedule' | 'bodyWeights'>): number {
  const log = [...input.bodyWeights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const first = log[0];
  if (!first) return DEFAULT_BODY_WEIGHT;
  let weight: number | undefined;
  for (const entry of log) if (entry.date <= input.schedule.start) weight = entry.kg;
  return weight ?? first.kg;
}

/** Multiplier for age: 1 up to 40, then a slow linear decline with a floor. */
export function ageFactor(age: number): number {
  return age > AGE.from ? Math.max(AGE.floor, 1 - (age - AGE.from) * AGE.lossPerYear) : 1;
}

/**
 * Starting estimate for an exercise before anything was logged:
 * one-rep max in kg for weighted exercises, max reps or max seconds otherwise.
 */
export function baselineCapacity(exercise: Exercise, input: BaselineInput): number {
  const { profile } = input;
  const level = LEVELS[profile.level];
  const region = exercise.patterns.some((p) => LOWER_BODY_PATTERNS.has(p)) ? 'lower' : 'upper';

  if (exercise.type === 'weighted') {
    const sex = profile.sex === 'female' ? FEMALE_FACTORS.weighted[region] : 1;
    return (
      exercise.baseline * bodyWeightAtStart(input) * level.strength * sex * ageFactor(profile.age)
    );
  }

  const sex = profile.sex === 'female' ? FEMALE_FACTORS.bodyweight[region] : 1;
  const floor = exercise.type === 'timed' ? 15 : 2;
  return Math.max(floor, exercise.baseline * level.endurance * sex * ageFactor(profile.age));
}

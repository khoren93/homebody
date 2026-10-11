import type { Exercise } from '@/data/schema';

import type { EngineInput, OwnedEquipment } from './types';

/** The kind of implement an exercise is loaded with. */
export type Implement = 'bb' | 'ez' | 'db' | 'kb';

/** True when the user owns everything required by at least one alternative. */
export function hasEquipment(exercise: Exercise, owned: OwnedEquipment): boolean {
  return exercise.equipment.some((alternative) => alternative.every((item) => owned[item]));
}

/**
 * The implement the user will actually use. Exercises that accept either a
 * dumbbell or a kettlebell resolve to the first alternative that is owned.
 */
export function implementOf(exercise: Exercise, owned: OwnedEquipment): Implement {
  if (exercise.loadMode === 'bar') return 'bb';
  if (exercise.loadMode === 'ez') return 'ez';
  const alternative =
    exercise.equipment.find((items) => items.every((item) => owned[item])) ?? exercise.equipment[0];
  return alternative?.includes('kb') ? 'kb' : 'db';
}

/** Distinct positive numbers in ascending order. */
export function normalizeWeights(values: readonly number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))].sort(
    (a, b) => a - b,
  );
}

/**
 * Parses a user-typed list such as `"2, 4; 6.5 8"` into weights.
 *
 * Both decimal points and decimal commas are accepted. A comma between two
 * numbers is ambiguous (`2,5` may mean 2.5 or "2 and 5"); it is read as a
 * decimal comma only when that gives a weight in quarter-kilogram steps.
 */
export function parseWeightList(text: string): number[] {
  const values: number[] = [];
  for (const token of text.split(/[\s;]+/)) {
    const parts = token.split(',').filter((part) => part !== '');
    const [whole, fraction] = parts;
    if (parts.length === 2 && whole !== undefined && fraction !== undefined) {
      const decimal = Number.parseFloat(`${whole}.${fraction}`);
      if (/^\d+$/.test(whole) && /^\d+$/.test(fraction) && (decimal * 4) % 1 === 0) {
        values.push(decimal);
        continue;
      }
    }
    for (const part of parts) values.push(Number.parseFloat(part));
  }
  return normalizeWeights(values);
}

/**
 * Every load the user can set up for an exercise, in ascending order:
 * the listed dumbbells or kettlebells, or the bar plus plates in equal steps.
 */
export function availableWeights(
  exercise: Exercise,
  input: Pick<EngineInput, 'equipment' | 'equipmentConfig'>,
): number[] {
  const implement = implementOf(exercise, input.equipment);

  if (implement === 'bb' || implement === 'ez') {
    const config = input.equipmentConfig[implement];
    const bar = config.bar || 0;
    const step = Math.max(0.5, config.step || 2.5);
    const max = Math.max(bar, config.max || bar);
    const weights: number[] = [];
    for (let weight = bar; weight <= max + 1e-6; weight += step) {
      weights.push(Math.round(weight * 100) / 100);
    }
    return weights;
  }

  const weights = normalizeWeights(input.equipmentConfig[implement]);
  return weights.length > 0 ? weights : [1];
}

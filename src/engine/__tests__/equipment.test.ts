import { describe, expect, it } from 'vitest';

import { requireExercise } from '@/data';

import {
  availableWeights,
  hasEquipment,
  implementOf,
  normalizeWeights,
  parseWeightList,
} from '../equipment';
import { makeInput } from './helpers';

describe('hasEquipment', () => {
  it('needs every item of at least one alternative', () => {
    const benchPress = requireExercise('Dumbbell_Bench_Press'); // db + bench
    expect(hasEquipment(benchPress, { db: true })).toBe(false);
    expect(hasEquipment(benchPress, { db: true, bench: true })).toBe(true);

    const goblet = requireExercise('Goblet_Squat'); // db or kb
    expect(hasEquipment(goblet, { kb: true })).toBe(true);
    expect(hasEquipment(goblet, {})).toBe(false);
  });

  it('treats bodyweight exercises as always available', () => {
    expect(hasEquipment(requireExercise('Pushups'), {})).toBe(true);
  });

  it('ignores equipment that is switched off', () => {
    expect(hasEquipment(requireExercise('Goblet_Squat'), { db: false, kb: false })).toBe(false);
  });
});

describe('implementOf', () => {
  it('follows the load mode for bars', () => {
    expect(implementOf(requireExercise('Barbell_Squat'), {})).toBe('bb');
    expect(implementOf(requireExercise('Close-Grip_EZ_Bar_Curl'), {})).toBe('ez');
  });

  it('uses the first owned alternative for hand-held weights', () => {
    const goblet = requireExercise('Goblet_Squat'); // [db] or [kb]
    expect(implementOf(goblet, { db: true, kb: true })).toBe('db');
    expect(implementOf(goblet, { kb: true })).toBe('kb');
    expect(implementOf(goblet, {})).toBe('db');

    const swing = requireExercise('One-Arm_Kettlebell_Swings'); // [kb] or [db]
    expect(implementOf(swing, { db: true, kb: true })).toBe('kb');
    expect(implementOf(swing, { db: true })).toBe('db');
  });
});

describe('weight lists', () => {
  it('normalizes to distinct positive ascending numbers', () => {
    expect(normalizeWeights([8, 2, 2, 0, -4, Number.NaN, 6])).toEqual([2, 6, 8]);
  });

  it.each([
    ['2, 4, 6, 8', [2, 4, 6, 8]],
    ['2 4;6', [2, 4, 6]],
    ['2.5, 5, 7.5', [2.5, 5, 7.5]],
    ['2,5, 5, 7,5', [2.5, 5, 7.5]],
    ['8,12', [8, 12]],
    ['8,12,16', [8, 12, 16]],
    ['1,25 2,5', [1.25, 2.5]],
    ['10 kg, 12kg', [10, 12]],
    ['', []],
    ['abc', []],
  ])('parses %j', (text, expected) => {
    expect(parseWeightList(text)).toEqual(expected);
  });

  it('lists the owned dumbbells or kettlebells', () => {
    const input = makeInput({ equipment: { db: true, kb: true } });
    expect(availableWeights(requireExercise('Dumbbell_Bench_Press'), input)).toEqual(
      input.equipmentConfig.db,
    );
    expect(availableWeights(requireExercise('One-Arm_Kettlebell_Row'), input)).toEqual([8, 12, 16]);
  });

  it('falls back to a single 1 kg option when the list is empty', () => {
    const input = makeInput();
    input.equipmentConfig.db = [];
    expect(availableWeights(requireExercise('Dumbbell_Bench_Press'), input)).toEqual([1]);
  });

  it('steps a barbell from the empty bar to its maximum', () => {
    const input = makeInput();
    input.equipmentConfig.bb = { bar: 20, step: 2.5, max: 30 };
    expect(availableWeights(requireExercise('Barbell_Squat'), input)).toEqual([
      20, 22.5, 25, 27.5, 30,
    ]);
  });

  it('guards against a zero step and a maximum below the bar', () => {
    const input = makeInput();
    input.equipmentConfig.ez = { bar: 10, step: 0, max: 5 };
    expect(availableWeights(requireExercise('Close-Grip_EZ_Bar_Curl'), input)).toEqual([10]);

    input.equipmentConfig.ez = { bar: 10, step: 0.1, max: 11 };
    expect(availableWeights(requireExercise('Close-Grip_EZ_Bar_Curl'), input)).toEqual([
      10, 10.5, 11,
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { exercisePhotoUrl, EXERCISES, getExercise, requireExercise } from './exercises';
import { ExerciseSchema, MUSCLE_IDS, PATTERN_IDS } from './schema';

describe('exercise catalog', () => {
  it('loads and validates the whole dataset', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(141);
  });

  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every muscle with at least one primary exercise', () => {
    for (const muscle of MUSCLE_IDS) {
      expect(
        EXERCISES.some((e) => e.primary.includes(muscle)),
        muscle,
      ).toBe(true);
    }
  });

  it('has at least one equipment-free or regular exercise for every pattern', () => {
    for (const pattern of PATTERN_IDS) {
      expect(
        EXERCISES.some((e) => e.patterns.includes(pattern)),
        pattern,
      ).toBe(true);
    }
  });

  it('names both implements whenever implement-specific names are given', () => {
    for (const e of EXERCISES.filter((x) => x.implementNames)) {
      const implementsUsed = new Set(e.equipment.flat());
      expect(implementsUsed.has('db') && implementsUsed.has('kb'), e.id).toBe(true);
      expect(Object.keys(e.implementNames ?? {}).sort(), e.id).toEqual(['db', 'kb']);
      expect(e.photoImplement, e.id).toBeDefined();
    }
  });

  it('has the technique in Russian, step for step, for every exercise', () => {
    for (const e of EXERCISES) {
      expect(e.instructions.ru?.length, e.id).toBe(e.instructions.en.length);
    }
  });

  it('looks exercises up by id', () => {
    expect(getExercise('Goblet_Squat')?.name.en).toBe('Goblet Squat');
    expect(getExercise('nope')).toBeUndefined();
    expect(requireExercise('Plank').type).toBe('timed');
    expect(() => requireExercise('nope')).toThrow(/Unknown exercise/);
  });

  it('builds photo URLs under the public base path', () => {
    expect(exercisePhotoUrl('Plank', 0, '/')).toBe('/exercises/Plank/0.webp');
    expect(exercisePhotoUrl('Plank', 1, '/homebody/')).toBe('/homebody/exercises/Plank/1.webp');
  });
});

describe('exercise schema', () => {
  const valid = {
    id: 'Test_Curl',
    name: { en: 'Test Curl', ru: 'Тестовое сгибание' },
    patterns: ['biceps'],
    equipment: [['db']],
    type: 'weighted',
    loadMode: 'pair',
    baseline: 0.16,
    unilateral: false,
    compound: false,
    primary: ['biceps'],
    secondary: ['forearms'],
    level: 'beginner',
    instructions: { en: ['Curl the weights.'] },
  };

  it('accepts a well-formed record', () => {
    expect(ExerciseSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['a weighted exercise without a load mode', { loadMode: undefined }],
    ['a load mode on a bodyweight exercise', { type: 'reps' }],
    ['an unknown muscle', { primary: ['wings'] }],
    ['an unknown pattern', { patterns: ['jump'] }],
    ['an unknown equipment id', { equipment: [['trampoline']] }],
    ['a muscle listed as both primary and secondary', { secondary: ['biceps'] }],
    ['a missing Russian name', { name: { en: 'Test Curl' } }],
    ['empty instructions', { instructions: { en: [] } }],
    ['an id with spaces', { id: 'Test Curl' }],
    ['a non-positive baseline', { baseline: 0 }],
    ['an inverted rep range', { repRange: { target: 10, min: 12, max: 8 } }],
    ['an unknown field', { calories: 100 }],
  ])('rejects %s', (_label, patch) => {
    expect(ExerciseSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

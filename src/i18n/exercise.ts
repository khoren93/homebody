import type { Exercise } from '@/data';
import { implementOf, type OwnedEquipment } from '@/engine';

import type { Locale } from './locale';

/**
 * Display name of an exercise. Exercises that work with either a dumbbell or
 * a kettlebell are named after the implement the user actually owns.
 */
export function exerciseName(exercise: Exercise, locale: Locale, owned: OwnedEquipment): string {
  if (exercise.implementNames) {
    const implement = implementOf(exercise, owned);
    if (implement === 'db' || implement === 'kb') {
      const name = exercise.implementNames[implement];
      if (name) return name[locale];
    }
  }
  return exercise.name[locale];
}

/**
 * The implement shown in the photos when it differs from the one the user
 * will use, so the UI can explain the mismatch. Returns nothing otherwise.
 */
export function photoMismatch(
  exercise: Exercise,
  owned: OwnedEquipment,
): { shown: 'db' | 'kb'; used: 'db' | 'kb' } | undefined {
  const shown = exercise.photoImplement;
  if (!shown) return undefined;
  const used = implementOf(exercise, owned);
  if (used === shown || (used !== 'db' && used !== 'kb')) return undefined;
  return { shown, used };
}

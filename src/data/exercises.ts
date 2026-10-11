import rawExercises from '../../data/exercises.json';
import { type Exercise, ExerciseListSchema } from './schema';

/**
 * The exercise catalog, in dataset order.
 *
 * The order is meaningful: when several exercises fit a template slot, the
 * plan builder prefers the ones that come first.
 */
export const EXERCISES: readonly Exercise[] = Object.freeze(ExerciseListSchema.parse(rawExercises));

const byId: ReadonlyMap<string, Exercise> = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

/** Like {@link getExercise}, for ids that are known to exist. */
export function requireExercise(id: string): Exercise {
  const exercise = byId.get(id);
  if (!exercise) throw new Error(`Unknown exercise id "${id}"`);
  return exercise;
}

/**
 * URL of an exercise photo: frame 0 is the start position, frame 1 the end.
 * `base` is the public base path of the app and ends with a slash.
 */
export function exercisePhotoUrl(
  id: string,
  frame: 0 | 1,
  base: string = import.meta.env.BASE_URL,
): string {
  return `${base}exercises/${id}/${frame}.webp`;
}

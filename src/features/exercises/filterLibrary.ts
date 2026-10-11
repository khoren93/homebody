import type { Exercise, MuscleId } from '@/data';

export const AVAILABILITY = ['all', 'owned', 'plan'] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const DENSITIES = ['compact', 'grid', 'cards'] as const;
export type Density = (typeof DENSITIES)[number];

export type LibraryFilter = {
  /** Free text matched against names, muscles and equipment. */
  query: string;
  availability: Availability;
  /** Only exercises that train this muscle, as a primary or secondary mover. */
  muscle?: MuscleId | undefined;
};

export type LibraryContext = {
  /** True when the exercise can be done with the owned equipment. */
  isAvailable: (exercise: Exercise) => boolean;
  inPlan: ReadonlySet<string>;
  /** Display name, used for sorting. */
  nameOf: (exercise: Exercise) => string;
  /** Everything searchable about an exercise, lower-cased. */
  searchTextOf: (exercise: Exercise) => string;
  locale: string;
};

/**
 * Filters and orders the catalog for the library. Exercises in the plan come
 * first, then the ones that can be done with the owned equipment; with a
 * muscle selected, exercises that train it directly come before those that
 * only assist. Ties are sorted by name.
 */
export function filterLibrary(
  exercises: readonly Exercise[],
  filter: LibraryFilter,
  context: LibraryContext,
): Exercise[] {
  const words = filter.query.trim().toLocaleLowerCase(context.locale).split(/\s+/).filter(Boolean);
  const { muscle } = filter;

  const matches = exercises.filter((exercise) => {
    if (muscle && !exercise.primary.includes(muscle) && !exercise.secondary.includes(muscle)) {
      return false;
    }
    if (filter.availability === 'owned' && !context.isAvailable(exercise)) return false;
    if (filter.availability === 'plan' && !context.inPlan.has(exercise.id)) return false;
    if (words.length === 0) return true;
    const text = context.searchTextOf(exercise);
    return words.every((word) => text.includes(word));
  });

  const rank = (exercise: Exercise) =>
    (muscle && !exercise.primary.includes(muscle) ? 10 : 0) +
    (context.inPlan.has(exercise.id) ? 0 : 2) +
    (context.isAvailable(exercise) ? 0 : 1);

  return matches.sort(
    (a, b) =>
      rank(a) - rank(b) || context.nameOf(a).localeCompare(context.nameOf(b), context.locale),
  );
}

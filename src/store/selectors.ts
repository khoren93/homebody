import type { BodyWeightEntry, LoadedPlan } from '@/engine';

/** The most recent body weight entry, if any. */
export function latestBodyWeight(entries: readonly BodyWeightEntry[]): BodyWeightEntry | undefined {
  return entries.reduce<BodyWeightEntry | undefined>(
    (latest, entry) => (!latest || entry.date >= latest.date ? entry : latest),
    undefined,
  );
}

/** Ids of every exercise that appears anywhere in the plan, in order of first appearance. */
export function planExerciseIds(plan: Pick<LoadedPlan, 'sessions'>): string[] {
  const ids = new Set<string>();
  for (const session of plan.sessions) {
    for (const item of session.items) ids.add(item.exerciseId);
  }
  return [...ids];
}

/** Which exercises entered and left the plan between two versions of it. */
export function diffPlanExercises(
  before: Pick<LoadedPlan, 'sessions'>,
  after: Pick<LoadedPlan, 'sessions'>,
): { added: string[]; removed: string[] } {
  const previous = planExerciseIds(before);
  const next = planExerciseIds(after);
  return {
    added: next.filter((id) => !previous.includes(id)),
    removed: previous.filter((id) => !next.includes(id)),
  };
}

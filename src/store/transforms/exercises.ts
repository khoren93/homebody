import { type HistoryEntry, historyEntry, type IsoDate, overrideKey, type SlotKey } from '@/engine';

import { derivePlan } from '../derived';
import type { AppState } from '../schema';
import type { Patch, Snapshot } from '../types';

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

/**
 * Keeps the history in step with an edit: if a result was already recorded
 * for this exercise in this session, it is rewritten from the new numbers.
 */
function rerecord(
  history: HistoryEntry[],
  state: AppState,
  sessionId: IsoDate,
  exerciseId: string,
): HistoryEntry[] {
  const index = history.findIndex(
    (entry) => entry.sessionId === sessionId && entry.exerciseId === exerciseId,
  );
  const recorded = history[index];
  if (!recorded) return history;

  const session = derivePlan(state).plan.sessions.find((s) => s.id === sessionId);
  const item = session?.items.find((i) => i.exerciseId === exerciseId);
  const updated = session && item ? historyEntry(session, item, recorded.sets) : undefined;
  if (!updated) return history;
  return history.map((entry, i) => (i === index ? updated : entry));
}

/** Puts an exercise into a template slot, or returns the slot to automatic choice. */
export function swapExercise({ state }: Snapshot, slot: SlotKey, exerciseId: string | null): Patch {
  const swaps =
    exerciseId === null ? without(state.swaps, slot) : { ...state.swaps, [slot]: exerciseId };
  return { state: { ...state, swaps } };
}

/** Removes an exercise from every workout until it is restored. */
export function excludeExercise({ state }: Snapshot, exerciseId: string): Patch {
  return { state: { ...state, excluded: { ...state.excluded, [exerciseId]: true } } };
}

export function restoreExercise({ state }: Snapshot, exerciseId: string): Patch {
  return { state: { ...state, excluded: without(state.excluded, exerciseId) } };
}

/**
 * Records what the user actually did (or will do) for an exercise in a
 * session. `reps` holds seconds for timed exercises. A rating given earlier
 * is kept.
 */
export function editPrescription(
  { state, history }: Snapshot,
  exerciseId: string,
  sessionId: IsoDate,
  values: { weight?: number; reps: number },
): Patch {
  const key = overrideKey(exerciseId, sessionId);
  const next: AppState = {
    ...state,
    overrides: { ...state.overrides, [key]: { ...state.overrides[key], ...values } },
  };
  return { state: next, history: rerecord(history, next, sessionId, exerciseId) };
}

/** Drops the edit and the rating of an exercise in a session. */
export function restoreCalculation(
  { state, history }: Snapshot,
  exerciseId: string,
  sessionId: IsoDate,
): Patch {
  const next: AppState = {
    ...state,
    overrides: without(state.overrides, overrideKey(exerciseId, sessionId)),
  };
  return { state: next, history: rerecord(history, next, sessionId, exerciseId) };
}

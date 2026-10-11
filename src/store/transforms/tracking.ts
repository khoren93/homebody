import { type HistoryEntry, historyEntry, type IsoDate, overrideKey, type Rating } from '@/engine';

import { derivePlan } from '../derived';
import type { AppState } from '../schema';
import { completedSets } from '../selectors';
import type { Patch, SetLogs, Snapshot } from '../types';
import { recordSession } from './sessions';

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

function replaceEntry(
  history: readonly HistoryEntry[],
  sessionId: string,
  exerciseId: string,
  entry: HistoryEntry | undefined,
): HistoryEntry[] {
  const others = history.filter(
    (candidate) => !(candidate.sessionId === sessionId && candidate.exerciseId === exerciseId),
  );
  return entry ? [...others, entry] : others;
}

/**
 * Ticks or unticks one set.
 *
 * - Finishing the last set of an exercise records its result.
 * - Finishing the last set of the session marks the session as done and
 *   records all of it.
 * - Unticking a set of a recorded exercise corrects the record, and removes
 *   it when no set is left.
 */
export function toggleSet(
  { state, history, setLogs }: Snapshot,
  sessionId: IsoDate,
  exerciseId: string,
  index: number,
): Patch {
  const session = derivePlan(state).plan.sessions.find((candidate) => candidate.id === sessionId);
  const item = session?.items.find((candidate) => candidate.exerciseId === exerciseId);
  if (!session || !item || index < 0 || index >= item.sets) return {};

  const ticks = Array.from(
    { length: item.sets },
    (_, i) => !!setLogs[sessionId]?.[exerciseId]?.[i],
  );
  ticks[index] = !ticks[index];
  const nextLogs: SetLogs = {
    ...setLogs,
    [sessionId]: { ...setLogs[sessionId], [exerciseId]: ticks },
  };
  const count = completedSets(nextLogs, sessionId, item);

  if (!ticks[index]) {
    const recorded = history.some((e) => e.sessionId === sessionId && e.exerciseId === exerciseId);
    return {
      setLogs: nextLogs,
      history: recorded
        ? replaceEntry(history, sessionId, exerciseId, historyEntry(session, item, count))
        : history,
    };
  }

  const sessionComplete = session.items.every(
    (other) => completedSets(nextLogs, sessionId, other) >= other.sets,
  );
  if (sessionComplete) {
    const nextState: AppState = {
      ...state,
      done: { ...state.done, [sessionId]: true },
      skipped: without(state.skipped, sessionId),
    };
    return {
      state: nextState,
      setLogs: nextLogs,
      history: recordSession(history, session, nextLogs),
    };
  }

  return {
    setLogs: nextLogs,
    history:
      count >= item.sets
        ? replaceEntry(history, sessionId, exerciseId, historyEntry(session, item, count))
        : history,
  };
}

/**
 * Rates how an exercise went. Choosing the same rating again clears it. The
 * rating shifts the reps in reserve that were actually left, which changes
 * the loads of later sessions; a result that was already recorded is updated.
 */
export function rateExercise(
  { state, history }: Snapshot,
  exerciseId: string,
  sessionId: IsoDate,
  rating: Rating,
): Patch {
  const key = overrideKey(exerciseId, sessionId);
  const { rating: current, ...rest } = state.overrides[key] ?? {};
  const override = current === rating ? rest : { ...rest, rating };
  const overrides =
    Object.keys(override).length > 0
      ? { ...state.overrides, [key]: override }
      : without(state.overrides, key);
  const nextState: AppState = { ...state, overrides };

  const recorded = history.find((e) => e.sessionId === sessionId && e.exerciseId === exerciseId);
  if (!recorded) return { state: nextState };

  const session = derivePlan(nextState).plan.sessions.find((s) => s.id === sessionId);
  const item = session?.items.find((i) => i.exerciseId === exerciseId);
  const updated = session && item ? historyEntry(session, item, recorded.sets) : undefined;
  return {
    state: nextState,
    history: updated ? replaceEntry(history, sessionId, exerciseId, updated) : history,
  };
}

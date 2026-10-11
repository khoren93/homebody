import {
  diffDays,
  type HistoryEntry,
  historyEntry,
  type IsoDate,
  type LoadedSession,
  nextBlock,
} from '@/engine';

import { CATALOG } from '../catalog';
import { derivePlan } from '../derived';
import type { AppState } from '../schema';
import { completedSets } from '../selectors';
import type { Patch, SetLogs, Snapshot } from '../types';

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

/**
 * History rows for a finished session, replacing what was recorded for it
 * before. An exercise counts with the sets that were ticked, or with all of
 * its sets when the session was marked as done without ticking them.
 */
export function recordSession(
  history: readonly HistoryEntry[],
  session: LoadedSession,
  setLogs: SetLogs,
): HistoryEntry[] {
  const entries = session.items.flatMap((item) => {
    const ticked = completedSets(setLogs, session.id, item);
    return historyEntry(session, item, ticked > 0 ? ticked : item.sets) ?? [];
  });
  return [...history.filter((entry) => entry.sessionId !== session.id), ...entries];
}

function findSession(state: AppState, sessionId: IsoDate): LoadedSession | undefined {
  return derivePlan(state).plan.sessions.find((session) => session.id === sessionId);
}

/** Marks a session as done (recording its results) or takes that back. */
export function toggleSessionDone(
  { state, history, setLogs }: Snapshot,
  sessionId: IsoDate,
): Patch {
  if (state.done[sessionId]) {
    return {
      state: { ...state, done: without(state.done, sessionId) },
      history: history.filter((entry) => entry.sessionId !== sessionId),
    };
  }

  const next: AppState = {
    ...state,
    done: { ...state.done, [sessionId]: true },
    skipped: without(state.skipped, sessionId),
  };
  const session = findSession(next, sessionId);
  return { state: next, history: session ? recordSession(history, session, setLogs) : history };
}

/**
 * Starts the next training block: capacities reached in this one are carried
 * over, edits and shifts are cleared, the load scale returns to 100 % and the
 * plan restarts on the following Monday.
 */
export function startNextBlock({ state }: Snapshot, today: IsoDate): Patch {
  const { carried, start } = nextBlock(derivePlan(state).plan, state, CATALOG, today);
  return {
    state: {
      ...state,
      carried: Object.fromEntries(
        Object.entries(carried).filter(
          (entry): entry is [string, number] => entry[1] !== undefined,
        ),
      ),
      schedule: { ...state.schedule, start },
      shifts: [],
      overrides: {},
      loadScale: 1,
      block: state.block + 1,
    },
  };
}

/**
 * Moves a missed session to today. Every session planned on or after it
 * shifts forward by the same number of days, so the order and the spacing of
 * the plan are preserved.
 */
export function moveSessionToToday({ state }: Snapshot, sessionId: IsoDate, today: IsoDate): Patch {
  const session = findSession(state, sessionId);
  if (!session) return {};
  const days = diffDays(session.date, today);
  if (days <= 0) return {};
  return { state: { ...state, shifts: [...state.shifts, { at: sessionId, days }] } };
}

/** Leaves a session out of the plan without doing it. */
export function skipSession({ state }: Snapshot, sessionId: IsoDate): Patch {
  return { state: { ...state, skipped: { ...state.skipped, [sessionId]: true } } };
}

export function unskipSession({ state }: Snapshot, sessionId: IsoDate): Patch {
  return { state: { ...state, skipped: without(state.skipped, sessionId) } };
}

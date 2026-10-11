import type { BodyWeightEntry, IsoDate, LoadedItem, LoadedPlan, LoadedSession } from '@/engine';

import type { AppState } from './schema';
import type { SetLogs } from './types';

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

type SessionRef = Pick<LoadedSession, 'id' | 'date'>;
type SessionFlags = Pick<AppState, 'done' | 'skipped'>;

/** A session is finished when it was done or deliberately skipped. */
export function isFinished(state: SessionFlags, sessionId: string): boolean {
  return !!state.done[sessionId] || !!state.skipped[sessionId];
}

/** A session is missed when its date has passed and it is not finished. */
export function isMissed(session: SessionRef, state: SessionFlags, today: IsoDate): boolean {
  return session.date < today && !isFinished(state, session.id);
}

/** The earliest missed session, if any. */
export function firstMissed<S extends SessionRef>(
  sessions: readonly S[],
  state: SessionFlags,
  today: IsoDate,
): S | undefined {
  return sessions.find((session) => isMissed(session, state, today));
}

/** The first session planned for today or later that is not finished yet. */
export function nextSession<S extends SessionRef>(
  sessions: readonly S[],
  state: SessionFlags,
  today: IsoDate,
): S | undefined {
  return sessions.find((session) => session.date >= today && !isFinished(state, session.id));
}

/** Number of ticked sets of an exercise in a session, capped at its planned sets. */
export function completedSets(
  setLogs: SetLogs,
  sessionId: string,
  item: Pick<LoadedItem, 'exerciseId' | 'sets'>,
): number {
  const ticks = setLogs[sessionId]?.[item.exerciseId] ?? [];
  return Math.min(item.sets, ticks.filter(Boolean).length);
}

/** Ticked and planned sets of a whole session. */
export function sessionProgress(
  session: Pick<LoadedSession, 'id' | 'items'>,
  setLogs: SetLogs,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const item of session.items) {
    done += completedSets(setLogs, session.id, item);
    total += item.sets;
  }
  return { done, total };
}

/** True when every session is finished or the last one is in the past. */
export function isBlockOver(
  sessions: readonly SessionRef[],
  state: SessionFlags,
  today: IsoDate,
): boolean {
  const last = sessions.at(-1);
  if (!last) return false;
  return last.date < today || sessions.every((session) => isFinished(state, session.id));
}

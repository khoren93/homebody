import type { HistoryEntry, IsoDate, LoadedItem, LoadedSession } from './types';

/** A value on a date, for charts. */
export type DatedPoint = [date: IsoDate, value: number];

export type ProgressSeries = {
  /** What was achieved: the capacity recorded after each finished session. */
  actual: DatedPoint[];
  /** What the plan expects from today on, starting at the last achieved point. */
  planned: DatedPoint[];
};

/** Every occurrence of an exercise in the plan, in order. */
export function exerciseSessions(
  sessions: readonly LoadedSession[],
  exerciseId: string,
): { session: LoadedSession; item: LoadedItem }[] {
  return sessions.flatMap((session) => {
    const item = session.items.find((candidate) => candidate.exerciseId === exerciseId);
    return item ? [{ session, item }] : [];
  });
}

/**
 * The progress of one exercise as two series: achieved capacities from the
 * history, and planned capacities of the sessions that are still ahead.
 * `entries` are the history entries of the exercise, oldest first.
 */
export function progressSeries(
  entries: readonly HistoryEntry[],
  sessions: readonly LoadedSession[],
  exerciseId: string,
  options: { today: IsoDate; isFinished: (sessionId: string) => boolean },
): ProgressSeries {
  const actual: DatedPoint[] = entries.map((entry) => [entry.date, entry.capacity]);
  const planned: DatedPoint[] = exerciseSessions(sessions, exerciseId)
    .filter(({ session }) => session.date >= options.today && !options.isFinished(session.id))
    .map(({ session, item }) => [session.date, item.prescription.capacity]);

  const last = actual.at(-1);
  if (last && planned.length > 0) planned.unshift(last);
  return { actual, planned };
}

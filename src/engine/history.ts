import type { HistoryEntry, LoadedItem, LoadedSession } from './types';

/**
 * The history record for an exercise of a session, given how many of its
 * sets were completed. Returns nothing when no set was done.
 */
export function historyEntry(
  session: Pick<LoadedSession, 'id' | 'date'>,
  item: LoadedItem,
  completedSets: number,
): HistoryEntry | undefined {
  if (completedSets <= 0) return undefined;
  const p = item.prescription;
  return {
    sessionId: session.id,
    exerciseId: item.exerciseId,
    date: session.date,
    weight: p.type === 'weighted' ? p.weight : null,
    reps: p.type === 'timed' ? p.seconds : p.reps,
    sets: completedSets,
    capacity: Math.round(p.capacity * 100) / 100,
    rating: p.rating ?? null,
  };
}

/** Entries of one exercise, oldest first. */
export function exerciseHistory(
  history: readonly HistoryEntry[],
  exerciseId: string,
): HistoryEntry[] {
  return history
    .filter((entry) => entry.exerciseId === exerciseId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export type HistorySummary = {
  /** Number of sessions the exercise was done in. */
  sessions: number;
  first: HistoryEntry;
  last: HistoryEntry;
  /** The session with the highest capacity. */
  best: HistoryEntry;
  /** Capacity change from the first to the last session in percent; null with one session. */
  gainPercent: number | null;
};

/** Summarizes the entries of one exercise (oldest first). */
export function summarizeHistory(entries: readonly HistoryEntry[]): HistorySummary | undefined {
  const first = entries[0];
  const last = entries.at(-1);
  if (!first || !last) return undefined;
  const best = entries.reduce((a, b) => (b.capacity > a.capacity ? b : a), first);
  const gainPercent =
    entries.length > 1 ? Math.round((last.capacity / first.capacity - 1) * 100) : null;
  return { sessions: entries.length, first, last, best, gainPercent };
}

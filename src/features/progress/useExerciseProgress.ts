import { useMemo } from 'react';

import type { Exercise } from '@/data';
import {
  exerciseHistory,
  exerciseSessions,
  type LoadedSession,
  progressSeries,
  summarizeHistory,
} from '@/engine';
import { useToday } from '@/lib/useToday';
import { isFinished, useAppStore } from '@/store';

/** Everything the progress views need to know about one exercise. */
export function useExerciseProgress(exercise: Exercise, sessions: readonly LoadedSession[]) {
  const today = useToday();
  const history = useAppStore((store) => store.history);
  const flags = useAppStore((store) => store.state);

  return useMemo(() => {
    const entries = exerciseHistory(history, exercise.id);
    const rows = exerciseSessions(sessions, exercise.id);
    const series = progressSeries(entries, sessions, exercise.id, {
      today,
      isFinished: (sessionId) => isFinished(flags, sessionId),
    });
    // The value to headline: the latest achieved capacity, else the next planned one.
    const upcoming = rows.find(
      ({ session }) => session.date >= today && !isFinished(flags, session.id),
    );
    const current =
      entries.at(-1)?.capacity ??
      upcoming?.item.prescription.capacity ??
      rows[0]?.item.prescription.capacity;
    return {
      entries,
      rows,
      series,
      summary: summarizeHistory(entries),
      current,
      /** The session to highlight in the table. */
      nextSessionId: upcoming?.session.id,
      today,
    };
  }, [history, flags, sessions, exercise.id, today]);
}

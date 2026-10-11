import type { MuscleId } from '@/data/schema';

import { GOALS, SECONDARY_SET_VALUE, SMALL_MUSCLE_SCALE } from './constants';
import { addDays, diffDays } from './dates';
import type {
  Catalog,
  Goal,
  HistoryEntry,
  IsoDate,
  MuscleLoad,
  PlanItem,
  Session,
  VolumeTier,
} from './types';

type Volume = Partial<Record<MuscleId, number>>;

function addSets(volume: Volume, catalog: Catalog, exerciseId: string, sets: number): void {
  const exercise = catalog.byId.get(exerciseId);
  if (!exercise) return;
  for (const muscle of exercise.primary) {
    volume[muscle] = (volume[muscle] ?? 0) + sets;
  }
  for (const muscle of exercise.secondary) {
    volume[muscle] = (volume[muscle] ?? 0) + sets * SECONDARY_SET_VALUE;
  }
}

/**
 * Planned working sets per muscle in a regular training week: the first week
 * of the plan, which is never a deload.
 */
export function weeklyVolume(
  plan: {
    sessions: readonly (Pick<Session, 'week' | 'deload'> & { items: readonly PlanItem[] })[];
  },
  catalog: Catalog,
): Volume {
  const volume: Volume = {};
  for (const session of plan.sessions) {
    if (session.week !== 0 || session.deload) continue;
    for (const item of session.items) addSets(volume, catalog, item.exerciseId, item.sets);
  }
  return volume;
}

/**
 * Sets actually performed per muscle.
 *
 * `days` is the length of the window ending today (7 = the last seven days);
 * 0 means all time, in which case the weekly average is taken over the span
 * from the first logged session to today, but at least one week.
 */
export function muscleLoad(
  history: readonly HistoryEntry[],
  catalog: Catalog,
  window: { today: IsoDate; days: number },
): MuscleLoad {
  const { today, days } = window;
  const from = days > 0 ? addDays(today, -(days - 1)) : '';
  const total: Volume = {};
  const last: Partial<Record<MuscleId, IsoDate>> = {};
  let first: IsoDate | undefined;

  for (const entry of history) {
    const exercise = catalog.byId.get(entry.exerciseId);
    if (!exercise || entry.date > today) continue;
    for (const muscle of exercise.primary) {
      const previous = last[muscle];
      if (!previous || entry.date > previous) last[muscle] = entry.date;
    }
    if (entry.date < from) continue;
    if (!first || entry.date < first) first = entry.date;
    addSets(total, catalog, entry.exerciseId, entry.sets);
  }

  const span = first ? diffDays(first, today) + 1 : 7;
  const weeks = days > 0 ? days / 7 : Math.max(1, span / 7);
  const perWeek: Volume = {};
  for (const [muscle, sets] of Object.entries(total) as [MuscleId, number][]) {
    perWeek[muscle] = sets / weeks;
  }
  return { perWeek, total, last, weeks };
}

/** Optimal weekly sets for a muscle: the goal's range, scaled down for small muscles. */
export function optimalWeeklySets(muscle: MuscleId, goal: Goal): [min: number, max: number] {
  const [min, max] = GOALS[goal].weeklySets;
  const scale = SMALL_MUSCLE_SCALE[muscle] ?? 1;
  return [min * scale, max * scale];
}

/**
 * Heat tier of a muscle for a weekly number of sets:
 * 0 no work · 1 very low · 2 below optimal · 3 optimal · 4 above optimal.
 */
export function volumeTier(muscle: MuscleId, weeklySets: number, goal: Goal): VolumeTier {
  const [min, max] = optimalWeeklySets(muscle, goal);
  if (!(weeklySets > 0)) return 0;
  if (weeklySets < min * 0.5) return 1;
  if (weeklySets < min) return 2;
  if (weeklySets <= max) return 3;
  return 4;
}

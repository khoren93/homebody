import { LEVELS } from './constants';
import { addDays, mondayOnOrAfter } from './dates';
import type { Catalog, EngineInput, IsoDate, LoadedPlan } from './types';

export type NextBlock = {
  /** Capacities to start the next block from, by exercise id. */
  carried: Partial<Record<string, number>>;
  /** First day of the next block: the Monday after the plan ends (or after today). */
  start: IsoDate;
};

/**
 * Prepares the next training block. Every exercise of the current plan is
 * projected to the end of the block at its regular growth rate, so the new
 * plan continues from the level that was reached. Manual edits are kept as
 * they are; calculated loads keep the global load scale baked in, because the
 * scale itself is reset to 100 % for the new block.
 */
export function nextBlock(
  loaded: LoadedPlan,
  input: Pick<EngineInput, 'profile' | 'schedule' | 'loadScale' | 'carried'>,
  catalog: Catalog,
  today: IsoDate,
): NextBlock {
  const level = LEVELS[input.profile.level];
  const carried: Partial<Record<string, number>> = { ...input.carried };

  for (const [id, capacity] of Object.entries(loaded.capacity)) {
    const exercise = catalog.byId.get(id);
    if (!exercise) continue;
    const weighted = exercise.type === 'weighted';
    const growth = weighted ? level.weeklyGain : level.weeklyGainReps;
    const scale = weighted && capacity.source !== 'edit' ? input.loadScale || 1 : 1;
    carried[id] =
      capacity.value * Math.pow(1 + growth, input.schedule.weeks - capacity.week) * scale;
  }

  const lastDate = loaded.sessions.at(-1)?.date ?? today;
  const after = lastDate > today ? lastDate : today;
  return { carried, start: mondayOnOrAfter(addDays(after, 1)) };
}

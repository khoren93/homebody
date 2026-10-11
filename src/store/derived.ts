import type { MuscleId } from '@/data';
import { buildPlan, computeLoads, type LoadedPlan, weeklyVolume } from '@/engine';

import { CATALOG } from './catalog';
import type { AppState } from './schema';
import { useAppStore } from './store';

export type DerivedPlan = {
  /** The whole plan with a prescription for every exercise. */
  plan: LoadedPlan;
  /** Planned sets per muscle in a regular week. */
  volume: Partial<Record<MuscleId, number>>;
};

let cachedFor: AppState | undefined;
let cached: DerivedPlan | undefined;

/**
 * Computes the plan for a state. The plan is never stored: it is derived from
 * the state on demand and cached for as long as the state object is the same.
 */
export function derivePlan(state: AppState): DerivedPlan {
  if (cached && cachedFor === state) return cached;
  const plan = computeLoads(buildPlan(state, CATALOG), state, CATALOG);
  cached = { plan, volume: weeklyVolume(plan, CATALOG) };
  cachedFor = state;
  return cached;
}

/** The current plan, recomputed whenever the state changes. */
export function usePlan(): DerivedPlan {
  return derivePlan(useAppStore((store) => store.state));
}

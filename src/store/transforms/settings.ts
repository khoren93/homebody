import type { EquipmentId } from '@/data';
import type { EquipmentConfig, IsoDate, Profile, Schedule } from '@/engine';

import type { AppState } from '../schema';
import type { Patch, Snapshot } from '../types';

/** Limits of the global load scale. */
export const LOAD_SCALE = { min: 0.4, max: 1.3, step: 0.05 } as const;

/** Limits of the session length slider, in minutes. */
export const SESSION_MINUTES = { min: 20, max: 120, step: 5 } as const;

/** Plan lengths the user can choose from, in weeks. */
export const PLAN_WEEKS = [4, 6, 8, 12] as const;

/**
 * Changes that tell us about the user (as opposed to moving the plan around)
 * end the sample mode: from then on the profile is treated as their own.
 */
function personal(state: AppState, changes: Partial<AppState>): Patch {
  return { state: { ...state, ...changes, setupDone: true } };
}

export function setProfile({ state }: Snapshot, changes: Partial<Profile>): Patch {
  return personal(state, { profile: { ...state.profile, ...changes } });
}

/**
 * Sets today's body weight. The sample weight is dropped the first time the
 * user enters their own.
 */
export function setBodyWeight({ state }: Snapshot, kg: number, today: IsoDate): Patch {
  const kept = state.setupDone ? state.bodyWeights.filter((entry) => entry.date !== today) : [];
  return personal(state, { bodyWeights: [...kept, { date: today, kg }] });
}

function clampScale(value: number): number {
  const clamped = Math.min(LOAD_SCALE.max, Math.max(LOAD_SCALE.min, value));
  return Math.round(clamped * 100) / 100;
}

export function setLoadScale({ state }: Snapshot, value: number): Patch {
  return personal(state, { loadScale: clampScale(value) });
}

export function nudgeLoadScale({ state }: Snapshot, delta: number): Patch {
  return personal(state, { loadScale: clampScale(state.loadScale + delta) });
}

export function toggleTrainingDay({ state }: Snapshot, day: number): Patch {
  const days = state.schedule.days.includes(day)
    ? state.schedule.days.filter((d) => d !== day)
    : [...state.schedule.days, day].sort((a, b) => a - b);
  return personal(state, { schedule: { ...state.schedule, days } });
}

export function setSessionMinutes({ state }: Snapshot, minutes: number): Patch {
  return personal(state, { schedule: { ...state.schedule, minutes } });
}

/** Start date, length and deload only move the plan; they do not end the sample mode. */
export function setPlanShape(
  { state }: Snapshot,
  changes: Partial<Pick<Schedule, 'start' | 'weeks' | 'deload'>>,
): Patch {
  return { state: { ...state, schedule: { ...state.schedule, ...changes } } };
}

export function toggleEquipment({ state }: Snapshot, id: EquipmentId): Patch {
  return personal(state, { equipment: { ...state.equipment, [id]: !state.equipment[id] } });
}

export function setEquipmentConfig({ state }: Snapshot, changes: Partial<EquipmentConfig>): Patch {
  return personal(state, { equipmentConfig: { ...state.equipmentConfig, ...changes } });
}

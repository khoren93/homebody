import type { IsoDate } from '@/engine';

import { type Girth, GIRTHS, type Measurement } from '../schema';
import type { Patch, Snapshot } from '../types';

export type MeasurementInput = { kg?: number | undefined } & Partial<
  Record<Girth, number | undefined>
>;

/**
 * Logs body weight and girths for a date. Only the values that were entered
 * are stored; girths are merged into what was already logged for that date.
 * The sample weight is dropped the first time the user logs their own.
 */
export function logMeasurement({ state }: Snapshot, date: IsoDate, input: MeasurementInput): Patch {
  const kg = input.kg && input.kg > 0 ? input.kg : undefined;
  const girths = GIRTHS.flatMap((girth) => {
    const value = input[girth];
    return value && value > 0 ? ([[girth, value]] as const) : [];
  });
  if (kg === undefined && girths.length === 0) return {};

  let bodyWeights = state.bodyWeights;
  if (kg !== undefined) {
    const kept = state.setupDone ? bodyWeights.filter((entry) => entry.date !== date) : [];
    bodyWeights = [...kept, { date, kg }];
  }

  let measurements = state.measurements;
  if (girths.length > 0) {
    const existing = measurements.find((entry) => entry.date === date);
    const merged: Measurement = { ...existing, date, ...Object.fromEntries(girths) };
    measurements = [...measurements.filter((entry) => entry.date !== date), merged];
  }

  return { state: { ...state, bodyWeights, measurements, setupDone: true } };
}

/** Removes everything logged for a date. */
export function deleteMeasurement({ state }: Snapshot, date: IsoDate): Patch {
  return {
    state: {
      ...state,
      bodyWeights: state.bodyWeights.filter((entry) => entry.date !== date),
      measurements: state.measurements.filter((entry) => entry.date !== date),
    },
  };
}

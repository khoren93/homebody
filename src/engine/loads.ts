import { baselineCapacity } from './baseline';
import { DELOAD_LOAD, LEVELS, RATING_RIR } from './constants';
import { availableWeights } from './equipment';
import type {
  Capacity,
  Catalog,
  EngineInput,
  LoadedItem,
  LoadedPlan,
  LoadedSession,
  NoteKey,
  OverrideKey,
  Plan,
  Prescription,
  RepRange,
  WarmupSet,
} from './types';

/**
 * Estimated one-rep max from a set, using the Epley formula extended with
 * reps in reserve: a set of `reps` with `rir` left in the tank counts as a set
 * of `reps + rir` to failure.
 */
export function e1rm(weight: number, reps: number, rir: number): number {
  return weight * (1 + (reps + rir) / 30);
}

/** Reps possible with `weight` at `rir` reps in reserve, for a given one-rep max. */
export function repsAt(oneRepMax: number, weight: number, rir: number): number {
  return Math.round(30 * (oneRepMax / weight - 1) - rir);
}

/** The heaviest available weight that does not exceed `target` (else the lightest). */
export function nearestBelow(target: number, weights: readonly number[]): number {
  let result = weights[0] ?? 0;
  for (const weight of weights) if (weight <= target + 1e-6) result = weight;
  return result;
}

export type LoadChoice = { weight: number; reps: number; note?: NoteKey };

/**
 * Chooses the weight to use from the ones that are available.
 *
 * Every weight is scored by the reps it allows at the prescribed reps in
 * reserve: inside the rep range the score is the distance to the target, and
 * outside it there is a penalty that grows faster below the range than above
 * it. The lowest score wins; ties go to the heavier weight.
 */
export function pickLoad(
  oneRepMax: number,
  range: RepRange,
  rir: number,
  weights: readonly number[],
): LoadChoice {
  let best: { weight: number; reps: number; score: number } | undefined;

  for (const weight of weights) {
    const reps = repsAt(oneRepMax, weight, rir);
    if (reps < 1) continue;
    const score =
      reps >= range.min && reps <= range.max
        ? Math.abs(reps - range.target)
        : 10 + (reps < range.min ? (range.min - reps) * 2 : reps - range.max);
    if (!best || score < best.score || (score === best.score && weight > best.weight)) {
      best = { weight, reps: Math.min(reps, 30), score };
    }
  }

  if (!best) {
    const lightest = weights[0] ?? 0;
    return {
      weight: lightest,
      reps: Math.max(1, repsAt(oneRepMax, lightest, rir)),
      note: 'lightestTooHeavy',
    };
  }

  const choice: LoadChoice = { weight: best.weight, reps: best.reps };
  if (best.reps > range.max) choice.note = 'notEnoughWeight';
  else if (best.reps < range.min) choice.note = 'bigStep';
  return choice;
}

/** Share of the maximum hold prescribed at a given number of reps in reserve. */
function holdShare(rir: number, floor: number, deload: boolean): number {
  return Math.max(floor, 1 - rir * 0.08) * (deload ? 0.85 : 1);
}

export function overrideKey(exerciseId: string, sessionId: string): OverrideKey {
  return `${exerciseId}|${sessionId}`;
}

/**
 * Calculates the prescription of every exercise in every session.
 *
 * Sessions are walked in order while a capacity estimate is carried forward
 * for each exercise. The estimate starts from the baseline (or from the value
 * carried over from the previous block) and grows week by week at the rate of
 * the training level. When the user edits a session or rates an exercise,
 * the estimate is re-anchored to what actually happened and every later
 * session follows from there.
 */
export function computeLoads(plan: Plan, input: EngineInput, catalog: Catalog): LoadedPlan {
  const level = LEVELS[input.profile.level];
  const capacity: Record<string, Capacity> = {};

  const sessions = plan.sessions.map((session): LoadedSession => {
    const rir = session.rir;
    let warmupPending = true;

    const items = session.items.map((item): LoadedItem => {
      const exercise = catalog.byId.get(item.exerciseId);
      if (!exercise) throw new Error(`Unknown exercise id "${item.exerciseId}"`);
      const id = exercise.id;

      const carried = input.carried[id];
      const anchor = (capacity[id] ??= carried
        ? { value: carried, week: 0, source: 'carry' }
        : { value: baselineCapacity(exercise, input), week: 0, source: 'auto' });

      const growth = exercise.type === 'weighted' ? level.weeklyGain : level.weeklyGainReps;
      const projected = anchor.value * Math.pow(1 + growth, session.week - anchor.week);

      const override = input.overrides[overrideKey(id, session.id)];
      const rating = override?.rating;
      // Rating an exercise "as planned" without typing numbers changes nothing.
      const applied =
        override &&
        (override.weight != null || override.reps != null || (rating && rating !== 'ok'))
          ? override
          : undefined;
      // Reps that were actually left in reserve, according to the rating.
      const actualRir = rir + (rating ? RATING_RIR[rating] : 0);
      const reanchor = (value: number): number => {
        capacity[id] = { value, week: session.week, source: 'edit' };
        return value;
      };

      let prescription: Prescription;

      if (exercise.type === 'weighted') {
        const options = availableWeights(exercise, input);
        // The global scale applies to calculated loads only, never to the user's own numbers.
        const scaled = projected * (anchor.source === 'edit' ? 1 : input.loadScale || 1);
        const effective = session.deload ? scaled * DELOAD_LOAD : scaled;
        const choice = pickLoad(effective, item.reps, rir, options);

        if (applied) {
          const weight = applied.weight ?? choice.weight;
          const reps = applied.reps ?? choice.reps;
          let achieved = e1rm(weight, Math.max(1, reps), actualRir);
          if (session.deload) achieved /= DELOAD_LOAD;
          prescription = {
            type: 'weighted',
            weight,
            reps,
            options,
            capacity: reanchor(achieved),
            edited: true,
          };
        } else {
          prescription = {
            type: 'weighted',
            weight: choice.weight,
            reps: choice.reps,
            options,
            capacity: scaled,
            edited: false,
          };
          if (choice.note) prescription.note = choice.note;
        }

        if (warmupPending && exercise.compound && !session.deload) {
          const working = prescription.weight;
          const ramp: WarmupSet[] = [
            { weight: nearestBelow(working * 0.5, options), reps: 8 },
            { weight: nearestBelow(working * 0.75, options), reps: 3 },
          ];
          prescription.warmup = ramp.filter((set) => set.weight < working);
          warmupPending = false;
        }
      } else if (exercise.type === 'reps') {
        const planned = session.deload
          ? Math.round((projected - 4) * 0.8)
          : Math.round(projected - rir);
        const reps = Math.max(1, Math.min(40, planned));

        if (applied) {
          const done = applied.reps ?? reps;
          const achieved = session.deload ? done / 0.8 + 4 + (actualRir - rir) : done + actualRir;
          prescription = {
            type: 'reps',
            reps: done,
            capacity: reanchor(Math.max(1, achieved)),
            edited: true,
          };
        } else {
          prescription = { type: 'reps', reps, capacity: projected, edited: false };
          if (projected - rir > 25) prescription.note = 'tooManyReps';
        }
      } else {
        const planned = (projected * holdShare(rir, 0.5, session.deload)) / 5;
        const seconds = Math.max(10, Math.round(planned) * 5);

        if (applied) {
          const done = applied.reps ?? seconds;
          prescription = {
            type: 'timed',
            seconds: done,
            capacity: reanchor(done / holdShare(actualRir, 0.4, session.deload)),
            edited: true,
          };
        } else {
          prescription = { type: 'timed', seconds, capacity: projected, edited: false };
        }
      }

      if (rating) prescription.rating = rating;
      return { ...item, prescription };
    });

    return { ...session, items };
  });

  return { ...plan, sessions, capacity };
}

/** The next session after `sessionId` that contains the exercise, with its item. */
export function nextOccurrence(
  sessions: readonly LoadedSession[],
  sessionId: string,
  exerciseId: string,
): { session: LoadedSession; item: LoadedItem } | undefined {
  const from = sessions.findIndex((s) => s.id === sessionId);
  for (const session of sessions.slice(from + 1)) {
    const item = session.items.find((i) => i.exerciseId === exerciseId);
    if (item) return { session, item };
  }
  return undefined;
}

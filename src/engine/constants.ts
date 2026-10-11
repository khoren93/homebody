import type { PatternId } from '@/data/schema';

import type { Goal, Level, RepRange, TemplateId } from './types';

/**
 * Training level.
 * `strength` scales the baseline of weighted exercises, `endurance` the
 * baseline of bodyweight and timed ones. `weeklyGain` is the expected weekly
 * growth of the estimated one-rep max, `weeklyGainReps` of max reps and holds.
 */
export const LEVELS: Record<
  Level,
  { strength: number; endurance: number; weeklyGain: number; weeklyGainReps: number }
> = {
  beginner: { strength: 0.55, endurance: 0.5, weeklyGain: 0.03, weeklyGainReps: 0.06 },
  intermediate: { strength: 1.0, endurance: 1.0, weeklyGain: 0.015, weeklyGainReps: 0.035 },
  advanced: { strength: 1.35, endurance: 1.5, weeklyGain: 0.0075, weeklyGainReps: 0.02 },
};

/**
 * Training goal: rep ranges and rest for compound and isolation exercises,
 * and the weekly number of hard sets per large muscle considered optimal.
 */
export const GOALS: Record<
  Goal,
  {
    compound: RepRange;
    isolation: RepRange;
    restCompound: number;
    restIsolation: number;
    weeklySets: readonly [min: number, max: number];
  }
> = {
  hypertrophy: {
    compound: { target: 8, min: 6, max: 10 },
    isolation: { target: 12, min: 10, max: 15 },
    restCompound: 105,
    restIsolation: 70,
    weeklySets: [10, 20],
  },
  strength: {
    compound: { target: 5, min: 4, max: 6 },
    isolation: { target: 10, min: 8, max: 12 },
    restCompound: 150,
    restIsolation: 90,
    weeklySets: [8, 15],
  },
  endurance: {
    compound: { target: 12, min: 10, max: 15 },
    isolation: { target: 15, min: 12, max: 20 },
    restCompound: 60,
    restIsolation: 45,
    weeklySets: [10, 20],
  },
};

/** Patterns that train the lower body. They use different sex factors. */
export const LOWER_BODY_PATTERNS: ReadonlySet<PatternId> = new Set([
  'squat',
  'hinge',
  'lunge',
  'glute',
  'calves',
]);

/**
 * Session templates: ordered movement-pattern slots, most important first.
 * `variant` rotates which of the best candidates a slot picks, so that the
 * A, B and C days of a split do not repeat the same exercises.
 *
 * F full body · U upper · L lower · P push · Q pull · G legs
 */
export const TEMPLATES: Record<TemplateId, { variant: number; slots: readonly PatternId[] }> = {
  FA: {
    variant: 0,
    slots: [
      'squat',
      'push_horizontal',
      'pull_horizontal',
      'hinge',
      'push_vertical',
      'core',
      'biceps',
      'calves',
    ],
  },
  FB: {
    variant: 1,
    slots: [
      'hinge',
      'push_vertical',
      'pull_vertical',
      'lunge',
      'push_horizontal',
      'core',
      'triceps',
      'delts',
    ],
  },
  FC: {
    variant: 2,
    slots: [
      'lunge',
      'push_horizontal',
      'pull_horizontal',
      'glute',
      'delts',
      'core',
      'biceps',
      'triceps',
    ],
  },
  UA: {
    variant: 0,
    slots: [
      'push_horizontal',
      'pull_horizontal',
      'push_vertical',
      'pull_vertical',
      'delts',
      'biceps',
      'triceps',
      'core',
    ],
  },
  UB: {
    variant: 1,
    slots: [
      'push_vertical',
      'pull_vertical',
      'push_horizontal',
      'pull_horizontal',
      'rear_delts',
      'triceps',
      'biceps',
      'chest_fly',
    ],
  },
  LA: { variant: 0, slots: ['squat', 'hinge', 'lunge', 'glute', 'calves', 'core'] },
  LB: { variant: 1, slots: ['hinge', 'lunge', 'squat', 'glute', 'calves', 'core'] },
  PA: {
    variant: 0,
    slots: [
      'push_horizontal',
      'push_vertical',
      'push_horizontal',
      'delts',
      'triceps',
      'triceps',
      'core',
    ],
  },
  PB: {
    variant: 1,
    slots: ['push_vertical', 'push_horizontal', 'chest_fly', 'delts', 'triceps', 'triceps', 'core'],
  },
  QA: {
    variant: 0,
    slots: [
      'pull_vertical',
      'pull_horizontal',
      'pull_horizontal',
      'rear_delts',
      'biceps',
      'biceps',
      'core',
    ],
  },
  QB: {
    variant: 1,
    slots: [
      'pull_horizontal',
      'pull_vertical',
      'pull_horizontal',
      'rear_delts',
      'biceps',
      'biceps',
      'core',
    ],
  },
  GA: { variant: 0, slots: ['squat', 'hinge', 'lunge', 'glute', 'calves', 'core'] },
  GB: { variant: 1, slots: ['hinge', 'squat', 'lunge', 'glute', 'calves', 'core'] },
};

/** Which templates rotate through the week, by number of training days. */
export const SPLITS: Record<number, readonly TemplateId[]> = {
  1: ['FA'],
  2: ['FA', 'FB'],
  3: ['FA', 'FB', 'FC'],
  4: ['UA', 'LA', 'UB', 'LB'],
  5: ['UA', 'LA', 'FC', 'UB', 'LB'],
  6: ['PA', 'QA', 'GA', 'PB', 'QB', 'GB'],
  7: ['PA', 'QA', 'GA', 'PB', 'QB', 'GB', 'FC'],
};

/** When nothing fits a slot, try this pattern instead. */
export const PATTERN_FALLBACKS: Partial<Record<PatternId, PatternId>> = {
  pull_vertical: 'pull_horizontal',
  chest_fly: 'push_horizontal',
  rear_delts: 'delts',
};

/** Reps in reserve per week of a four-week block; `deload` marks the easy week. */
export const BLOCK_WITH_DELOAD: readonly (number | 'deload')[] = [3, 2, 1, 'deload'];
export const BLOCK_WITHOUT_DELOAD: readonly (number | 'deload')[] = [3, 2, 1, 1];

/** Reps in reserve during a deload week. */
export const DELOAD_RIR = 4;

/** Time model used to fit a session into its budget, in seconds. */
export const TIMING = {
  warmUp: 300,
  /** Extra warm-up sets before the first heavy compound exercise. */
  rampUp: 120,
  /** Changing equipment and setting up between exercises. */
  transition: 60,
  secondsPerRep: 3.5,
  /** Getting into position and unracking, per set. */
  setOverhead: 8,
  /** Fraction of the maximum hold a timed set lasts on average. */
  holdFraction: 0.8,
  /** Minutes per exercise used to cap the number of exercises. */
  minutesPerExercise: 7.5,
  minExercises: 3,
  maxExercises: 8,
} as const;

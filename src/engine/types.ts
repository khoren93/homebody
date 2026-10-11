import type { EquipmentId, Exercise, PatternId } from '@/data/schema';

/** A calendar date as `YYYY-MM-DD`. Compares correctly as a string. */
export type IsoDate = string;

export type Sex = 'male' | 'female';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'hypertrophy' | 'strength' | 'endurance';

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  level: Level;
  goal: Goal;
};

export type Schedule = {
  /** Training weekdays, 0 = Monday ... 6 = Sunday. */
  days: number[];
  /** Time budget per session, in minutes. */
  minutes: number;
  /** First day of the plan. */
  start: IsoDate;
  /** Length of the plan in weeks. */
  weeks: number;
  /** Make every fourth week a deload week. */
  deload: boolean;
};

/** A plate-loaded bar: its own weight, the smallest jump and the heaviest setup. */
export type BarConfig = { bar: number; step: number; max: number };

export type EquipmentConfig = {
  /** Available dumbbell weights, per dumbbell, in kg. */
  db: number[];
  /** Available kettlebell weights in kg. */
  kb: number[];
  bb: BarConfig;
  ez: BarConfig;
};

export type OwnedEquipment = Partial<Record<EquipmentId, boolean>>;

export type BodyWeightEntry = { date: IsoDate; kg: number };

/** How an exercise felt. Shifts the reps in reserve that were actually left. */
export type Rating = 'easy' | 'ok' | 'hard' | 'fail';

/**
 * What the user changed for one exercise in one session.
 * `reps` holds seconds for timed exercises.
 */
export type Override = { weight?: number; reps?: number; rating?: Rating };

/** Moves every session planned on or after `at` forward by `days`. */
export type Shift = { at: IsoDate; days: number };

export type TemplateId =
  'FA' | 'FB' | 'FC' | 'UA' | 'UB' | 'LA' | 'LB' | 'PA' | 'PB' | 'QA' | 'QB' | 'GA' | 'GB';

/** Identifies a slot of a template: `<template>|<index>`. Swaps are stored per slot. */
export type SlotKey = `${TemplateId}|${number}`;

/** Identifies an exercise in a session: `<exerciseId>|<sessionId>`. */
export type OverrideKey = `${string}|${IsoDate}`;

/** Everything the engine needs to know about the user. */
export type EngineInput = {
  profile: Profile;
  schedule: Schedule;
  /** Multiplier applied to every automatically calculated weight (1 = 100 %). */
  loadScale: number;
  equipment: OwnedEquipment;
  equipmentConfig: EquipmentConfig;
  bodyWeights: BodyWeightEntry[];
  /** Exercise chosen by the user for a template slot. */
  swaps: Partial<Record<SlotKey, string>>;
  overrides: Partial<Record<OverrideKey, Override>>;
  /** Exercises that must never appear in a plan. */
  excluded: Partial<Record<string, true>>;
  /** Capacities reached in the previous block, by exercise id. */
  carried: Partial<Record<string, number>>;
  shifts: Shift[];
};

export type Catalog = {
  /** All exercises in dataset order. */
  readonly list: readonly Exercise[];
  readonly byId: ReadonlyMap<string, Exercise>;
};

export type RepRange = { target: number; min: number; max: number };

/** An exercise assigned to a template slot. */
export type SlotPick = {
  key: SlotKey;
  /** The pattern that was filled; differs from the slot's own when a fallback was used. */
  pattern: PatternId;
  exerciseId: string;
};

export type TemplatePlan = {
  items: (SlotPick & { sets: number })[];
  /** Estimated duration in minutes, warm-up included. */
  minutes: number;
};

export type PlanItem = SlotPick & {
  sets: number;
  /** Target, minimum and maximum repetitions for the goal. */
  reps: RepRange;
  /** Rest between sets in seconds. */
  rest: number;
};

export type Session = {
  /** Stable id: the date the session was originally planned for. */
  id: IsoDate;
  /** The date it is currently scheduled for (differs from `id` after a shift). */
  date: IsoDate;
  /** Days the session was moved forward. */
  shift: number;
  /** Week of the plan, starting at 0. */
  week: number;
  template: TemplateId;
  deload: boolean;
  /** Reps in reserve prescribed for this week. */
  rir: number;
  /** Estimated duration in minutes. */
  minutes: number;
  items: PlanItem[];
};

export type Plan = {
  sessions: Session[];
  /** Templates in the order they rotate through the training days. */
  split: readonly TemplateId[];
  templates: Partial<Record<TemplateId, TemplatePlan>>;
};

/** Why a prescription deviates from the ideal rep range. Translated by the UI. */
export type NoteKey =
  /** Even the lightest available weight is too heavy for the rep range. */
  | 'lightestTooHeavy'
  /** The heaviest available weight is too light: reps exceed the range. */
  | 'notEnoughWeight'
  /** The step to the next weight is large: reps fall below the range for now. */
  | 'bigStep'
  /** A bodyweight exercise became too easy: more than 25 reps per set. */
  | 'tooManyReps';

export type WarmupSet = { weight: number; reps: number };

type PrescriptionBase = {
  /**
   * The estimated maximum this prescription is based on: one-rep max in kg
   * for weighted exercises, max reps or max seconds for the others.
   */
  capacity: number;
  /** True when the numbers come from the user (an edit or a non-neutral rating). */
  edited: boolean;
  rating?: Rating;
  note?: NoteKey;
};

export type WeightedPrescription = PrescriptionBase & {
  type: 'weighted';
  /** Load in kg; per hand for `pair` exercises. */
  weight: number;
  reps: number;
  /** Every weight the user could choose instead. */
  options: number[];
  /** Ramp-up sets before the first heavy compound exercise of a session. */
  warmup?: WarmupSet[];
};

export type RepsPrescription = PrescriptionBase & { type: 'reps'; reps: number };

export type TimedPrescription = PrescriptionBase & { type: 'timed'; seconds: number };

export type Prescription = WeightedPrescription | RepsPrescription | TimedPrescription;

export type LoadedItem = PlanItem & { prescription: Prescription };

export type LoadedSession = Omit<Session, 'items'> & { items: LoadedItem[] };

/** Where the current estimate of an exercise comes from. */
export type CapacitySource = 'auto' | 'carry' | 'edit';

/** The running estimate for an exercise: its value and the week it was set in. */
export type Capacity = { value: number; week: number; source: CapacitySource };

export type LoadedPlan = Omit<Plan, 'sessions'> & {
  sessions: LoadedSession[];
  /** The latest estimate per exercise id after walking the whole plan. */
  capacity: Record<string, Capacity>;
};

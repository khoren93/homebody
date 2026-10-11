/**
 * Schemas of everything Homebody persists. Stored data and imported backups
 * are validated against them before they reach the store.
 */
import { z } from 'zod';

import { EquipmentIdSchema } from '@/data/schema';
import { isIsoDate } from '@/engine/dates';

/** Version of the state document. Bump it together with a migration. */
export const STATE_VERSION = 1;

const IsoDateSchema = z.string().refine(isIsoDate, 'Expected a date as YYYY-MM-DD');
const positive = z.number().positive().finite();

export const ProfileSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: z.number().min(10).max(110),
  heightCm: z.number().min(100).max(250),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  goal: z.enum(['hypertrophy', 'strength', 'endurance']),
});

export const ScheduleSchema = z.object({
  days: z.array(z.int().min(0).max(6)).max(7),
  minutes: z.number().min(10).max(240),
  start: IsoDateSchema,
  weeks: z.int().min(1).max(52),
  deload: z.boolean(),
});

const BarConfigSchema = z.object({
  bar: z.number().min(0).finite(),
  step: z.number().min(0).finite(),
  max: z.number().min(0).finite(),
});

export const EquipmentConfigSchema = z.object({
  db: z.array(positive),
  kb: z.array(positive),
  bb: BarConfigSchema,
  ez: BarConfigSchema,
});

export const RatingSchema = z.enum(['easy', 'ok', 'hard', 'fail']);

export const OverrideSchema = z.object({
  weight: positive.optional(),
  reps: positive.optional(),
  rating: RatingSchema.optional(),
});

export const BodyWeightSchema = z.object({ date: IsoDateSchema, kg: positive });

/** Girth measurements in centimetres. Every field is optional. */
export const GIRTHS = ['neck', 'chest', 'waist', 'hips', 'arm', 'thigh'] as const;

export const MeasurementSchema = z.object({
  date: IsoDateSchema,
  neck: positive.optional(),
  chest: positive.optional(),
  waist: positive.optional(),
  hips: positive.optional(),
  arm: positive.optional(),
  thigh: positive.optional(),
});

const FlagsSchema = z.record(z.string(), z.literal(true));

export const AppStateSchema = z.object({
  version: z.literal(STATE_VERSION),
  /** False while the app still shows the sample profile. */
  setupDone: z.boolean(),
  profile: ProfileSchema,
  schedule: ScheduleSchema,
  loadScale: z.number().min(0.1).max(3),
  equipment: z.partialRecord(EquipmentIdSchema, z.boolean()),
  equipmentConfig: EquipmentConfigSchema,
  bodyWeights: z.array(BodyWeightSchema),
  measurements: z.array(MeasurementSchema),
  /** Exercise chosen for a template slot, by slot key (`FA|0`). */
  swaps: z.record(z.string(), z.string()),
  /** Edits and ratings, by `<exerciseId>|<sessionId>`. */
  overrides: z.record(z.string(), OverrideSchema),
  excluded: FlagsSchema,
  /** Capacities carried over from the previous block, by exercise id. */
  carried: z.record(z.string(), positive),
  shifts: z.array(z.object({ at: IsoDateSchema, days: z.int() })),
  /** Finished sessions, by session id. */
  done: FlagsSchema,
  /** Sessions the user decided to skip, by session id. */
  skipped: FlagsSchema,
  /** Number of the current training block, starting at 1. */
  block: z.int().min(1),
});

export const HistoryEntrySchema = z.object({
  sessionId: IsoDateSchema,
  exerciseId: z.string().min(1),
  date: IsoDateSchema,
  weight: positive.nullable(),
  reps: positive,
  sets: z.int().positive(),
  capacity: positive,
  rating: RatingSchema.nullable(),
});

/** Ticked sets of one session: exercise id → one flag per set. */
export const SetLogSchema = z.object({
  sessionId: IsoDateSchema,
  sets: z.record(z.string(), z.array(z.boolean())),
});

export const POSES = ['front', 'side', 'back'] as const;

export const PhotoSchema = z.object({
  id: z.string().min(1),
  date: IsoDateSchema,
  pose: z.enum(POSES),
  /** The compressed image as a data URL. */
  image: z.string().startsWith('data:image/'),
  createdAt: z.number(),
});

export type AppState = z.infer<typeof AppStateSchema>;
export type Measurement = z.infer<typeof MeasurementSchema>;
export type Girth = (typeof GIRTHS)[number];
export type SetLog = z.infer<typeof SetLogSchema>;
export type Pose = (typeof POSES)[number];
export type Photo = z.infer<typeof PhotoSchema>;

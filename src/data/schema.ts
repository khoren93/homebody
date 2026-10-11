/**
 * Schema of the exercise dataset (`data/exercises.json`).
 *
 * This file is the single source of truth for the dataset format: the Zod
 * schemas validate the data at build time and in CI, and the exported types
 * are inferred from them. It imports nothing but Zod so that plain Node
 * scripts can use it as well.
 */
import { z } from 'zod';

/** Muscle groups shown on the body map. */
export const MUSCLE_IDS = [
  'chest',
  'shoulders',
  'traps',
  'neck',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'lats',
  'middle_back',
  'lower_back',
  'glutes',
  'abductors',
  'adductors',
  'quads',
  'hamstrings',
  'calves',
] as const;

/**
 * Home equipment the user can own.
 *
 * db dumbbells · bench · bb barbell · rack · ez EZ bar · kb kettlebell ·
 * bar pull-up bar · dip dip bars · bands · box box/chair/step ·
 * ball exercise ball · medball medicine ball
 */
export const EQUIPMENT_IDS = [
  'db',
  'bench',
  'bb',
  'rack',
  'ez',
  'kb',
  'bar',
  'dip',
  'bands',
  'box',
  'ball',
  'medball',
] as const;

/**
 * Movement patterns. Session templates are ordered lists of these slots and
 * every slot is filled with an exercise that has the pattern. The last five
 * are not used by any template: their exercises only appear in the library.
 */
export const PATTERN_IDS = [
  'squat',
  'hinge',
  'lunge',
  'glute',
  'push_horizontal',
  'push_vertical',
  'pull_horizontal',
  'pull_vertical',
  'chest_fly',
  'delts',
  'rear_delts',
  'biceps',
  'triceps',
  'core',
  'calves',
  'traps',
  'forearms',
  'adductors',
  'abductors',
  'neck',
] as const;

/** How an exercise is dosed: by load, by repetitions or by time under tension. */
export const EXERCISE_TYPES = ['weighted', 'reps', 'timed'] as const;

/**
 * How the load of a weighted exercise is assembled:
 * `bar` a barbell, `ez` an EZ bar, `pair` one implement in each hand,
 * `single` one implement in total.
 */
export const LOAD_MODES = ['bar', 'ez', 'pair', 'single'] as const;

/** Implements that can stand in for each other in `pair` and `single` exercises. */
export const HAND_IMPLEMENTS = ['db', 'kb'] as const;

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'expert'] as const;

export const MuscleIdSchema = z.enum(MUSCLE_IDS);
export const EquipmentIdSchema = z.enum(EQUIPMENT_IDS);
export const PatternIdSchema = z.enum(PATTERN_IDS);
export const ExerciseTypeSchema = z.enum(EXERCISE_TYPES);
export const LoadModeSchema = z.enum(LOAD_MODES);
export const HandImplementSchema = z.enum(HAND_IMPLEMENTS);
export const DifficultyLevelSchema = z.enum(DIFFICULTY_LEVELS);

const text = z.string().trim().min(1);

/** A display name in every supported locale. */
export const LocalizedNameSchema = z.strictObject({
  en: text,
  ru: text,
});

export const ExerciseSchema = z
  .strictObject({
    /**
     * Stable identifier. It is also the id of the record in the upstream
     * dataset and the name of the photo folder under `public/exercises/`.
     */
    id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Use letters, digits, "_" and "-" only'),

    name: LocalizedNameSchema,

    /** Template slots this exercise can fill. */
    patterns: z.array(PatternIdSchema).min(1),

    /**
     * Equipment alternatives. The exercise is available when every item of at
     * least one inner list is owned; an empty inner list means "no equipment".
     */
    equipment: z.array(z.array(EquipmentIdSchema)).min(1),

    type: ExerciseTypeSchema,

    /** Required for weighted exercises, absent otherwise. */
    loadMode: LoadModeSchema.optional(),

    /**
     * Expected performance of an intermediate male lifter:
     * - weighted: estimated one-rep max divided by body weight
     *   (per hand for `pair` exercises),
     * - reps: maximum repetitions in one set,
     * - timed: maximum hold in seconds.
     */
    baseline: z.number().positive(),

    /** Fixed rep range that overrides the range of the training goal. */
    repRange: z
      .strictObject({
        target: z.int().positive(),
        min: z.int().positive(),
        max: z.int().positive(),
      })
      .refine((r) => r.min <= r.target && r.target <= r.max, 'Expected min <= target <= max')
      .optional(),

    /** Performed one side at a time; sets and reps are per side. */
    unilateral: z.boolean(),

    /** Multi-joint movement (as opposed to isolation). */
    compound: z.boolean(),

    primary: z.array(MuscleIdSchema).min(1),
    secondary: z.array(MuscleIdSchema),

    level: DifficultyLevelSchema,

    /** Names to use when the exercise is done with a specific implement. */
    implementNames: z.partialRecord(HandImplementSchema, LocalizedNameSchema).optional(),

    /** The implement shown in the photos, when the exercise accepts several. */
    photoImplement: HandImplementSchema.optional(),

    /**
     * Offered as a replacement only. The plan builder never picks such an
     * exercise on its own while a regular one fits the slot.
     */
    swapOnly: z.literal(true).optional(),

    /** Step-by-step technique. English is required, other locales are optional. */
    instructions: z.strictObject({
      en: z.array(text).min(1),
      ru: z.array(text).min(1).optional(),
    }),
  })
  .superRefine((exercise, ctx) => {
    if (exercise.type === 'weighted' && !exercise.loadMode) {
      ctx.addIssue({
        code: 'custom',
        path: ['loadMode'],
        message: 'Weighted exercises need a loadMode',
      });
    }
    if (exercise.type !== 'weighted' && exercise.loadMode) {
      ctx.addIssue({
        code: 'custom',
        path: ['loadMode'],
        message: 'Only weighted exercises may have a loadMode',
      });
    }
    const overlap = exercise.secondary.filter((m) => exercise.primary.includes(m));
    if (overlap.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['secondary'],
        message: `Listed as both primary and secondary: ${overlap.join(', ')}`,
      });
    }
  });

export const ExerciseListSchema = z.array(ExerciseSchema).superRefine((list, ctx) => {
  const seen = new Set<string>();
  list.forEach((exercise, index) => {
    if (seen.has(exercise.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: `Duplicate exercise id "${exercise.id}"`,
      });
    }
    seen.add(exercise.id);
  });
});

export type MuscleId = z.infer<typeof MuscleIdSchema>;
export type EquipmentId = z.infer<typeof EquipmentIdSchema>;
export type PatternId = z.infer<typeof PatternIdSchema>;
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>;
export type LoadMode = z.infer<typeof LoadModeSchema>;
export type HandImplement = z.infer<typeof HandImplementSchema>;
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;
export type LocalizedName = z.infer<typeof LocalizedNameSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;

/** Number of photo frames per exercise: start and end position. */
export const PHOTO_FRAMES = 2;

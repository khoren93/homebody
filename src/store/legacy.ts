/**
 * Converts a backup of the single-file prototype ("Home Trainer") into
 * Homebody data, so people who used it can bring their history along.
 *
 * The prototype stored abbreviated keys (`d`, `kg`, `w`, `r`, ...) and kept
 * everything in one object. Entries that cannot be converted are dropped
 * rather than failing the whole import.
 */
import { EQUIPMENT_IDS } from '@/data/schema';
import { type HistoryEntry, isIsoDate, parseWeightList } from '@/engine';

import { createSampleState } from './defaults';
import type { FullData } from './persistence';
import {
  type AppState,
  AppStateSchema,
  GIRTHS,
  HistoryEntrySchema,
  type Photo,
  PhotoSchema,
  POSES,
} from './schema';
import type { SetLogs } from './types';

type Loose = Record<string, unknown>;

const LEVELS = { beg: 'beginner', int: 'intermediate', adv: 'advanced' } as const;
const GOALS = { hyp: 'hypertrophy', str: 'strength', end: 'endurance' } as const;
const RATINGS = ['easy', 'ok', 'hard', 'fail'] as const;

const isObject = (value: unknown): value is Loose =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const record = (value: unknown): Loose => (isObject(value) ? value : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const positive = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
const date = (value: unknown): string | undefined =>
  typeof value === 'string' && isIsoDate(value) ? value : undefined;
const pick = <T extends string>(options: readonly T[], value: unknown): T | undefined =>
  options.find((option) => option === value);

/** Keys whose value is truthy, as a set of flags. */
function flags(value: unknown, isKey: (key: string) => boolean = () => true): Record<string, true> {
  return Object.fromEntries(
    Object.entries(record(value))
      .filter(([key, flag]) => !!flag && isKey(key))
      .map(([key]) => [key, true as const]),
  );
}

function bar(value: unknown, fallback: { bar: number; step: number; max: number }) {
  const source = record(value);
  return {
    bar: positive(source.bar) ?? fallback.bar,
    step: positive(source.step) ?? fallback.step,
    max: positive(source.max) ?? fallback.max,
  };
}

/** True when the parsed JSON looks like a backup of the prototype. */
export function isPrototypeBackup(raw: unknown): boolean {
  if (!isObject(raw)) return false;
  const state = raw.state;
  return (
    raw.app === 'home-trainer' &&
    isObject(state) &&
    isObject(state.profile) &&
    isObject(state.sched)
  );
}

/** Converts a prototype backup. `today` is used for defaults of missing fields. */
export function convertPrototypeBackup(raw: unknown, today: string): FullData {
  const backup = record(raw);
  const old = record(backup.state);
  const profile = record(old.profile);
  const schedule = record(old.sched);
  const config = record(old.eqCfg);
  const base = createSampleState(today);

  const weights = (text: unknown, fallback: number[]) => {
    const parsed = typeof text === 'string' ? parseWeightList(text) : [];
    return parsed.length > 0 ? parsed : fallback;
  };

  const state: AppState = {
    ...base,
    setupDone: old.setup !== false,
    profile: {
      sex: profile.sex === 'f' ? 'female' : 'male',
      age: positive(profile.age) ?? base.profile.age,
      heightCm: positive(profile.height) ?? base.profile.heightCm,
      level: LEVELS[profile.level as keyof typeof LEVELS] ?? base.profile.level,
      goal: GOALS[schedule.goal as keyof typeof GOALS] ?? base.profile.goal,
    },
    schedule: {
      days: list(schedule.days).filter(
        (day): day is number =>
          typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6,
      ),
      minutes: positive(schedule.min) ?? base.schedule.minutes,
      start: date(schedule.start) ?? base.schedule.start,
      weeks: positive(schedule.weeks) ?? base.schedule.weeks,
      deload: schedule.deload !== false,
    },
    loadScale: positive(schedule.scale) ?? 1,
    equipment: Object.fromEntries(
      EQUIPMENT_IDS.filter((id) => id in record(old.eq)).map((id) => [id, !!record(old.eq)[id]]),
    ),
    equipmentConfig: {
      db: weights(config.db, base.equipmentConfig.db),
      kb: weights(config.kb, base.equipmentConfig.kb),
      bb: bar(config.bb, base.equipmentConfig.bb),
      ez: bar(config.ez, base.equipmentConfig.ez),
    },
    bodyWeights: list(old.weights).flatMap((entry) => {
      const item = record(entry);
      const [d, kg] = [date(item.d), positive(item.kg)];
      return d && kg ? [{ date: d, kg }] : [];
    }),
    measurements: list(old.meas).flatMap((entry) => {
      const item = record(entry);
      const d = date(item.d);
      if (!d) return [];
      const girths = Object.fromEntries(
        GIRTHS.flatMap((girth) => {
          const value = positive(item[girth]);
          return value ? [[girth, value]] : [];
        }),
      );
      return Object.keys(girths).length > 0 ? [{ date: d, ...girths }] : [];
    }),
    swaps: Object.fromEntries(
      Object.entries(record(old.swaps)).filter(
        (pair): pair is [string, string] => typeof pair[1] === 'string',
      ),
    ),
    overrides: Object.fromEntries(
      Object.entries(record(old.ov)).flatMap(([key, value]) => {
        const item = record(value);
        const override = {
          ...(positive(item.w) && { weight: positive(item.w) }),
          ...(positive(item.r) && { reps: positive(item.r) }),
          ...(pick(RATINGS, item.rate) && { rating: pick(RATINGS, item.rate) }),
        };
        return Object.keys(override).length > 0 ? [[key, override]] : [];
      }),
    ),
    excluded: flags(old.ban),
    carried: Object.fromEntries(
      Object.entries(record(old.base)).flatMap(([id, value]) => {
        const capacity = positive(value);
        return capacity ? [[id, capacity]] : [];
      }),
    ),
    shifts: list(old.shifts).flatMap((entry) => {
      const item = record(entry);
      const at = date(item.at);
      return at && typeof item.days === 'number' && Number.isInteger(item.days)
        ? [{ at, days: item.days }]
        : [];
    }),
    done: flags(old.done, isIsoDate),
    skipped: flags(old.skip, isIsoDate),
    block: positive(old.block) ?? 1,
  };

  const history: HistoryEntry[] = Object.entries(record(old.hist)).flatMap(
    ([exerciseId, entries]) =>
      list(entries).flatMap((entry) => {
        const item = record(entry);
        const parsed = HistoryEntrySchema.safeParse({
          sessionId: item.sid,
          exerciseId,
          date: item.d,
          weight: positive(item.w) ?? null,
          reps: item.r,
          sets: item.n,
          capacity: item.E,
          rating: pick(RATINGS, item.rate) ?? null,
        });
        return parsed.success ? [parsed.data] : [];
      }),
  );

  const setLogs: SetLogs = Object.fromEntries(
    Object.entries(record(old.log))
      .filter(([sessionId]) => isIsoDate(sessionId))
      .map(([sessionId, sets]) => [
        sessionId,
        Object.fromEntries(
          Object.entries(record(sets)).map(([exerciseId, ticks]) => [
            exerciseId,
            list(ticks).map(Boolean),
          ]),
        ),
      ]),
  );

  const photos: Photo[] = list(backup.photos).flatMap((entry, index) => {
    const item = record(entry);
    const parsed = PhotoSchema.safeParse({
      id: typeof item.id === 'string' && item.id ? item.id : `imported-${index}`,
      date: item.d,
      pose: pick(POSES, item.pose) ?? 'front',
      image: item.img,
      createdAt: typeof item.ts === 'number' ? item.ts : index,
    });
    return parsed.success ? [parsed.data] : [];
  });

  return { state: AppStateSchema.parse(state), history, setLogs, photos };
}

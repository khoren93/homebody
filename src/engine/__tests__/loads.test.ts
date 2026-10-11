import { describe, expect, it } from 'vitest';

import { requireExercise } from '@/data';

import { ageFactor, baselineCapacity, bodyWeightAtStart } from '../baseline';
import {
  computeLoads,
  e1rm,
  nearestBelow,
  nextOccurrence,
  overrideKey,
  pickLoad,
  repsAt,
} from '../loads';
import { buildPlan } from '../plan';
import type { EngineInput, LoadedItem, LoadedPlan, Override, Prescription } from '../types';
import loadsGoldenJson from './fixtures/loads.golden.json?raw';
import { ALL_EQUIPMENT, catalog, makeInput, round6, scenarios } from './helpers';

type GoldenLoads = {
  capacity: Record<string, [value: number, week: number, source: string]>;
  sessions: [id: string, items: unknown[]][];
};
const golden = JSON.parse(loadsGoldenJson) as Record<string, GoldenLoads>;

/** Encodes prescriptions in the compact layout of loads.golden.json. */
function encode(loaded: LoadedPlan): GoldenLoads {
  const encodeItem = (item: LoadedItem): unknown[] => {
    const p = item.prescription;
    const value =
      p.type === 'weighted'
        ? [p.weight, p.reps, p.options.length]
        : p.type === 'reps'
          ? p.reps
          : p.seconds;
    const extras: Record<string, unknown> = {};
    if (p.edited) extras.edited = true;
    if (p.type === 'weighted' && p.warmup) extras.warmup = p.warmup.map((s) => [s.weight, s.reps]);
    if (p.note) extras.note = p.note;
    if (p.rating) extras.rating = p.rating;
    const row: unknown[] = [item.exerciseId, round6(p.capacity), value];
    if (Object.keys(extras).length > 0) row.push(extras);
    return row;
  };
  return {
    capacity: Object.fromEntries(
      Object.entries(loaded.capacity).map(([id, c]) => [id, [round6(c.value), c.week, c.source]]),
    ),
    sessions: loaded.sessions.map((s) => [s.id, s.items.map(encodeItem)]),
  };
}

function load(input: EngineInput): LoadedPlan {
  return computeLoads(buildPlan(input, catalog), input, catalog);
}

/** Prescription of an exercise in the n-th session that contains it. */
function rx(loaded: LoadedPlan, exerciseId: string, occurrence = 0): Prescription {
  const items = loaded.sessions.flatMap((s) => s.items.filter((i) => i.exerciseId === exerciseId));
  const item = items[occurrence];
  if (!item) throw new Error(`${exerciseId} #${occurrence} is not in the plan`);
  return item.prescription;
}

/** Prescription of an exercise the first time it appears in a given plan week. */
function rxInWeek(loaded: LoadedPlan, exerciseId: string, week: number): Prescription {
  const item = loaded.sessions
    .filter((s) => s.week === week)
    .flatMap((s) => s.items)
    .find((i) => i.exerciseId === exerciseId);
  if (!item) throw new Error(`${exerciseId} is not planned in week ${week}`);
  return item.prescription;
}

function withOverride(exerciseId: string, sessionId: string, override: Override, patch = {}) {
  return makeInput({ overrides: { [overrideKey(exerciseId, sessionId)]: override }, ...patch });
}

describe('computeLoads: parity with the prototype', () => {
  it('has golden loads for every scenario', () => {
    expect(Object.keys(golden).sort()).toEqual(scenarios.map((s) => s.name).sort());
  });

  it.each(scenarios)('$name', ({ name, input }) => {
    expect(encode(load(input))).toEqual(golden[name]);
  });
});

describe('e1rm', () => {
  it('is the Epley formula with reps in reserve counted as reps', () => {
    expect(e1rm(20, 10, 2)).toBeCloseTo(28);
    expect(e1rm(100, 0, 0)).toBe(100);
    expect(e1rm(60, 5, 0)).toBeCloseTo(70);
  });

  it('is inverted by repsAt', () => {
    expect(repsAt(28, 20, 2)).toBe(10);
    expect(repsAt(e1rm(42.5, 7, 3), 42.5, 3)).toBe(7);
  });
});

describe('pickLoad', () => {
  const range = { target: 8, min: 6, max: 10 };
  const dumbbells = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

  it('picks the weight whose reps are closest to the target', () => {
    // 1RM 30.4 at RIR 3: 22 kg gives 8 reps, 24 kg gives 5.
    expect(pickLoad(30.4, range, 3, dumbbells)).toEqual({ weight: 22, reps: 8 });
  });

  it('prefers the heavier weight when two are equally close', () => {
    // 1RM 40 at RIR 0: 30 kg gives 10 reps and 34 kg gives 5; make 7 and 9 tie instead.
    const choice = pickLoad(40, range, 0, [30.77, 32.43]);
    expect([repsAt(40, 30.77, 0), repsAt(40, 32.43, 0)]).toEqual([9, 7]);
    expect(choice.weight).toBe(32.43);
  });

  it('flags a weight jump that pushes reps below the range', () => {
    expect(pickLoad(30, range, 2, [10, 24])).toEqual({ weight: 24, reps: 6 });
    expect(pickLoad(30, range, 3, [8, 24])).toMatchObject({ weight: 24, note: 'bigStep' });
  });

  it('flags when the heaviest weight is too light', () => {
    expect(pickLoad(60, range, 3, dumbbells)).toMatchObject({
      weight: 24,
      note: 'notEnoughWeight',
    });
  });

  it('caps the reps it prescribes at 30', () => {
    expect(pickLoad(100, range, 0, [10]).reps).toBe(30);
  });

  it('falls back to the lightest weight when everything is too heavy', () => {
    expect(pickLoad(10, range, 3, [12, 20, 30])).toEqual({
      weight: 12,
      reps: 1,
      note: 'lightestTooHeavy',
    });
  });

  it('penalises going under the range more than going over it', () => {
    // 4 reps (2 under) scores 14, 13 reps (3 over) scores 13.
    const light = 40 / (1 + 13 / 30);
    const heavy = 40 / (1 + 4 / 30);
    expect(pickLoad(40, range, 0, [light, heavy]).reps).toBe(13);
  });
});

describe('nearestBelow', () => {
  it('returns the heaviest weight not above the target, or the lightest', () => {
    expect(nearestBelow(11, [2, 10, 12])).toBe(10);
    expect(nearestBelow(12, [2, 10, 12])).toBe(12);
    expect(nearestBelow(1, [2, 10, 12])).toBe(2);
    expect(nearestBelow(5, [])).toBe(0);
  });
});

describe('baseline', () => {
  const squat = requireExercise('Goblet_Squat'); // ratio 0.45, lower body
  const press = requireExercise('Dumbbell_Bench_Press'); // ratio 0.38, upper body
  const pushup = requireExercise('Pushups'); // 22 reps, upper body
  const plank = requireExercise('Plank'); // 75 s

  const input = (profile = {}, bodyWeights = [{ date: '2026-10-11', kg: 80 }]) =>
    makeInput({ profile: { ...makeInput().profile, ...profile }, bodyWeights });

  it('is ratio × body weight for an intermediate man', () => {
    expect(baselineCapacity(squat, input())).toBeCloseTo(0.45 * 80);
    expect(baselineCapacity(pushup, input())).toBe(22);
    expect(baselineCapacity(plank, input())).toBe(75);
  });

  it('scales with the training level', () => {
    expect(baselineCapacity(squat, input({ level: 'beginner' }))).toBeCloseTo(0.45 * 80 * 0.55);
    expect(baselineCapacity(squat, input({ level: 'advanced' }))).toBeCloseTo(0.45 * 80 * 1.35);
    expect(baselineCapacity(pushup, input({ level: 'beginner' }))).toBe(11);
    expect(baselineCapacity(pushup, input({ level: 'advanced' }))).toBe(33);
  });

  it('applies separate sex factors to the upper and lower body', () => {
    const woman = input({ sex: 'female' });
    expect(baselineCapacity(squat, woman)).toBeCloseTo(0.45 * 80 * 0.72);
    expect(baselineCapacity(press, woman)).toBeCloseTo(0.38 * 80 * 0.55);
    expect(baselineCapacity(pushup, woman)).toBeCloseTo(22 * 0.6);
    expect(baselineCapacity(requireExercise('Bodyweight_Squat'), woman)).toBeCloseTo(30 * 0.9);
  });

  it('declines with age after 40, down to 70 %', () => {
    expect(ageFactor(25)).toBe(1);
    expect(ageFactor(40)).toBe(1);
    expect(ageFactor(50)).toBeCloseTo(0.92);
    expect(ageFactor(90)).toBe(0.7);
    expect(baselineCapacity(squat, input({ age: 50 }))).toBeCloseTo(0.45 * 80 * 0.92);
  });

  it('never drops below 2 reps or 15 seconds', () => {
    const weak = input({ sex: 'female', age: 90, level: 'beginner' });
    expect(baselineCapacity(requireExercise('Pullups'), weak)).toBe(2);
    expect(baselineCapacity(requireExercise('Isometric_Neck_Exercise_-_Sides'), weak)).toBe(15);
  });

  it('uses the body weight logged at the plan start', () => {
    const start = makeInput().schedule; // starts 2026-10-12
    const at = (bodyWeights: EngineInput['bodyWeights']) =>
      bodyWeightAtStart({ schedule: start, bodyWeights });

    expect(at([])).toBe(75);
    expect(at([{ date: '2026-10-20', kg: 90 }])).toBe(90);
    expect(
      at([
        { date: '2026-10-20', kg: 90 },
        { date: '2026-09-01', kg: 84 },
        { date: '2026-10-12', kg: 82 },
      ]),
    ).toBe(82);
  });
});

describe('computeLoads: progression', () => {
  it('starts every exercise from its baseline', () => {
    const loaded = load(makeInput());
    expect(rx(loaded, 'Goblet_Squat').capacity).toBeCloseTo(36);
    expect(loaded.capacity.Goblet_Squat).toEqual({ value: 36, week: 0, source: 'auto' });
  });

  it('grows the estimate every week at the rate of the level', () => {
    const loaded = load(makeInput());
    const weekly = [0, 1, 2, 3].map((n) => rx(loaded, 'Goblet_Squat', n).capacity);
    weekly.forEach((value, week) => expect(value).toBeCloseTo(36 * 1.015 ** week));

    const beginner = load(makeInput({ profile: { ...makeInput().profile, level: 'beginner' } }));
    const first = rx(beginner, 'Goblet_Squat').capacity;
    expect(rx(beginner, 'Goblet_Squat', 1).capacity).toBeCloseTo(first * 1.03);
  });

  it('grows bodyweight and timed exercises faster than weighted ones', () => {
    const loaded = load(makeInput());
    expect(rxInWeek(loaded, 'Plank', 1).capacity).toBeCloseTo(75 * 1.035);
    expect(rxInWeek(loaded, 'Plank', 2).capacity).toBeCloseTo(75 * 1.035 ** 2);
  });

  it('prescribes fewer reps in reserve as the block advances', () => {
    const loaded = load(makeInput({ equipment: {} }));
    const pushups = [0, 1, 2].map((week) => rxInWeek(loaded, 'Pushups', week));
    // 22 max reps: 22 − 3, then 22 × 1.035 − 2, then 22 × 1.035² − 1.
    expect(pushups.map((p) => p.type === 'reps' && p.reps)).toEqual([19, 21, 23]);
  });

  it('lightens the deload week', () => {
    const loaded = load(makeInput());
    const deloadSession = loaded.sessions.find((s) => s.deload && s.template === 'FA')!;
    const squat = deloadSession.items[0]!.prescription;
    const plank = deloadSession.items.find((i) => i.exerciseId === 'Plank')!.prescription;

    // 36 × 1.015³ × 0.9 ≈ 33.9 kg at RIR 4 → 24 kg × 8 (week 3 was 24 kg × 15). No warm-up sets.
    expect(squat).toMatchObject({ type: 'weighted', weight: 24, reps: 8 });
    expect(squat.capacity).toBeCloseTo(36 * 1.015 ** 3);
    expect(squat.type === 'weighted' && squat.warmup).toBeUndefined();
    // 75 × 1.035³ × (1 − 4 × 0.08) × 0.85 ≈ 48 → rounded to 5 s.
    expect(plank).toMatchObject({ type: 'timed', seconds: 50 });
  });

  it('prescribes deload reps for bodyweight exercises from 80 % of the capacity', () => {
    const loaded = load(makeInput({ equipment: {} }));
    const session = loaded.sessions.find((s) => s.deload)!;
    const item = session.items.find((i) => i.prescription.type === 'reps')!;
    const p = item.prescription;
    expect(p.type === 'reps' && p.reps).toBe(Math.round((p.capacity - 4) * 0.8));
  });

  it('rounds holds to 5 seconds and never goes below 10', () => {
    const loaded = load(makeInput());
    const plank = rx(loaded, 'Plank');
    expect(plank).toMatchObject({ type: 'timed', seconds: 55 }); // 75 × (1 − 3 × 0.08) = 57
    const weak = load(
      makeInput({
        profile: { sex: 'female', age: 90, heightCm: 160, level: 'beginner', goal: 'hypertrophy' },
      }),
    );
    const hold = weak.sessions.flatMap((s) => s.items).find((i) => i.prescription.type === 'timed');
    expect(hold?.prescription).toMatchObject({ seconds: 10 });
  });

  it('caps bodyweight reps at 40 and suggests a harder variation above 25', () => {
    const loaded = load(
      makeInput({ equipment: {}, carried: { Bodyweight_Squat: 60, Pushups: 20 } }),
    );
    expect(rx(loaded, 'Bodyweight_Squat')).toMatchObject({ reps: 40, note: 'tooManyReps' });
    expect(rx(loaded, 'Pushups').note).toBeUndefined();
  });

  it('applies the load scale to calculated weights only', () => {
    const scaled = load(makeInput({ loadScale: 0.8 }));
    expect(rx(scaled, 'Goblet_Squat').capacity).toBeCloseTo(36 * 0.8);
    expect(rx(scaled, 'Plank').capacity).toBe(75);
    expect(scaled.capacity.Goblet_Squat?.value).toBe(36); // the running estimate stays unscaled
  });

  it('starts from carried capacities instead of the baseline', () => {
    const loaded = load(makeInput({ carried: { Goblet_Squat: 44.5 } }));
    expect(rx(loaded, 'Goblet_Squat').capacity).toBe(44.5);
    expect(loaded.capacity.Goblet_Squat?.source).toBe('carry');
  });

  it('rejects plans that reference unknown exercises', () => {
    const plan = buildPlan(makeInput(), catalog);
    plan.sessions[0]!.items[0]!.exerciseId = 'Nope';
    expect(() => computeLoads(plan, makeInput(), catalog)).toThrow(/Unknown exercise/);
  });
});

describe('computeLoads: warm-up sets', () => {
  it('adds ramp-up sets to the first heavy compound exercise only', () => {
    const [first, ...rest] = load(makeInput()).sessions[0]!.items;
    expect(first!.prescription).toMatchObject({
      weight: 24,
      warmup: [
        { weight: 12, reps: 8 },
        { weight: 18, reps: 3 },
      ],
    });
    for (const item of rest) {
      expect(item.prescription.type === 'weighted' && item.prescription.warmup).toBeFalsy();
    }
  });

  it('drops ramp-up sets that would not be lighter than the working weight', () => {
    const input = makeInput();
    input.equipmentConfig.db = [24];
    const first = load(input).sessions[0]!.items[0]!.prescription;
    expect(first.type === 'weighted' && first.warmup).toEqual([]);
  });

  it('skips isolation exercises that come before the first compound one', () => {
    const input = makeInput({ swaps: { 'FA|0': 'Dumbbell_Bicep_Curl' } });
    const [curl, press] = load(input).sessions[0]!.items;
    expect(curl!.prescription.type === 'weighted' && curl!.prescription.warmup).toBeUndefined();
    expect(press!.prescription.type === 'weighted' && press!.prescription.warmup).toHaveLength(2);
  });
});

describe('computeLoads: edits and ratings', () => {
  const first = '2026-10-12';

  it('re-anchors the estimate to an edited weight and reps', () => {
    const loaded = load(withOverride('Goblet_Squat', first, { weight: 20, reps: 10 }));
    const edited = rx(loaded, 'Goblet_Squat');
    expect(edited).toMatchObject({ weight: 20, reps: 10, edited: true });
    expect(edited.capacity).toBeCloseTo(e1rm(20, 10, 3));
    expect(edited.note).toBeUndefined();

    // Later sessions follow from the new estimate.
    expect(rx(loaded, 'Goblet_Squat', 1).capacity).toBeCloseTo(e1rm(20, 10, 3) * 1.015);
    expect(rx(loaded, 'Goblet_Squat', 1).edited).toBe(false);
    expect(loaded.capacity.Goblet_Squat).toMatchObject({ week: 0, source: 'edit' });
  });

  it('keeps the calculated value for whichever of weight and reps was not edited', () => {
    expect(
      rx(load(withOverride('Goblet_Squat', first, { weight: 20 })), 'Goblet_Squat'),
    ).toMatchObject({
      weight: 20,
      reps: 12,
    });
    expect(
      rx(load(withOverride('Goblet_Squat', first, { reps: 9 })), 'Goblet_Squat'),
    ).toMatchObject({
      weight: 24,
      reps: 9,
    });
  });

  it('does not scale exercises the user has edited', () => {
    const loaded = load(
      withOverride('Goblet_Squat', first, { weight: 20, reps: 10 }, { loadScale: 0.5 }),
    );
    expect(rx(loaded, 'Goblet_Squat', 1).capacity).toBeCloseTo(e1rm(20, 10, 3) * 1.015);
  });

  it.each([
    ['easy', 2],
    ['hard', -1],
    ['fail', -2],
  ] as const)('treats a "%s" rating as %i reps in reserve relative to plan', (rating, delta) => {
    const loaded = load(withOverride('Goblet_Squat', first, { rating }));
    const p = rx(loaded, 'Goblet_Squat');
    expect(p).toMatchObject({ weight: 24, reps: 12, edited: true, rating });
    expect(p.capacity).toBeCloseTo(e1rm(24, 12, 3 + delta));
  });

  it('changes nothing for an "as planned" rating without numbers', () => {
    const plain = load(makeInput());
    const rated = load(withOverride('Goblet_Squat', first, { rating: 'ok' }));
    expect(rx(rated, 'Goblet_Squat')).toEqual({ ...rx(plain, 'Goblet_Squat'), rating: 'ok' });
    expect(rated.capacity).toEqual(plain.capacity);
  });

  it('re-anchors bodyweight exercises from the reps that were done', () => {
    const base = { equipment: {} };
    const edited = load(withOverride('Pushups', first, { reps: 25 }, base));
    expect(rx(edited, 'Pushups')).toMatchObject({ reps: 25, capacity: 28, edited: true });

    const easy = load(withOverride('Pushups', first, { rating: 'easy' }, base));
    expect(rx(easy, 'Pushups').capacity).toBe(19 + 3 + 2);

    const failed = load(withOverride('Pushups', first, { reps: 1, rating: 'fail' }, base));
    expect(rx(failed, 'Pushups').capacity).toBe(2);
  });

  it('re-anchors timed exercises from the seconds that were held', () => {
    const edited = load(withOverride('Plank', first, { reps: 76 }));
    expect(rx(edited, 'Plank')).toMatchObject({ seconds: 76, edited: true });
    expect(rx(edited, 'Plank').capacity).toBeCloseTo(76 / (1 - 3 * 0.08));

    const hard = load(withOverride('Plank', first, { rating: 'hard' }));
    expect(rx(hard, 'Plank').capacity).toBeCloseTo(55 / (1 - 2 * 0.08));
  });

  it('undoes the deload reduction when a deload session is edited', () => {
    const deloadDay = load(makeInput()).sessions.find((s) => s.deload && s.template === 'FA')!.id;

    const squat = load(withOverride('Goblet_Squat', deloadDay, { weight: 20, reps: 10 }));
    expect(squat.capacity.Goblet_Squat?.value).toBeCloseTo(e1rm(20, 10, 4) / 0.9);

    const plank = load(withOverride('Plank', deloadDay, { reps: 40 }));
    expect(plank.capacity.Plank?.value).toBeCloseTo(40 / ((1 - 4 * 0.08) * 0.85));

    const pushups = load(
      withOverride('Pushups', deloadDay, { reps: 12, rating: 'easy' }, { equipment: {} }),
    );
    expect(pushups.capacity.Pushups?.value).toBeCloseTo(12 / 0.8 + 4 + 2);
  });

  it('ignores an override for an exercise that is not in that session', () => {
    const plain = load(makeInput());
    expect(load(withOverride('Barbell_Squat', first, { weight: 100, reps: 5 })).capacity).toEqual(
      plain.capacity,
    );
  });
});

describe('nextOccurrence', () => {
  const loaded = load(makeInput({ equipment: ALL_EQUIPMENT }));
  const firstSession = loaded.sessions[0]!;
  const exerciseId = firstSession.items[0]!.exerciseId;

  it('finds the next session that contains the exercise', () => {
    const next = nextOccurrence(loaded.sessions, firstSession.id, exerciseId);
    expect(next?.session.id).toBe('2026-10-19');
    expect(next?.item.exerciseId).toBe(exerciseId);
  });

  it('returns nothing after the last occurrence', () => {
    const last = loaded.sessions.at(-1)!;
    expect(nextOccurrence(loaded.sessions, last.id, last.items[0]!.exerciseId)).toBeUndefined();
    expect(nextOccurrence(loaded.sessions, firstSession.id, 'Nope')).toBeUndefined();
  });
});

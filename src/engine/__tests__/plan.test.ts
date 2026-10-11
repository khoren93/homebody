import { describe, expect, it } from 'vitest';

import { requireExercise } from '@/data';

import { GOALS, TEMPLATES } from '../constants';
import {
  buildPlan,
  candidates,
  fillTemplate,
  fitToTime,
  repRange,
  restSeconds,
  setSeconds,
} from '../plan';
import type { Goal, Plan, TemplateId } from '../types';
import planGoldenJson from './fixtures/plan.golden.json?raw';
import { ALL_EQUIPMENT, catalog, makeInput, scenarios } from './helpers';

type GoldenPlan = {
  split: string[];
  templates: Record<string, [minutes: number, items: [string, string, string, number][]]>;
  sessions: unknown[];
};
const golden = JSON.parse(planGoldenJson) as Record<string, GoldenPlan>;

/** Encodes a plan in the compact layout of plan.golden.json. */
function encode(plan: Plan): GoldenPlan {
  return {
    split: [...plan.split],
    templates: Object.fromEntries(
      Object.entries(plan.templates).map(([id, t]) => [
        id,
        [t.minutes, t.items.map((i) => [i.key, i.pattern, i.exerciseId, i.sets])],
      ]),
    ),
    sessions: plan.sessions.map((s) => [
      s.id,
      s.date,
      s.shift,
      s.week,
      s.template,
      s.deload ? 1 : 0,
      s.rir,
      s.minutes,
      s.items.map((i) => [i.exerciseId, i.sets, i.reps.target, i.reps.min, i.reps.max, i.rest]),
    ]),
  };
}

describe('buildPlan: parity with the prototype', () => {
  it('has a golden plan for every scenario', () => {
    expect(Object.keys(golden).sort()).toEqual(scenarios.map((s) => s.name).sort());
  });

  it.each(scenarios)('$name', ({ name, input }) => {
    expect(encode(buildPlan(input, catalog))).toEqual(golden[name]);
  });
});

describe('buildPlan: splits', () => {
  const splitFor = (days: number[]) =>
    buildPlan(makeInput({ schedule: { ...makeInput().schedule, days } }), catalog).split;

  it.each<[number[], TemplateId[]]>([
    [[0], ['FA']],
    [
      [0, 3],
      ['FA', 'FB'],
    ],
    [
      [0, 2, 4],
      ['FA', 'FB', 'FC'],
    ],
    [
      [0, 1, 3, 4],
      ['UA', 'LA', 'UB', 'LB'],
    ],
    [
      [0, 1, 2, 4, 5],
      ['UA', 'LA', 'FC', 'UB', 'LB'],
    ],
    [
      [0, 1, 2, 3, 4, 5],
      ['PA', 'QA', 'GA', 'PB', 'QB', 'GB'],
    ],
    [
      [0, 1, 2, 3, 4, 5, 6],
      ['PA', 'QA', 'GA', 'PB', 'QB', 'GB', 'FC'],
    ],
  ])('%j training days use %j', (days, expected) => {
    expect(splitFor(days)).toEqual(expected);
  });

  it('rotates the templates through the training days in order', () => {
    const plan = buildPlan(makeInput(), catalog);
    expect(plan.sessions.slice(0, 6).map((s) => s.template)).toEqual([
      'FA',
      'FB',
      'FC',
      'FA',
      'FB',
      'FC',
    ]);
  });

  it('does not depend on the order the days are stored in', () => {
    expect(splitFor([4, 0, 2])).toEqual(['FA', 'FB', 'FC']);
    const plan = buildPlan(
      makeInput({ schedule: { ...makeInput().schedule, days: [4, 0, 2] } }),
      catalog,
    );
    expect(plan.sessions.map((s) => s.id)).toEqual(
      buildPlan(makeInput(), catalog).sessions.map((s) => s.id),
    );
  });

  it('builds no sessions without training days', () => {
    expect(
      buildPlan(makeInput({ schedule: { ...makeInput().schedule, days: [] } }), catalog).sessions,
    ).toEqual([]);
  });
});

describe('buildPlan: calendar and block structure', () => {
  it('schedules one session per training day for the whole plan', () => {
    const plan = buildPlan(makeInput(), catalog);
    expect(plan.sessions).toHaveLength(12);
    expect(plan.sessions.map((s) => s.id).slice(0, 4)).toEqual([
      '2026-10-12',
      '2026-10-14',
      '2026-10-16',
      '2026-10-19',
    ]);
    expect(plan.sessions.at(-1)?.id).toBe('2026-11-06');
  });

  it('counts weeks from the start date, not from Monday', () => {
    const plan = buildPlan(
      makeInput({ schedule: { ...makeInput().schedule, start: '2026-10-15', weeks: 1 } }),
      catalog,
    );
    // Thursday start: Friday, then Monday and Wednesday of the same plan week.
    expect(plan.sessions.map((s) => [s.id, s.week])).toEqual([
      ['2026-10-16', 0],
      ['2026-10-19', 0],
      ['2026-10-21', 0],
    ]);
  });

  it('prescribes 3, 2, 1 reps in reserve and then a deload', () => {
    const plan = buildPlan(makeInput(), catalog);
    const byWeek = [0, 1, 2, 3].map((w) => plan.sessions.find((s) => s.week === w));
    expect(byWeek.map((s) => s?.rir)).toEqual([3, 2, 1, 4]);
    expect(byWeek.map((s) => s?.deload)).toEqual([false, false, false, true]);
  });

  it('repeats week three when deloads are switched off', () => {
    const plan = buildPlan(
      makeInput({ schedule: { ...makeInput().schedule, deload: false } }),
      catalog,
    );
    expect([0, 1, 2, 3].map((w) => plan.sessions.find((s) => s.week === w)?.rir)).toEqual([
      3, 2, 1, 1,
    ]);
    expect(plan.sessions.some((s) => s.deload)).toBe(false);
  });

  it('starts a new block every four weeks', () => {
    const plan = buildPlan(makeInput({ schedule: { ...makeInput().schedule, weeks: 8 } }), catalog);
    expect([4, 5, 6, 7].map((w) => plan.sessions.find((s) => s.week === w)?.rir)).toEqual([
      3, 2, 1, 4,
    ]);
  });

  it('removes one set per exercise in a deload week, but keeps at least two', () => {
    const plan = buildPlan(makeInput(), catalog);
    const normal = plan.sessions.find((s) => s.week === 0 && s.template === 'FA');
    const deload = plan.sessions.find((s) => s.week === 3 && s.template === 'FA');
    expect(normal?.items.map((i) => i.sets)).toEqual([3, 3, 3, 3, 3, 2]);
    expect(deload?.items.map((i) => i.sets)).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it('keeps session ids stable when sessions are shifted', () => {
    const plain = buildPlan(makeInput(), catalog);
    const shifted = buildPlan(makeInput({ shifts: [{ at: '2026-10-16', days: 2 }] }), catalog);

    expect(shifted.sessions.map((s) => s.id)).toEqual(plain.sessions.map((s) => s.id));
    expect(shifted.sessions.slice(0, 4).map((s) => [s.date, s.shift])).toEqual([
      ['2026-10-12', 0],
      ['2026-10-14', 0],
      ['2026-10-18', 2],
      ['2026-10-21', 2],
    ]);
  });

  it('adds up several shifts and ignores empty ones', () => {
    const plan = buildPlan(
      makeInput({
        shifts: [
          { at: '2026-10-16', days: 2 },
          { at: '2026-10-26', days: 3 },
          { at: '2026-10-12', days: 0 },
        ],
      }),
      catalog,
    );
    expect(plan.sessions.find((s) => s.id === '2026-10-14')?.shift).toBe(0);
    expect(plan.sessions.find((s) => s.id === '2026-10-23')?.shift).toBe(2);
    expect(plan.sessions.find((s) => s.id === '2026-10-26')?.date).toBe('2026-10-31');
  });
});

describe('candidates', () => {
  it('lists weighted exercises before bodyweight ones', () => {
    const types = candidates('squat', { db: true }, catalog.list).map((e) => e.type);
    expect(types.indexOf('reps')).toBeGreaterThan(types.lastIndexOf('weighted'));
  });

  it('only offers exercises that are doable with the owned equipment', () => {
    const ids = candidates('push_horizontal', {}, catalog.list).map((e) => e.id);
    expect(ids).toContain('Pushups');
    expect(ids).not.toContain('Dumbbell_Bench_Press');
  });
});

describe('fillTemplate', () => {
  const fill = (template: TemplateId, patch = {}) =>
    fillTemplate(template, makeInput(patch), catalog);

  it('never repeats an exercise within a session', () => {
    for (const template of Object.keys(TEMPLATES) as TemplateId[]) {
      const ids = fill(template, { equipment: ALL_EQUIPMENT }).map((p) => p.exerciseId);
      expect(new Set(ids).size, template).toBe(ids.length);
    }
  });

  it('rotates variants so A, B and C days pick different exercises for a pattern', () => {
    const pushOf = (template: TemplateId) =>
      fill(template).find((p) => p.pattern === 'push_horizontal')?.exerciseId;
    expect(new Set([pushOf('FA'), pushOf('FB'), pushOf('FC')]).size).toBe(3);
  });

  it('never picks swap-only exercises while a regular one fits', () => {
    for (const template of Object.keys(TEMPLATES) as TemplateId[]) {
      for (const pick of fill(template, { equipment: ALL_EQUIPMENT })) {
        expect(requireExercise(pick.exerciseId).swapOnly, pick.exerciseId).toBeUndefined();
      }
    }
  });

  it('uses a swap-only exercise when nothing else is available', () => {
    const regularGlute = catalog.list.filter((e) => e.patterns.includes('glute') && !e.swapOnly);
    const excluded = Object.fromEntries(regularGlute.map((e) => [e.id, true as const]));
    const glute = fill('LA', { equipment: {}, excluded }).find((p) => p.pattern === 'glute');
    expect(glute && requireExercise(glute.exerciseId).swapOnly).toBe(true);
  });

  it.each([
    ['pull_vertical', 'pull_horizontal', 'UA', 3],
    ['chest_fly', 'push_horizontal', 'UB', 7],
    ['rear_delts', 'delts', 'UB', 4],
  ] as const)('falls back from %s to %s', (_from, to, template, index) => {
    // Dumbbells without a bench or bar: no pull-ups, flyes or band work.
    const picks = fill(template, { equipment: { db: true }, excluded: { Reverse_Flyes: true } });
    expect(picks.find((p) => p.key === `${template}|${index}`)?.pattern).toBe(to);
  });

  it('drops a slot when neither the pattern nor its fallback can be filled', () => {
    const everyCalfExcluded = Object.fromEntries(
      catalog.list.filter((e) => e.patterns.includes('calves')).map((e) => [e.id, true as const]),
    );
    const picks = fill('LA', { excluded: everyCalfExcluded });
    expect(picks.some((p) => p.pattern === 'calves')).toBe(false);
    expect(picks).toHaveLength(TEMPLATES.LA.slots.length - 1);
  });

  it('applies the swap the user chose for a slot', () => {
    const picks = fill('FA', { swaps: { 'FA|0': 'Dumbbell_Squat' } });
    expect(picks[0]).toEqual({ key: 'FA|0', pattern: 'squat', exerciseId: 'Dumbbell_Squat' });
  });

  it.each([
    ['needs equipment that is not owned', { 'FA|0': 'Barbell_Squat' }, {}],
    ['is excluded', { 'FA|0': 'Dumbbell_Squat' }, { Dumbbell_Squat: true as const }],
    ['does not exist', { 'FA|0': 'No_Such_Exercise' }, {}],
  ])('ignores a swap that %s', (_label, swaps, excluded) => {
    const picks = fill('FA', { swaps, excluded });
    expect(picks[0]?.exerciseId).toBe('Goblet_Squat');
  });

  it('ignores a swap that would duplicate an earlier exercise of the session', () => {
    const picks = fill('FA', { swaps: { 'FA|3': 'Goblet_Squat' } });
    expect(picks[0]?.exerciseId).toBe('Goblet_Squat');
    expect(picks[3]?.exerciseId).not.toBe('Goblet_Squat');
  });

  it('never picks an excluded exercise', () => {
    const picks = fill('FA', { excluded: { Goblet_Squat: true, Plank: true } });
    expect(picks.map((p) => p.exerciseId)).not.toContain('Goblet_Squat');
    expect(picks.map((p) => p.exerciseId)).not.toContain('Plank');
  });
});

describe('fitToTime', () => {
  const fit = (minutes: number, goal: Goal = 'hypertrophy', template: TemplateId = 'FA') => {
    const input = makeInput({
      profile: { ...makeInput().profile, goal },
      schedule: { ...makeInput().schedule, minutes },
      equipment: ALL_EQUIPMENT,
    });
    return fitToTime(fillTemplate(template, input, catalog), input, catalog);
  };

  it.each([20, 30, 45, 60, 90, 120])('stays within a %i minute budget', (minutes) => {
    expect(fit(minutes).minutes).toBeLessThanOrEqual(minutes);
  });

  it('caps the number of exercises at about one per 7.5 minutes, between 3 and 8', () => {
    expect(fit(20).items.length).toBeLessThanOrEqual(3);
    expect(fit(45).items.length).toBeLessThanOrEqual(6);
    expect(fit(120).items).toHaveLength(8);
  });

  it('gives every kept exercise between two and four sets', () => {
    for (const minutes of [20, 45, 90, 120]) {
      for (const item of fit(minutes).items) {
        expect(item.sets).toBeGreaterThanOrEqual(2);
        expect(item.sets).toBeLessThanOrEqual(4);
      }
    }
  });

  it('reserves a fourth set for compound exercises', () => {
    for (const item of fit(120).items) {
      if (!requireExercise(item.exerciseId).compound) expect(item.sets).toBeLessThanOrEqual(3);
    }
    expect(fit(120).items.some((i) => i.sets === 4)).toBe(true);
  });

  it('never goes above three sets for the endurance goal', () => {
    expect(Math.max(...fit(120, 'endurance').items.map((i) => i.sets))).toBe(3);
  });

  it('keeps the first exercise even when the budget is too small for it', () => {
    const plan = fit(1);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]?.sets).toBe(2);
  });

  it('returns an empty plan for an empty template', () => {
    expect(fitToTime([], makeInput(), catalog)).toEqual({ items: [], minutes: 5 });
  });

  it('rejects picks that are not in the catalog', () => {
    expect(() =>
      fitToTime([{ key: 'FA|0', pattern: 'squat', exerciseId: 'Nope' }], makeInput(), catalog),
    ).toThrow(/Unknown exercise/);
  });
});

describe('rep ranges, rest and set duration', () => {
  const squat = requireExercise('Goblet_Squat'); // compound
  const curl = requireExercise('Dumbbell_Bicep_Curl'); // isolation

  it('uses the goal ranges for compound and isolation exercises', () => {
    expect(repRange(squat, 'hypertrophy')).toEqual(GOALS.hypertrophy.compound);
    expect(repRange(curl, 'hypertrophy')).toEqual(GOALS.hypertrophy.isolation);
    expect(repRange(squat, 'strength')).toEqual({ target: 5, min: 4, max: 6 });
  });

  it('lets an exercise override the range', () => {
    const swing = requireExercise('One-Arm_Kettlebell_Swings');
    expect(repRange(swing, 'strength')).toEqual({ target: 15, min: 12, max: 20 });
  });

  it('rests longer after compound exercises and for strength', () => {
    expect(restSeconds(squat, 'hypertrophy')).toBe(105);
    expect(restSeconds(curl, 'hypertrophy')).toBe(70);
    expect(restSeconds(squat, 'strength')).toBe(150);
    expect(restSeconds(curl, 'endurance')).toBe(45);
  });

  it('estimates set duration from reps, holds and sides', () => {
    expect(setSeconds(squat, 8)).toBe(8 * 3.5 + 8);
    expect(setSeconds(requireExercise('Plank'), 0)).toBe(75 * 0.8 + 8);
    expect(setSeconds(requireExercise('One-Arm_Dumbbell_Row'), 8)).toBe((8 * 3.5 + 8) * 2);
  });
});

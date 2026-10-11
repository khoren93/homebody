import type { Exercise, PatternId } from '@/data/schema';

import {
  BLOCK_WITH_DELOAD,
  BLOCK_WITHOUT_DELOAD,
  DELOAD_RIR,
  GOALS,
  PATTERN_FALLBACKS,
  SPLITS,
  TEMPLATES,
  TIMING,
} from './constants';
import { addDays, weekday } from './dates';
import { hasEquipment } from './equipment';
import type {
  Catalog,
  EngineInput,
  Goal,
  OwnedEquipment,
  Plan,
  RepRange,
  Session,
  SlotKey,
  SlotPick,
  TemplateId,
  TemplatePlan,
} from './types';

export function slotKey(template: TemplateId, index: number): SlotKey {
  return `${template}|${index}`;
}

/** Target, minimum and maximum reps of an exercise for a goal. */
export function repRange(exercise: Exercise, goal: Goal): RepRange {
  if (exercise.repRange) return exercise.repRange;
  return exercise.compound ? GOALS[goal].compound : GOALS[goal].isolation;
}

/** Rest between sets, in seconds. */
export function restSeconds(exercise: Exercise, goal: Goal): number {
  return exercise.compound ? GOALS[goal].restCompound : GOALS[goal].restIsolation;
}

/** Estimated duration of one working set, in seconds. */
export function setSeconds(exercise: Exercise, reps: number): number {
  const work =
    exercise.type === 'timed'
      ? exercise.baseline * TIMING.holdFraction
      : reps * TIMING.secondsPerRep;
  return (work + TIMING.setOverhead) * (exercise.unilateral ? 2 : 1);
}

/**
 * Exercises that can fill a pattern with the owned equipment, in order of
 * preference: weighted ones first, then dataset order.
 */
export function candidates(
  pattern: PatternId,
  owned: OwnedEquipment,
  pool: readonly Exercise[],
): Exercise[] {
  const fitting = pool.filter((e) => e.patterns.includes(pattern) && hasEquipment(e, owned));
  return [
    ...fitting.filter((e) => e.type === 'weighted'),
    ...fitting.filter((e) => e.type !== 'weighted'),
  ];
}

/** Picks one exercise per slot of a template. Slots nothing fits are dropped. */
export function fillTemplate(
  template: TemplateId,
  input: Pick<EngineInput, 'equipment' | 'swaps' | 'excluded'>,
  catalog: Catalog,
): SlotPick[] {
  const pool = catalog.list.filter((e) => !input.excluded[e.id]);
  const { slots, variant } = TEMPLATES[template];
  const used = new Set<string>();
  const picks: SlotPick[] = [];

  slots.forEach((slot, index) => {
    const key = slotKey(template, index);
    let pattern = slot;
    let options = candidates(pattern, input.equipment, pool);
    const fallback = PATTERN_FALLBACKS[pattern];
    if (options.length === 0 && fallback) {
      pattern = fallback;
      options = candidates(pattern, input.equipment, pool);
    }
    if (options.length === 0) return;

    let pick: Exercise | undefined;

    // A swap chosen by the user wins as long as it is still doable.
    const swapId = input.swaps[key];
    const swap = swapId === undefined ? undefined : catalog.byId.get(swapId);
    if (
      swap &&
      hasEquipment(swap, input.equipment) &&
      !used.has(swap.id) &&
      !input.excluded[swap.id]
    ) {
      pick = swap;
    }

    if (!pick) {
      const free = options.filter((e) => !used.has(e.id));
      // Swap-only exercises are picked only when nothing else is left.
      const regular = free.filter((e) => !e.swapOnly);
      const preferred = regular.length > 0 ? regular : free;
      const best = preferred[0];
      if (!best) return;
      // Rotate among the top three of the best kind so A/B/C days differ.
      const rotation = preferred.filter((e) => e.type === best.type).slice(0, 3);
      pick = rotation[variant % rotation.length];
    }

    if (!pick) return;
    used.add(pick.id);
    picks.push({ key, pattern, exerciseId: pick.id });
  });

  return picks;
}

/**
 * Fits a template into the time budget: decides how many of the picked
 * exercises are kept and how many sets each gets.
 */
export function fitToTime(
  picks: readonly SlotPick[],
  input: Pick<EngineInput, 'profile' | 'schedule'>,
  catalog: Catalog,
): TemplatePlan {
  const goal = input.profile.goal;
  const budget = input.schedule.minutes * 60;
  const exercises = picks.map((pick) => {
    const exercise = catalog.byId.get(pick.exerciseId);
    if (!exercise) throw new Error(`Unknown exercise id "${pick.exerciseId}"`);
    return exercise;
  });
  const sets = picks.map(() => 0);
  const firstHeavy = exercises.findIndex((e) => e.type === 'weighted' && e.compound);

  const cost = (): number => {
    let seconds: number = TIMING.warmUp;
    exercises.forEach((exercise, i) => {
      const n = sets[i] ?? 0;
      if (n === 0) return;
      const perSet = setSeconds(exercise, repRange(exercise, goal).target);
      seconds += n * perSet + (n - 1) * restSeconds(exercise, goal) + TIMING.transition;
      if (i === firstHeavy) seconds += TIMING.rampUp;
    });
    return seconds;
  };

  // 1. Keep as many exercises as fit with two sets each, most important first.
  const maxExercises = Math.max(
    TIMING.minExercises,
    Math.min(TIMING.maxExercises, Math.floor(input.schedule.minutes / TIMING.minutesPerExercise)),
  );
  let count = 0;
  for (let i = 0; i < picks.length && count < maxExercises; i++) {
    sets[i] = 2;
    if (cost() > budget) {
      sets[i] = 0;
      continue;
    }
    count++;
  }
  if (count === 0 && picks.length > 0) sets[0] = 2;

  // 2. Spend the remaining time on a third set, then a fourth for compounds.
  const byImportance = picks
    .map((_, i) => i)
    .sort((a, b) => Number(exercises[b]?.compound) - Number(exercises[a]?.compound) || a - b);
  for (const target of [3, 4]) {
    for (const i of byImportance) {
      const current = sets[i] ?? 0;
      if (current === 0 || current >= target) continue;
      if (target === 4 && (!exercises[i]?.compound || goal === 'endurance')) continue;
      sets[i] = current + 1;
      if (cost() > budget) sets[i] = current;
    }
  }

  return {
    items: picks
      .map((pick, i) => ({ ...pick, sets: sets[i] ?? 0 }))
      .filter((item) => item.sets > 0),
    minutes: Math.round(cost() / 60),
  };
}

/** A deload session drops one set per exercise, but never below two. */
function deloadSets(sets: number): number {
  return Math.max(Math.min(2, sets), sets - 1);
}

/**
 * Builds the whole plan: one session per training day for the length of the
 * schedule, rotating through the templates of the split.
 */
export function buildPlan(input: EngineInput, catalog: Catalog): Plan {
  const { schedule, profile } = input;
  const days = [...schedule.days].sort((a, b) => a - b);
  const split = SPLITS[Math.min(7, Math.max(1, days.length))] ?? [];

  const templates: Partial<Record<TemplateId, TemplatePlan>> = {};
  for (const template of new Set(split)) {
    templates[template] = fitToTime(fillTemplate(template, input, catalog), input, catalog);
  }

  const block = schedule.deload ? BLOCK_WITH_DELOAD : BLOCK_WITHOUT_DELOAD;
  const shifts = input.shifts.filter((shift) => shift.at && shift.days);
  const sessions: Session[] = [];

  for (let offset = 0; offset < schedule.weeks * 7; offset++) {
    const id = addDays(schedule.start, offset);
    if (!days.includes(weekday(id))) continue;

    const template = split[sessions.length % split.length];
    const templatePlan = template && templates[template];
    if (!template || !templatePlan) continue;

    const week = Math.floor(offset / 7);
    const phase = block[week % block.length];
    const deload = phase === 'deload';
    const shift = shifts.reduce((total, s) => total + (id >= s.at ? s.days : 0), 0);

    sessions.push({
      id,
      date: shift ? addDays(id, shift) : id,
      shift,
      week,
      template,
      deload,
      rir: typeof phase === 'number' ? phase : DELOAD_RIR,
      minutes: templatePlan.minutes,
      items: templatePlan.items.map((item) => {
        const exercise = catalog.byId.get(item.exerciseId);
        if (!exercise) throw new Error(`Unknown exercise id "${item.exerciseId}"`);
        return {
          ...item,
          sets: deload ? deloadSets(item.sets) : item.sets,
          reps: repRange(exercise, profile.goal),
          rest: restSeconds(exercise, profile.goal),
        };
      }),
    });
  }

  return { sessions, split, templates };
}

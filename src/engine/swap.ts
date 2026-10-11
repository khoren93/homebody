import type { Exercise } from '@/data/schema';

import { candidates } from './plan';
import type { Catalog, EngineInput, PlanItem } from './types';

type SwapInput = Pick<EngineInput, 'equipment' | 'excluded'>;

/**
 * Every exercise the user may put into a slot by hand: same movement pattern,
 * doable with the owned equipment and not excluded. Includes the current one.
 */
export function slotAlternatives(
  item: Pick<PlanItem, 'pattern'>,
  input: SwapInput,
  catalog: Catalog,
): Exercise[] {
  return candidates(item.pattern, input.equipment, catalog.list).filter(
    (e) => !input.excluded[e.id],
  );
}

/**
 * Candidates for the "another exercise" button: alternatives that are not
 * already in the session, narrowed to the ones that train the same primary
 * muscles whenever there are any.
 */
export function swapPool(
  session: { readonly items: readonly Pick<PlanItem, 'exerciseId'>[] },
  item: Pick<PlanItem, 'pattern' | 'exerciseId'>,
  input: SwapInput,
  catalog: Catalog,
): Exercise[] {
  const current = catalog.byId.get(item.exerciseId);
  const inSession = new Set(session.items.map((other) => other.exerciseId));
  const pool = slotAlternatives(item, input, catalog).filter((e) => !inSession.has(e.id));
  const sameMuscles = pool.filter((e) => e.primary.some((m) => current?.primary.includes(m)));
  return sameMuscles.length > 0 ? sameMuscles : pool;
}

/**
 * Picks a random replacement, avoiding `avoid` (the exercise the user just
 * swapped away from) unless it is the only option. `random` returns a number
 * in [0, 1), like `Math.random`.
 */
export function pickRandomSwap(
  pool: readonly Exercise[],
  random: () => number,
  avoid?: string,
): Exercise | undefined {
  const fresh = pool.filter((e) => e.id !== avoid);
  const options = fresh.length > 0 ? fresh : pool;
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
}

import { useState } from 'react';

import {
  type LoadedItem,
  type LoadedSession,
  pickRandomSwap,
  type SlotKey,
  swapPool,
} from '@/engine';
import { actions, CATALOG, useAppStore } from '@/store';

/** The last random replacement, so it can be explained and undone. */
export type SwapUndo = {
  slot: SlotKey;
  /** The swap that was stored for the slot before, or null for the automatic pick. */
  previous: string | null;
  /** The exercise the user started from. */
  from: string;
  /** The exercise that replaced it. */
  to: string;
};

/**
 * Random replacement of an exercise with an undo. Pressing the button again
 * keeps cycling through the options without ever returning to the exercise
 * the user started from, and undo goes all the way back to it.
 */
export function useRandomSwap(session: LoadedSession, random: () => number = Math.random) {
  const [undo, setUndo] = useState<SwapUndo | null>(null);
  const equipment = useAppStore((store) => store.state.equipment);
  const excluded = useAppStore((store) => store.state.excluded);

  const poolFor = (item: LoadedItem) => swapPool(session, item, { equipment, excluded }, CATALOG);

  return {
    /** How many replacements exist for an item. */
    optionCount: (item: LoadedItem) => poolFor(item).length,

    /** The undo record, if this item is the result of the last random swap. */
    undoFor: (item: LoadedItem) =>
      undo?.slot === item.key && undo.to === item.exerciseId ? undo : null,

    swap: (item: LoadedItem) => {
      const ongoing = undo?.slot === item.key ? undo : null;
      const pick = pickRandomSwap(poolFor(item), random, ongoing?.from);
      if (!pick) return;
      const swaps = useAppStore.getState().state.swaps;
      setUndo({
        slot: item.key,
        previous: ongoing ? ongoing.previous : (swaps[item.key] ?? null),
        from: ongoing?.to === item.exerciseId ? ongoing.from : item.exerciseId,
        to: pick.id,
      });
      actions.swapExercise(item.key, pick.id);
    },

    undo: () => {
      if (!undo) return;
      actions.swapExercise(undo.slot, undo.previous);
      setUndo(null);
    },
  };
}

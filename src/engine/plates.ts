import { PLATES } from './constants';

export type PlateLoading = {
  /** Weight of the empty bar in kg. */
  bar: number;
  /** Plates to put on each side, heaviest first. */
  perSide: number[];
  /** Weight per side that cannot be made up with standard plates. */
  remainder: number;
};

/** Breaks a bar load down into the plates needed on each side. */
export function plateLoading(total: number, bar: number): PlateLoading {
  let side = (total - bar) / 2;
  const perSide: number[] = [];
  if (side > 0) {
    for (const plate of PLATES) {
      while (side + 1e-6 >= plate) {
        perSide.push(plate);
        side -= plate;
      }
    }
  }
  return { bar, perSide, remainder: Math.max(0, Math.round(side * 1000) / 1000) };
}

/** Pure geometry for the time-series chart, kept apart from rendering so it can be tested. */

export type ChartPoint = { x: number; y: number };

export type ChartScale = {
  /** Horizontal grid lines with their labels, bottom to top. */
  ticks: { value: number; y: number }[];
  /** Maps a timestamp (ms) and a value to chart coordinates. */
  point: (time: number, value: number) => ChartPoint;
  min: number;
  max: number;
};

export type ChartBox = {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const DAY_MS = 86_400_000;

/** Rounds a step up to 1, 2 or 5 times a power of ten. */
export function niceStep(rough: number): number {
  if (!(rough > 0)) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const fraction = rough / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Builds the scales for a set of timestamps and values: a padded value axis
 * snapped to nice steps (about four grid lines) and a time axis that spans at
 * least one day.
 */
export function chartScale(
  times: readonly number[],
  values: readonly number[],
  box: ChartBox,
): ChartScale {
  const t0 = Math.min(...times);
  const t1 = Math.max(t0 + DAY_MS, ...times);
  let low = Math.min(...values);
  let high = Math.max(...values);
  const padding = Math.max((high - low) * 0.15, high * 0.02, 0.5);
  low -= padding;
  high += padding;
  const step = niceStep((high - low) / 4);
  low = Math.floor(low / step) * step;
  high = Math.ceil(high / step) * step;

  const innerWidth = box.width - box.left - box.right;
  const innerHeight = box.height - box.top - box.bottom;
  const point = (time: number, value: number): ChartPoint => ({
    x: box.left + ((time - t0) / (t1 - t0)) * innerWidth,
    y: box.top + ((high - value) / (high - low)) * innerHeight,
  });

  const ticks: ChartScale['ticks'] = [];
  for (let value = low; value <= high + step * 1e-6; value += step) {
    const rounded = Math.round(value * 1e6) / 1e6;
    ticks.push({ value: rounded, y: point(t0, rounded).y });
  }
  return { ticks, point, min: low, max: high };
}

/** An SVG path through the points. */
export function linePath(points: readonly ChartPoint[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

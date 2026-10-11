import { describe, expect, it } from 'vitest';

import { chartScale, linePath, niceStep } from './scale';

const box = { width: 330, height: 150, left: 30, right: 8, top: 10, bottom: 24 };
const DAY = 86_400_000;

describe('niceStep', () => {
  it.each([
    [0.07, 0.1],
    [0.15, 0.2],
    [0.3, 0.5],
    [0.9, 1],
    [1.2, 2],
    [3, 5],
    [7, 10],
    [40, 50],
    [0, 1],
  ])('rounds %f up to %f', (rough, expected) => {
    expect(niceStep(rough)).toBeCloseTo(expected);
  });
});

describe('chartScale', () => {
  const scale = chartScale([0, 7 * DAY, 14 * DAY], [36, 36.5, 38.2], box);

  it('pads the value axis and snaps it to nice steps', () => {
    expect(scale.min).toBeLessThanOrEqual(36);
    expect(scale.max).toBeGreaterThanOrEqual(38.2);
    const steps = scale.ticks.map((t) => t.value);
    expect(steps[0]).toBe(scale.min);
    expect(steps.at(-1)).toBe(scale.max);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps.length).toBeLessThanOrEqual(7);
  });

  it('maps the first and last points to the edges of the plot area', () => {
    expect(scale.point(0, scale.min)).toEqual({ x: 30, y: 126 });
    expect(scale.point(14 * DAY, scale.max)).toEqual({ x: 322, y: 10 });
  });

  it('copes with a single point', () => {
    const single = chartScale([5 * DAY], [80], box);
    const p = single.point(5 * DAY, 80);
    expect(p.x).toBe(30);
    expect(p.y).toBeGreaterThan(10);
    expect(p.y).toBeLessThan(126);
  });
});

describe('linePath', () => {
  it('draws a path through the points', () => {
    expect(
      linePath([
        { x: 1, y: 2 },
        { x: 3.14159, y: 4 },
      ]),
    ).toBe('M1.0 2.0 L3.1 4.0');
    expect(linePath([])).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import { plateLoading } from '../plates';

describe('plateLoading', () => {
  it('breaks the load down into plates per side, heaviest first', () => {
    expect(plateLoading(60, 20)).toEqual({ bar: 20, perSide: [20], remainder: 0 });
    expect(plateLoading(87.5, 20)).toEqual({ bar: 20, perSide: [25, 5, 2.5, 1.25], remainder: 0 });
    expect(plateLoading(140, 20).perSide).toEqual([25, 25, 10]);
  });

  it('repeats a plate when needed', () => {
    expect(plateLoading(21, 20).perSide).toEqual([0.5]);
    expect(plateLoading(22, 20).perSide).toEqual([0.5, 0.5]);
  });

  it('returns no plates for the empty bar or less', () => {
    expect(plateLoading(20, 20)).toEqual({ bar: 20, perSide: [], remainder: 0 });
    expect(plateLoading(10, 20).perSide).toEqual([]);
  });

  it('reports what cannot be loaded with standard plates', () => {
    expect(plateLoading(20.5, 20)).toEqual({ bar: 20, perSide: [], remainder: 0.25 });
  });
});

import { describe, expect, it } from 'vitest';

import { bmi, bmiCategory, navyBodyFat } from '../bodyMetrics';

describe('navyBodyFat', () => {
  it('uses height, neck and waist for men', () => {
    // 495 / (1.0324 − 0.19077·log10(84 − 38) + 0.15456·log10(178)) − 450
    expect(navyBodyFat('male', 178, { neck: 38, waist: 84 })).toBe(15.7);
    expect(navyBodyFat('male', 178, { neck: 38, waist: 100 })).toBeGreaterThan(25);
  });

  it('also needs hips for women', () => {
    expect(navyBodyFat('female', 165, { neck: 32, waist: 70 })).toBeNull();
    const value = navyBodyFat('female', 165, { neck: 32, waist: 70, hips: 96 });
    expect(value).toBeGreaterThan(20);
    expect(value).toBeLessThan(30);
  });

  it('returns null when a measurement is missing', () => {
    expect(navyBodyFat('male', 178, { waist: 84 })).toBeNull();
    expect(navyBodyFat('male', 178, { neck: 38 })).toBeNull();
    expect(navyBodyFat('male', 0, { neck: 38, waist: 84 })).toBeNull();
  });

  it('rejects implausible results', () => {
    expect(navyBodyFat('male', 178, { neck: 40, waist: 40 })).toBeNull(); // log of zero
    expect(navyBodyFat('male', 178, { neck: 40, waist: 41 })).toBeNull(); // far below 2 %
    expect(navyBodyFat('male', 178, { neck: 30, waist: 200 })).toBeNull(); // above 60 %
  });
});

describe('bmi', () => {
  it('divides weight by height squared', () => {
    expect(bmi(80, 178)).toBeCloseTo(25.25, 2);
    expect(bmi(0, 178)).toBeNull();
    expect(bmi(80, 0)).toBeNull();
  });

  it.each([
    [17, 'under'],
    [18.5, 'normal'],
    [24.9, 'normal'],
    [25, 'over'],
    [29.9, 'over'],
    [30, 'high'],
  ] as const)('puts %f into the %s category', (value, category) => {
    expect(bmiCategory(value)).toBe(category);
  });
});

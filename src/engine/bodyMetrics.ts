import type { Sex } from './types';

export type Girths = {
  neck?: number | undefined;
  waist?: number | undefined;
  hips?: number | undefined;
};

/**
 * Body fat percentage by the US Navy circumference method, in centimetres.
 * Men need neck and waist, women also hips. Returns null when a measurement
 * is missing or the result is implausible (outside 2–60 %).
 */
export function navyBodyFat(sex: Sex, heightCm: number, girths: Girths): number | null {
  const { neck, waist, hips } = girths;
  if (!neck || !waist || !heightCm) return null;
  let percent: number;
  if (sex === 'female') {
    if (!hips) return null;
    percent =
      495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.221 * Math.log10(heightCm)) -
      450;
  } else {
    percent =
      495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  if (!Number.isFinite(percent) || percent <= 2 || percent >= 60) return null;
  return Math.round(percent * 10) / 10;
}

/** Body mass index: weight in kg divided by the square of the height in metres. */
export function bmi(kg: number, heightCm: number): number | null {
  if (!(kg > 0) || !(heightCm > 0)) return null;
  const metres = heightCm / 100;
  return kg / (metres * metres);
}

export type BmiCategory = 'under' | 'normal' | 'over' | 'high';

/** WHO categories for adults. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'under';
  if (value < 25) return 'normal';
  return value < 30 ? 'over' : 'high';
}

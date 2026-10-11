import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Exercise } from '@/data';
import type { IsoDate, OwnedEquipment } from '@/engine';

import { exerciseName } from './exercise';
import {
  capitalize,
  dateParts,
  type DateStyle,
  formatDate,
  formatNumber,
  formatSigned,
  weekdayNames,
} from './format';
import { type Locale, toLocale } from './locale';

/** The active locale, re-rendering the component when the language changes. */
export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return toLocale(i18n.language);
}

/** Locale-bound formatting helpers. */
export function useFormat() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      number: (value: number, maxDigits?: number) => formatNumber(value, locale, maxDigits),
      signed: (value: number, maxDigits?: number) => formatSigned(value, locale, maxDigits),
      date: (date: IsoDate, style?: DateStyle) => formatDate(date, locale, style),
      dateParts: (date: IsoDate) => dateParts(date, locale),
      weekdays: () => weekdayNames(locale),
      capitalize: (text: string) => capitalize(text, locale),
      exercise: (exercise: Exercise, owned: OwnedEquipment) =>
        exerciseName(exercise, locale, owned),
    }),
    [locale],
  );
}

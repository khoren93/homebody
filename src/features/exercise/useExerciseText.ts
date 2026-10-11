import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Exercise } from '@/data';
import { implementOf, type LoadedItem } from '@/engine';
import { photoMismatch } from '@/i18n/exercise';
import { useFormat } from '@/i18n/useFormat';
import { useAppStore } from '@/store';

/** Localized wording for exercises and prescriptions, shared by every screen. */
export function useExerciseText() {
  const { t } = useTranslation();
  const format = useFormat();
  const equipment = useAppStore((store) => store.state.equipment);

  return useMemo(() => {
    const muscleNames = (ids: readonly string[]) =>
      ids.map((id) => t(`muscles.${id as Exercise['primary'][number]}.name`)).join(', ');
    const handImplement = (exercise: Exercise) =>
      implementOf(exercise, equipment) === 'kb' ? 'kb' : 'db';

    return {
      name: (exercise: Exercise) => format.exercise(exercise, equipment),

      kind: (exercise: Exercise) =>
        t(exercise.compound ? 'exercise.compound' : 'exercise.isolation'),

      /** "quads · calves, glutes" */
      muscles: (exercise: Exercise) =>
        exercise.secondary.length > 0
          ? `${muscleNames(exercise.primary)} · ${muscleNames(exercise.secondary)}`
          : muscleNames(exercise.primary),

      primaryMuscles: (exercise: Exercise) => muscleNames(exercise.primary),

      /** "3 × 12" or "2 × 55 s" */
      dose: (item: Pick<LoadedItem, 'sets' | 'prescription'>) =>
        item.prescription.type === 'timed'
          ? t('exercise.setsSeconds', { sets: item.sets, seconds: item.prescription.seconds })
          : t('exercise.setsReps', { sets: item.sets, reps: item.prescription.reps }),

      /** "24 kg", or "2 × 24 kg" when there is one implement in each hand. */
      load: (exercise: Exercise, weight: number) =>
        t(exercise.loadMode === 'pair' ? 'exercise.pairLoad' : 'exercise.load', {
          weight: format.number(weight),
        }),

      /** Reminders about how the load is held: per hand, single implement, per side. */
      hints: (exercise: Exercise): string[] => {
        const hints: string[] = [];
        if (exercise.type === 'weighted' && exercise.loadMode === 'pair') {
          hints.push(t(`exercise.perHand.${handImplement(exercise)}`));
        }
        if (exercise.type === 'weighted' && exercise.loadMode === 'single') {
          hints.push(t(`exercise.single.${handImplement(exercise)}`));
        }
        if (exercise.unilateral) hints.push(t('exercise.perSide'));
        return hints;
      },

      /** Explains that the photos show a different implement, when they do. */
      photoNote: (exercise: Exercise): string | null => {
        const mismatch = photoMismatch(exercise, equipment);
        return mismatch ? t(`exercise.photoShows.${mismatch.shown}`) : null;
      },

      /** Technique steps in the UI language when translated, else in English. */
      instructions: (exercise: Exercise): { items: readonly string[]; lang: string } => {
        const localized = format.locale === 'ru' ? exercise.instructions.ru : undefined;
        return localized
          ? { items: localized, lang: format.locale }
          : { items: exercise.instructions.en, lang: 'en' };
      },

      /** "dumbbells + bench or kettlebell", or "no equipment". */
      equipment: (exercise: Exercise) =>
        exercise.equipment
          .map((alternative) =>
            alternative.length > 0
              ? alternative.map((id) => t(`equipment.${id}.inline`)).join(' + ')
              : t('equipment.none'),
          )
          .join(` ${t('common.or')} `),
    };
  }, [t, format, equipment]);
}

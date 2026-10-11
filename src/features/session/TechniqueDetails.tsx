import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Disclosure } from '@/components/Disclosure';
import { Muted, Row, Stack } from '@/components/Layout';
import type { Exercise } from '@/data';
import { type LoadedItem, slotAlternatives } from '@/engine';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { actions, CATALOG, useAppStore } from '@/store';

import styles from './TechniqueDetails.module.css';

/** Step-by-step technique, manual replacement and the option to exclude the exercise. */
export function TechniqueDetails({ exercise, item }: { exercise: Exercise; item: LoadedItem }) {
  const { t } = useTranslation();
  const text = useExerciseText();
  const equipment = useAppStore((store) => store.state.equipment);
  const excluded = useAppStore((store) => store.state.excluded);
  const swapped = useAppStore((store) => item.key in store.state.swaps);

  const steps = text.instructions(exercise);
  const alternatives = slotAlternatives(item, { equipment, excluded }, CATALOG);

  return (
    <Disclosure summary={t('session.swap.details')}>
      <ol className={styles.steps} lang={steps.lang}>
        {steps.items.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
      <Muted small>{t('exercise.source', { name: exercise.name.en })}</Muted>

      {alternatives.length > 1 && (
        <Stack gap={2} role="group" aria-label={t('session.swap.choose')}>
          <Muted small as="span">
            {t('session.swap.choose')}
          </Muted>
          <Row>
            {alternatives.map((alternative) => (
              <Button
                key={alternative.id}
                size="sm"
                variant={alternative.id === exercise.id ? 'primary' : 'default'}
                aria-pressed={alternative.id === exercise.id}
                onClick={() => actions.swapExercise(item.key, alternative.id)}
              >
                {text.name(alternative)}
              </Button>
            ))}
            {swapped && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => actions.swapExercise(item.key, null)}
              >
                {t('session.swap.auto')}
              </Button>
            )}
          </Row>
        </Stack>
      )}

      <Stack gap={2}>
        <Row>
          <Button size="sm" variant="danger" onClick={() => actions.excludeExercise(exercise.id)}>
            {t('session.swap.exclude')}
          </Button>
        </Row>
        <Muted small>{t('session.swap.excludeHint')}</Muted>
      </Stack>
    </Disclosure>
  );
}

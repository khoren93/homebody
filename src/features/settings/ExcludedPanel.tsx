import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Row } from '@/components/Layout';
import { Section } from '@/components/Section';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { actions, CATALOG, useAppStore } from '@/store';

/** Exercises the user removed from all workouts, each with a way back. */
export function ExcludedPanel() {
  const { t } = useTranslation();
  const text = useExerciseText();
  const excluded = useAppStore((store) => store.state.excluded);
  const exercises = Object.keys(excluded).flatMap((id) => CATALOG.byId.get(id) ?? []);
  if (exercises.length === 0) return null;

  return (
    <Section title={t('settings.excluded.title')} description={t('settings.excluded.about')}>
      <Row>
        {exercises.map((exercise) => (
          <Button
            key={exercise.id}
            size="sm"
            aria-label={t('settings.excluded.restore', { name: text.name(exercise) })}
            onClick={() => actions.restoreExercise(exercise.id)}
          >
            ↩ {text.name(exercise)}
          </Button>
        ))}
      </Row>
    </Section>
  );
}

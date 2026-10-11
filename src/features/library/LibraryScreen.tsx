import { useTranslation } from 'react-i18next';

import { Page } from '@/components/Layout';
import { MUSCLE_IDS, type MuscleId } from '@/data';
import { useFormat } from '@/i18n/useFormat';
import { navigate } from '@/lib/router';
import { CATALOG } from '@/store';

import { ExerciseBrowser } from './ExerciseBrowser';
import styles from './LibraryScreen.module.css';

export function LibraryScreen({ muscle }: { muscle?: MuscleId | undefined }) {
  const { t } = useTranslation();
  const format = useFormat();

  const chooseMuscle = (next: MuscleId) =>
    navigate(next === muscle ? { name: 'library' } : { name: 'library', muscle: next }, {
      replace: true,
    });

  return (
    <Page>
      <ExerciseBrowser title={t('nav.library')} muscle={muscle}>
        <div className={styles.muscles} role="group" aria-label={t('library.muscles')}>
          {MUSCLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.muscle}
              aria-pressed={id === muscle}
              onClick={() => chooseMuscle(id)}
            >
              {format.capitalize(t(`muscles.${id}.name`))}{' '}
              <span className={styles.muscleCount}>
                {CATALOG.list.filter((exercise) => exercise.primary.includes(id)).length}
              </span>
            </button>
          ))}
        </div>
      </ExerciseBrowser>
    </Page>
  );
}

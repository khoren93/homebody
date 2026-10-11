import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Disclosure } from '@/components/Disclosure';
import { Muted, Num, Page } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { ScreenTitle } from '@/components/ScreenTitle';
import { CATALOG, planExerciseIds, useAppStore, usePlan } from '@/store';

import { ExerciseProgress } from './ExerciseProgress';
import styles from './ProgressScreen.module.css';

export function ProgressScreen() {
  const { t } = useTranslation();
  const { plan } = usePlan();
  const block = useAppStore((store) => store.state.block);
  const exercises = planExerciseIds(plan).flatMap((id) => CATALOG.byId.get(id) ?? []);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const expandedId = exercises.some((e) => e.id === selected) ? selected : exercises[0]?.id;

  return (
    <Page>
      <ScreenTitle title={t('nav.progress')} intro={t('progress.subtitle', { block })} />

      {exercises.length === 0 ? (
        <Panel>
          <p>{t('progress.empty')}</p>
        </Panel>
      ) : (
        <ul className={styles.list}>
          {exercises.map((exercise) => (
            <li key={exercise.id}>
              <ExerciseProgress
                exercise={exercise}
                sessions={plan.sessions}
                expanded={exercise.id === expandedId}
                onExpand={() => setSelected(exercise.id)}
                edited={plan.capacity[exercise.id]?.source === 'edit'}
              />
            </li>
          ))}
        </ul>
      )}

      <Panel className={styles.explainer}>
        <Disclosure summary={t('progress.explainTitle')}>
          <p>{t('progress.explainBody')}</p>
          <Num className={styles.formula}>{t('progress.explainFormula')}</Num>
          <p>{t('progress.explainExample')}</p>
          <p>{t('progress.explainWhy')}</p>
        </Disclosure>
      </Panel>
      <Muted small>{t('progress.intro')}</Muted>
    </Page>
  );
}

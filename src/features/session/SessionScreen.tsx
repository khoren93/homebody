import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { IconLink } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Muted, Page } from '@/components/Layout';
import type { IsoDate, LoadedSession } from '@/engine';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { useSessionLabels } from '@/features/plan/useSessionLabels';
import { useFormat } from '@/i18n/useFormat';
import { navigate, routeHref } from '@/lib/router';
import { CATALOG, useAppStore, usePlan } from '@/store';

import { EffortNote } from './EffortNote';
import { ExerciseCard, RandomSwapButton } from './ExerciseCard';
import styles from './SessionScreen.module.css';
import { useRandomSwap } from './useRandomSwap';

export function SessionScreen({ sessionId }: { sessionId: IsoDate }) {
  const { plan } = usePlan();
  const session = plan.sessions.find((candidate) => candidate.id === sessionId);

  // A session can disappear when the schedule changes; go back to the plan then.
  useEffect(() => {
    if (!session) navigate({ name: 'plan' }, { replace: true });
  }, [session]);

  return session ? <Workout session={session} /> : null;
}

function Workout({ session }: { session: LoadedSession }) {
  const { t } = useTranslation();
  const format = useFormat();
  const labels = useSessionLabels();
  const text = useExerciseText();
  const randomSwap = useRandomSwap(session);
  const done = useAppStore((store) => !!store.state.done[session.id]);
  const totalSets = session.items.reduce((sum, item) => sum + item.sets, 0);

  return (
    <Page>
      <header className={styles.header}>
        <IconLink href={routeHref({ name: 'plan' })} label={t('session.back')}>
          <Icon name="back" />
        </IconLink>
        <div className={styles.titles}>
          <h1 className={styles.title}>{labels.name(session)}</h1>
          <p className={styles.summary}>
            {t('session.summary', {
              week: session.week + 1,
              phase: labels.phase(session),
              sets: t('session.workingSets', { count: totalSets }),
            })}
            {done && ` · ${t('session.doneMark')}`}
          </p>
        </div>
      </header>

      <Muted small>
        {labels.focus(session)} · {format.date(session.date)} ·{' '}
        {t('plan.hero.about', { minutes: session.minutes })}
      </Muted>
      <EffortNote session={session} />
      <Muted small>{t('session.warmup')}</Muted>

      {session.items.map((item, index) => {
        const exercise = CATALOG.byId.get(item.exerciseId);
        if (!exercise) return null;
        const undo = randomSwap.undoFor(item);
        const replaced = undo && CATALOG.byId.get(undo.from);
        return (
          <ExerciseCard
            key={item.key}
            exercise={exercise}
            item={item}
            session={session}
            index={index + 1}
            swap={
              <RandomSwapButton
                options={randomSwap.optionCount(item)}
                onClick={() => randomSwap.swap(item)}
              />
            }
            notice={
              undo &&
              replaced && (
                <Banner
                  role="status"
                  tone="info"
                  actions={
                    <button type="button" className={styles.undo} onClick={randomSwap.undo}>
                      {t('common.undo')}
                    </button>
                  }
                >
                  {t('session.swap.done', {
                    from: t('common.quote', { text: text.name(replaced) }),
                    session: t('common.quote', { text: labels.name(session) }),
                  })}
                </Banner>
              )
            }
          />
        );
      })}
    </Page>
  );
}

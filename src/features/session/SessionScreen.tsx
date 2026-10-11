import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Muted, Page, Stack } from '@/components/Layout';
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
      <a className={styles.back} href={routeHref({ name: 'plan' })}>
        ← {t('session.back')}
      </a>

      <Stack gap={1} as="header">
        <span className={styles.eyebrow}>
          {t('session.eyebrow', { week: session.week + 1, phase: labels.phase(session) })}
          {done && ` · ${t('session.doneMark')}`}
        </span>
        <h1>{labels.name(session)}</h1>
        <p>{labels.focus(session)}</p>
        <Muted>
          {t('session.meta', {
            date: format.date(session.date),
            minutes: session.minutes,
            sets: t('session.workingSets', { count: totalSets }),
          })}
        </Muted>
      </Stack>

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
              <>
                {undo && replaced && (
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
                )}
                <RandomSwapButton
                  options={randomSwap.optionCount(item)}
                  onClick={() => randomSwap.swap(item)}
                />
              </>
            }
          />
        );
      })}
    </Page>
  );
}

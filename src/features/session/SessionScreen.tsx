import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Button, IconLink } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Muted, Page } from '@/components/Layout';
import { ProgressRing } from '@/components/ProgressRing';
import { SetTracker } from '@/components/SetTracker';
import type { IsoDate, LoadedItem, LoadedSession } from '@/engine';
import { nextOccurrence } from '@/engine';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { MissedBanner } from '@/features/plan/MissedBanner';
import { useSessionLabels } from '@/features/plan/useSessionLabels';
import { useFormat } from '@/i18n/useFormat';
import { cx } from '@/lib/cx';
import { navigate, routeHref } from '@/lib/router';
import { useToday } from '@/lib/useToday';
import { useWakeLock } from '@/lib/useWakeLock';
import {
  actions,
  CATALOG,
  completedSets,
  isMissed,
  sessionProgress,
  useAppStore,
  usePlan,
} from '@/store';

import { EffortNote } from './EffortNote';
import { EffortRating } from './EffortRating';
import { ExerciseCard, RandomSwapButton } from './ExerciseCard';
import { RestTimer } from './RestTimer';
import styles from './SessionScreen.module.css';
import { useRandomSwap } from './useRandomSwap';
import { useRestTimer } from './useRestTimer';

export function SessionScreen({ sessionId }: { sessionId: IsoDate }) {
  const { plan } = usePlan();
  const session = plan.sessions.find((candidate) => candidate.id === sessionId);

  // A session can disappear when the schedule changes; go back to the plan then.
  useEffect(() => {
    if (!session) navigate({ name: 'plan' }, { replace: true });
  }, [session]);

  return session ? <Workout session={session} sessions={plan.sessions} /> : null;
}

function Workout({
  session,
  sessions,
}: {
  session: LoadedSession;
  sessions: readonly LoadedSession[];
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const labels = useSessionLabels();
  const text = useExerciseText();
  const randomSwap = useRandomSwap(session);
  const rest = useRestTimer();
  const today = useToday();
  const done = useAppStore((store) => !!store.state.done[session.id]);
  const skipped = useAppStore((store) => !!store.state.skipped[session.id]);
  const missed = useAppStore((store) => isMissed(session, store.state, today));
  const setLogs = useAppStore((store) => store.setLogs);
  const overrides = useAppStore((store) => store.state.overrides);
  const progress = sessionProgress(session, setLogs);
  useWakeLock(true);

  const tickSet = (item: LoadedItem, index: number) => {
    const wasDone = !!setLogs[session.id]?.[item.exerciseId]?.[index];
    actions.toggleSet(session.id, item.exerciseId, index);
    if (wasDone) return;

    // Work out what comes after the rest from the updated ticks.
    const logs = useAppStore.getState().setLogs;
    const left = (candidate: LoadedItem) =>
      candidate.sets - completedSets(logs, session.id, candidate);
    const next = left(item) > 0 ? item : session.items.find((candidate) => left(candidate) > 0);
    const exercise = next && CATALOG.byId.get(next.exerciseId);
    if (!next || !exercise) {
      rest.stop();
      return;
    }
    const n = next.sets - left(next) + 1;
    const dose = text.setDose(exercise, next);
    rest.start(
      item.rest,
      next === item
        ? { title: t('session.timer.sameExercise', { n, total: next.sets }), detail: dose }
        : {
            title: t('session.timer.nextExercise', { name: text.name(exercise) }),
            detail: t('session.timer.nextSet', { n, total: next.sets, dose }),
          },
    );
  };

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Page className={cx(rest.state && styles.withTimer)}>
      <header className={styles.header}>
        <IconLink href={routeHref({ name: 'plan' })} label={t('session.back')}>
          <Icon name="back" />
        </IconLink>
        <div className={styles.titles}>
          <h1 className={styles.title}>{labels.name(session)}</h1>
          <p className={styles.summary}>
            {progress.done >= progress.total
              ? t('session.progress.allDone', { total: progress.total })
              : t('session.progress.set', { current: progress.done + 1, total: progress.total })}
            {done && ` · ${t('session.doneMark')}`}
          </p>
        </div>
        <ProgressRing
          value={progress.done}
          max={progress.total}
          label={t('session.progress.ring', { percent })}
        />
      </header>

      <Muted small>
        {t('session.summary', {
          week: session.week + 1,
          phase: labels.phase(session),
          sets: t('session.workingSets', { count: progress.total }),
        })}{' '}
        · {labels.focus(session)} · {format.date(session.date)} ·{' '}
        {t('plan.hero.about', { minutes: session.minutes })}
      </Muted>

      {missed && (
        <MissedBanner session={session} sessions={sessions} today={today} context="session" />
      )}
      {skipped && (
        <Banner
          role="status"
          actions={
            <Button size="sm" onClick={() => actions.unskipSession(session.id)}>
              {t('missed.restore')}
            </Button>
          }
        >
          <strong>{t('missed.skippedTitle')}</strong> {t('missed.skippedBody')}
        </Banner>
      )}

      <EffortNote session={session} />
      <Muted small>{t('session.warmup')}</Muted>

      {session.items.map((item, index) => {
        const exercise = CATALOG.byId.get(item.exerciseId);
        if (!exercise) return null;
        const undo = randomSwap.undoFor(item);
        const replaced = undo && CATALOG.byId.get(undo.from);
        const ticks = Array.from(
          { length: item.sets },
          (_, set) => !!setLogs[session.id]?.[item.exerciseId]?.[set],
        );
        const rating = overrides[`${item.exerciseId}|${session.id}`]?.rating;
        const upcoming = nextOccurrence(sessions, session.id, item.exerciseId);
        const upcomingDose =
          upcoming &&
          [
            text.dose(upcoming.item),
            upcoming.item.prescription.type === 'weighted'
              ? text.load(exercise, upcoming.item.prescription.weight)
              : null,
          ]
            .filter(Boolean)
            .join(' · ');

        return (
          <ExerciseCard
            key={item.key}
            exercise={exercise}
            item={item}
            session={session}
            index={index + 1}
            complete={ticks.every(Boolean)}
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
          >
            <SetTracker
              done={ticks}
              label={t('session.sets.label')}
              setLabel={(state, n) => t(`session.sets.${state}`, { n })}
              onToggle={(set) => tickSet(item, set)}
            />
            <EffortRating
              value={rating}
              onRate={(value) => actions.rateExercise(item.exerciseId, session.id, value)}
            />
            {upcoming && (rating !== undefined || item.prescription.edited) && (
              <Muted small>
                {t('session.nextTime', {
                  date: format.date(upcoming.session.date),
                  dose: upcomingDose,
                })}
                {rating === 'fail' && ` ${t('session.failHint')}`}
              </Muted>
            )}
          </ExerciseCard>
        );
      })}

      <Button
        variant={done ? 'default' : 'primary'}
        block
        aria-pressed={done}
        onClick={() => actions.toggleSessionDone(session.id)}
      >
        {t(done ? 'session.finish.marked' : 'session.finish.markDone')}
      </Button>

      {rest.state && <RestTimer timer={rest.state} onAdjust={rest.adjust} onStop={rest.stop} />}
    </Page>
  );
}

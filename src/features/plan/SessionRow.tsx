import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/Chip';
import { DateBadge } from '@/components/DateBadge';
import { Tick } from '@/components/Tick';
import type { IsoDate, LoadedSession } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { cx } from '@/lib/cx';
import { routeHref } from '@/lib/router';
import { actions, isMissed, sessionProgress, useAppStore } from '@/store';

import styles from './SessionRow.module.css';
import { useSessionLabels } from './useSessionLabels';

/** One session in the plan: opens the workout, and can be ticked off directly. */
export function SessionRow({ session, today }: { session: LoadedSession; today: IsoDate }) {
  const { t } = useTranslation();
  const format = useFormat();
  const labels = useSessionLabels();
  const done = useAppStore((store) => !!store.state.done[session.id]);
  const skipped = useAppStore((store) => !!store.state.skipped[session.id]);
  const missed = useAppStore((store) => isMissed(session, store.state, today));
  const progress = useAppStore((store) => sessionProgress(session, store.setLogs).done);
  const total = session.items.reduce((sum, item) => sum + item.sets, 0);
  const started = progress > 0 && !done && !skipped;

  const summary = [
    started ? t('plan.session.partial', { done: progress, total }) : null,
    t('units.exercises', { count: session.items.length }),
    t('units.sets', { count: total }),
    t('plan.session.about', { minutes: session.minutes }),
  ].filter(Boolean);

  return (
    <li
      className={cx(
        styles.row,
        (done || skipped) && styles.finished,
        missed && styles.missed,
        session.date === today && styles.today,
      )}
    >
      <a className={styles.link} href={routeHref({ name: 'session', sessionId: session.id })}>
        <DateBadge date={session.date} />
        <span className={styles.text}>
          <span className={styles.title}>
            <strong>{labels.name(session)}</strong>
            {missed && (
              <Chip tone="accent">
                {t(started ? 'plan.session.unfinished' : 'plan.session.missed')}
              </Chip>
            )}
            {skipped && <Chip>{t('plan.session.skipped')}</Chip>}
            {session.shift > 0 && <Chip tone="accent">{t('plan.session.moved')}</Chip>}
          </span>
          <span className={styles.focus}>{labels.focus(session)}</span>
          <span className={styles.summary}>{summary.join(' · ')}</span>
        </span>
      </a>
      <Tick
        checked={done}
        onChange={() => actions.toggleSessionDone(session.id)}
        label={t('plan.session.markDone', {
          name: labels.name(session),
          date: format.date(session.date),
        })}
      />
    </li>
  );
}

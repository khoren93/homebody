import { useTranslation } from 'react-i18next';

import { addDays, type IsoDate, type LoadedSession, weekday } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { cx } from '@/lib/cx';
import { routeHref } from '@/lib/router';
import { isFinished, useAppStore } from '@/store';

import { useSessionLabels } from './useSessionLabels';
import styles from './WeekStrip.module.css';

/** The current week at a glance: today, and the days that have a session. */
export function WeekStrip({
  sessions,
  today,
}: {
  sessions: readonly LoadedSession[];
  today: IsoDate;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const labels = useSessionLabels();
  const flags = useAppStore((store) => store.state);
  const monday = addDays(today, -weekday(today));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <ol className={styles.strip} aria-label={t('plan.weekStrip.label')}>
      {days.map((date) => {
        const session = sessions.find((candidate) => candidate.date === date);
        const parts = format.dateParts(date);
        const content = (
          <>
            <span className={styles.weekday}>{parts.weekday}</span>
            <span className={styles.number}>{parts.day}</span>
            <span
              className={cx(
                styles.dot,
                session && styles.planned,
                session && isFinished(flags, session.id) && styles.finished,
              )}
            />
          </>
        );
        const className = cx(styles.day, date === today && styles.today);
        return (
          <li key={date}>
            {session ? (
              <a
                className={className}
                href={routeHref({ name: 'session', sessionId: session.id })}
                aria-label={t('plan.weekStrip.session', {
                  date: format.date(date),
                  name: labels.name(session),
                })}
                aria-current={date === today ? 'date' : undefined}
              >
                {content}
              </a>
            ) : (
              <span
                className={className}
                aria-label={t('plan.weekStrip.rest', { date: format.date(date) })}
                aria-current={date === today ? 'date' : undefined}
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

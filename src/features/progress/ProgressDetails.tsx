import { useTranslation } from 'react-i18next';

import { ChartLegend, TsChart } from '@/components/chart/TsChart';
import { Muted } from '@/components/Layout';
import type { Exercise } from '@/data';
import type { HistoryEntry, LoadedSession } from '@/engine';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { useFormat } from '@/i18n/useFormat';
import { cx } from '@/lib/cx';
import { routeHref } from '@/lib/router';

import styles from './ProgressDetails.module.css';
import { useExerciseProgress } from './useExerciseProgress';

type Props = {
  exercise: Exercise;
  sessions: readonly LoadedSession[];
  /** A session to highlight in the table; defaults to the next one that is due. */
  currentSessionId?: string;
};

/** Chart, history summary and the session-by-session table of one exercise. */
export function ProgressDetails({ exercise, sessions, currentSessionId }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const text = useExerciseText();
  const progress = useExerciseProgress(exercise, sessions);
  const { series, summary, rows } = progress;
  const highlighted = currentSessionId ?? progress.nextSessionId;
  const weighted = exercise.type === 'weighted';
  const showChart = series.actual.length > 0 || series.planned.length > 1;

  const result = (entry: HistoryEntry) => {
    if (exercise.type === 'timed') return t('progress.result.timed', { seconds: entry.reps });
    if (!weighted || entry.weight === null) return t('progress.result.reps', { count: entry.reps });
    return t('progress.result.weighted', {
      load: text.load(exercise, entry.weight),
      reps: entry.reps,
    });
  };

  return (
    <>
      {showChart && (
        <>
          <TsChart
            label={t('progress.chartLabel', { name: text.name(exercise) })}
            area
            marker={{ date: progress.today, label: t('progress.today') }}
            series={[
              { points: series.actual, kind: 'solid' },
              { points: series.planned, kind: 'dashed' },
            ]}
          />
          <ChartLegend solid={t('progress.legend.done')} dashed={t('progress.legend.plan')} />
        </>
      )}

      {summary && (
        <Muted small>
          {[
            t('progress.summary.sessions', { count: summary.sessions }),
            t('progress.summary.last', { value: result(summary.last) }),
            t('progress.summary.best', { value: result(summary.best) }),
          ].join(' · ')}
        </Muted>
      )}

      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>
            {t('progress.table.caption', { name: text.name(exercise) })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('progress.table.date')}</th>
              <th scope="col">{t('progress.table.sets')}</th>
              {weighted && <th scope="col">{t('progress.table.load')}</th>}
              <th scope="col" className={styles.end}>
                {t(weighted ? 'progress.table.e1rm' : 'progress.table.limit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ session, item }) => {
              const p = item.prescription;
              return (
                <tr
                  key={session.id}
                  className={cx(
                    session.id === highlighted && styles.current,
                    session.deload && styles.deload,
                    p.edited && styles.edited,
                  )}
                  aria-current={session.id === highlighted ? 'true' : undefined}
                >
                  <th scope="row">
                    <a href={routeHref({ name: 'session', sessionId: session.id })}>
                      {format.date(session.date, 'dayMonth')}
                      {session.deload && ` · ${t('progress.table.deload')}`}
                    </a>
                  </th>
                  <td>{text.dose(item)}</td>
                  {weighted && (
                    <td>{p.type === 'weighted' ? text.load(exercise, p.weight) : ''}</td>
                  )}
                  <td className={styles.end}>
                    {weighted
                      ? format.number(Math.round(p.capacity * 2) / 2)
                      : Math.round(p.capacity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

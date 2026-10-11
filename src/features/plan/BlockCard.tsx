import { useTranslation } from 'react-i18next';

import { Num } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { type IsoDate, type LoadedSession, sessionPhase } from '@/engine';
import { cx } from '@/lib/cx';
import { isFinished, useAppStore } from '@/store';

import styles from './BlockCard.module.css';

/** Above this many weeks the phase labels no longer fit under the segments. */
const MAX_LABELLED_WEEKS = 6;

/** Where the user is in the block: one segment per week, filled as sessions get done. */
export function BlockCard({
  sessions,
  today,
}: {
  sessions: readonly LoadedSession[];
  today: IsoDate;
}) {
  const { t } = useTranslation();
  const block = useAppStore((store) => store.state.block);
  const weeksPlanned = useAppStore((store) => store.state.schedule.weeks);
  const flags = useAppStore((store) => store.state);

  const weeks = [...new Set(sessions.map((session) => session.week))].map((week) => {
    const inWeek = sessions.filter((session) => session.week === week);
    const done = inWeek.filter((session) => isFinished(flags, session.id)).length;
    const first = inWeek[0];
    const last = inWeek.at(-1);
    return {
      week,
      total: inWeek.length,
      done,
      phase: first ? sessionPhase(first) : ('working' as const),
      current:
        !!first && !!last && first.date <= today && today <= last.date && done < inWeek.length,
    };
  });
  const doneTotal = sessions.filter((session) => flags.done[session.id]).length;
  // Without a week in progress, the first unfinished week is the one to look at.
  const currentWeek =
    weeks.find((w) => w.current)?.week ?? weeks.find((w) => w.done < w.total)?.week;

  return (
    <Panel aria-labelledby="block-title">
      <div className={styles.head}>
        <h2 id="block-title" className={styles.title}>
          {t('plan.blockCard.title', { block, weeks: t('units.weeks', { count: weeksPlanned }) })}
        </h2>
        <Num className={styles.done}>
          {t('plan.blockCard.done', { done: doneTotal, total: sessions.length })}
        </Num>
      </div>
      <ol
        className={styles.weeks}
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((w) => {
          const complete = w.done === w.total;
          const phase = t(`phaseShort.${w.phase}`);
          return (
            <li
              key={w.week}
              className={styles.week}
              aria-label={t('plan.blockCard.weekLabel', {
                week: w.week + 1,
                phase,
                done: w.done,
                total: w.total,
              })}
              aria-current={w.week === currentWeek ? 'step' : undefined}
            >
              <span className={cx(styles.track, complete && styles.complete)} aria-hidden="true">
                {!complete && (
                  <span
                    className={styles.fill}
                    style={{ inlineSize: `${(w.done / w.total) * 100}%` }}
                  />
                )}
              </span>
              {weeks.length <= MAX_LABELLED_WEEKS && (
                <span className={styles.label} aria-hidden="true">
                  {phase}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

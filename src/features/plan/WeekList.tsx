import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/Chip';
import { Row, Stack } from '@/components/Layout';
import type { IsoDate, LoadedSession } from '@/engine';

import { SessionRow } from './SessionRow';
import { useSessionLabels } from './useSessionLabels';
import styles from './WeekList.module.css';

/** Every session of the plan, grouped by week. */
export function WeekList({
  sessions,
  today,
}: {
  sessions: readonly LoadedSession[];
  today: IsoDate;
}) {
  const { t } = useTranslation();
  const labels = useSessionLabels();
  const weeks = [...new Set(sessions.map((session) => session.week))];

  return (
    <>
      {weeks.map((week) => {
        const inWeek = sessions.filter((session) => session.week === week);
        const first = inWeek[0];
        if (!first) return null;
        const headingId = `week-${week}`;
        return (
          <Stack key={week} gap={2} as="section" aria-labelledby={headingId}>
            <Row justify="between" align="baseline">
              <h3 id={headingId}>{t('plan.week', { week: week + 1 })}</h3>
              <Chip tone={first.deload ? 'good' : first.rir === 1 ? 'accent' : 'neutral'}>
                {labels.effort(first)}
              </Chip>
            </Row>
            <ul className={styles.sessions}>
              {inWeek.map((session) => (
                <SessionRow key={session.id} session={session} today={today} />
              ))}
            </ul>
          </Stack>
        );
      })}
    </>
  );
}

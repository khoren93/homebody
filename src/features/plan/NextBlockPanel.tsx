import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Row } from '@/components/Layout';
import { Section } from '@/components/Section';
import type { IsoDate, LoadedSession } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { actions, isBlockOver, useAppStore } from '@/store';

/** Explains what the next block is and starts it after a confirmation. */
export function NextBlockPanel({
  sessions,
  today,
}: {
  sessions: readonly LoadedSession[];
  today: IsoDate;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const [confirming, setConfirming] = useState(false);
  const weeks = useAppStore((store) => store.state.schedule.weeks);
  const block = useAppStore((store) => store.state.block);
  const over = useAppStore((store) => isBlockOver(sessions, store.state, today));
  const last = sessions.at(-1);
  if (!last) return null;

  const description = [
    t(over ? 'plan.nextBlock.ended' : 'plan.nextBlock.pending'),
    t('plan.nextBlock.body', {
      weeks: t('units.weeks', { count: weeks }),
      date: format.date(last.date),
    }),
  ].join(' ');

  return (
    <Section title={t('plan.nextBlock.title')} description={description}>
      <Row>
        {confirming ? (
          <>
            <Button
              variant="primary"
              onClick={() => {
                actions.startNextBlock(today);
                setConfirming(false);
                window.scrollTo(0, 0);
              }}
            >
              {t('plan.nextBlock.confirm', { block: block + 1 })}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
          </>
        ) : (
          <Button variant={over ? 'primary' : 'default'} onClick={() => setConfirming(true)}>
            {t('plan.nextBlock.start')}
          </Button>
        )}
      </Row>
    </Section>
  );
}

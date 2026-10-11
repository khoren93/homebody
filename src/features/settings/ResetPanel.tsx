import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Muted, Row } from '@/components/Layout';
import { Section } from '@/components/Section';
import { useToday } from '@/lib/useToday';
import { actions, resetAllData, resetPhotos, useAppStore } from '@/store';

type Confirming = 'adjustments' | 'everything' | null;

/** Returns to the automatic calculation, or erases everything on the device. Both ask first. */
export function ResetPanel() {
  const { t } = useTranslation();
  const today = useToday();
  const [confirming, setConfirming] = useState<Confirming>(null);
  const edits = useAppStore((store) => Object.keys(store.state.overrides).length);
  const swaps = useAppStore((store) => Object.keys(store.state.swaps).length);
  const carried = useAppStore((store) => Object.keys(store.state.carried).length);
  const done = useAppStore((store) => Object.keys(store.state.done).length);
  const scaled = useAppStore((store) => store.state.loadScale !== 1);
  const nothingToReset = edits + swaps + carried === 0 && !scaled;

  const cancel = (
    <Button variant="ghost" onClick={() => setConfirming(null)}>
      {t('common.cancel')}
    </Button>
  );

  return (
    <Section title={t('reset.title')}>
      <Muted small>{t('reset.counts', { edits, swaps, carried, done })}</Muted>
      <Muted small>{t('reset.about')}</Muted>
      <Row>
        {confirming === 'adjustments' ? (
          <>
            <Button
              variant="danger"
              onClick={() => {
                actions.resetAdjustments();
                setConfirming(null);
              }}
            >
              {t('reset.confirm')}
            </Button>
            {cancel}
          </>
        ) : (
          <Button disabled={nothingToReset} onClick={() => setConfirming('adjustments')}>
            {t('reset.action')}
          </Button>
        )}
      </Row>

      <Muted small>{t('reset.eraseAbout')}</Muted>
      <Row>
        {confirming === 'everything' ? (
          <>
            <Button
              variant="danger"
              onClick={() => {
                void resetAllData(today).then(resetPhotos);
                setConfirming(null);
              }}
            >
              {t('reset.eraseConfirm')}
            </Button>
            {cancel}
          </>
        ) : (
          <Button variant="danger" onClick={() => setConfirming('everything')}>
            {t('reset.erase')}
          </Button>
        )}
      </Row>
    </Section>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Muted, Row, Stack } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { toIsoDate } from '@/engine';
import { resetAllData } from '@/store';

import styles from './StatusScreens.module.css';

/** Shown while the stored data is being read. */
export function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className={styles.center} role="status">
      {t('common.loading')}
    </div>
  );
}

/**
 * Shown when the stored data cannot be read. Nothing is overwritten until the
 * user explicitly chooses to start over.
 */
export function LoadErrorScreen({ message }: { message: string | null }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.center}>
      <Panel role="alert">
        <Stack gap={3}>
          <h1>{t('loadError.title')}</h1>
          <p>{t('loadError.body')}</p>
          {message && <Muted small>{t('loadError.details', { message })}</Muted>}
          <Row>
            {confirming ? (
              <>
                <Button variant="danger" onClick={() => void resetAllData(toIsoDate(new Date()))}>
                  {t('loadError.confirm')}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                {t('loadError.reset')}
              </Button>
            )}
          </Row>
        </Stack>
      </Panel>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';

import { usePwaStore } from './pwa';

/** Tells the user that a new version is waiting and lets them switch to it. */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const updateReady = usePwaStore((store) => store.updateReady);
  const applyUpdate = usePwaStore((store) => store.applyUpdate);
  if (!updateReady) return null;

  return (
    <Banner
      role="status"
      tone="info"
      actions={
        <Button size="sm" onClick={applyUpdate}>
          {t('shell.reload')}
        </Button>
      }
    >
      {t('shell.updateReady')}
    </Banner>
  );
}

import { useTranslation } from 'react-i18next';

import { Page } from '@/components/Layout';
import { ScreenTitle } from '@/components/ScreenTitle';

export function ProgressScreen() {
  const { t } = useTranslation();
  return (
    <Page>
      <ScreenTitle title={t('nav.progress')} intro={t('common.comingSoon')} />
    </Page>
  );
}

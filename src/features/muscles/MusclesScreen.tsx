import { useTranslation } from 'react-i18next';

import { Page } from '@/components/Layout';
import { ScreenTitle } from '@/components/ScreenTitle';

export function MusclesScreen() {
  const { t } = useTranslation();
  return (
    <Page>
      <ScreenTitle title={t('nav.muscles')} intro={t('common.comingSoon')} />
    </Page>
  );
}

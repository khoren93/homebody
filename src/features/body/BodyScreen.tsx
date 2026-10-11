import { useTranslation } from 'react-i18next';

import { Page } from '@/components/Layout';
import { ScreenTitle } from '@/components/ScreenTitle';

export function BodyScreen() {
  const { t } = useTranslation();
  return (
    <Page>
      <ScreenTitle title={t('nav.body')} intro={t('common.comingSoon')} />
    </Page>
  );
}

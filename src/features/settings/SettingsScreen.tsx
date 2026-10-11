import { useTranslation } from 'react-i18next';

import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Page } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { ScreenTitle } from '@/components/ScreenTitle';
import { ThemeSwitch } from '@/components/ThemeSwitch';

export function SettingsScreen() {
  const { t } = useTranslation();
  return (
    <Page>
      <ScreenTitle title={t('nav.settings')} />
      <Panel aria-labelledby="settings-appearance">
        <h2 id="settings-appearance">{t('settings.appearance')}</h2>
        <LanguageSwitch />
        <ThemeSwitch />
      </Panel>
    </Page>
  );
}

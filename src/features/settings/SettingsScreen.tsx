import { useTranslation } from 'react-i18next';

import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Muted, Page } from '@/components/Layout';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Section } from '@/components/Section';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useAppStore } from '@/store';

import { BackupPanel } from './BackupPanel';
import { EquipmentPanel } from './EquipmentPanel';
import { ExcludedPanel } from './ExcludedPanel';
import { LoadScalePanel } from './LoadScalePanel';
import { ProfilePanel } from './ProfilePanel';
import { ResetPanel } from './ResetPanel';
import { SchedulePanel } from './SchedulePanel';

export function SettingsScreen() {
  const { t } = useTranslation();
  const storage = useAppStore((store) => store.storage);
  return (
    <Page>
      <ScreenTitle title={t('nav.settings')} intro={t('settings.intro')} />
      <ProfilePanel />
      <LoadScalePanel />
      <SchedulePanel />
      <EquipmentPanel />
      <ExcludedPanel />
      <BackupPanel />
      <ResetPanel />
      <Section title={t('settings.appearance')}>
        <LanguageSwitch />
        <ThemeSwitch />
      </Section>
      <Muted small>
        {storage === 'indexeddb' && `${t('shell.savedLocally')}. `}
        {t('settings.about')}
      </Muted>
    </Page>
  );
}

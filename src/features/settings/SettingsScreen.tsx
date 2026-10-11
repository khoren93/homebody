import { useTranslation } from 'react-i18next';

import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Muted, Page } from '@/components/Layout';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Section } from '@/components/Section';
import { ThemeSwitch } from '@/components/ThemeSwitch';

import { EquipmentPanel } from './EquipmentPanel';
import { LoadScalePanel } from './LoadScalePanel';
import { ProfilePanel } from './ProfilePanel';
import { SchedulePanel } from './SchedulePanel';

export function SettingsScreen() {
  const { t } = useTranslation();
  return (
    <Page>
      <ScreenTitle title={t('nav.settings')} intro={t('settings.intro')} />
      <ProfilePanel />
      <LoadScalePanel />
      <SchedulePanel />
      <EquipmentPanel />
      <Section title={t('settings.appearance')}>
        <LanguageSwitch />
        <ThemeSwitch />
      </Section>
      <Muted small>{t('settings.about')}</Muted>
    </Page>
  );
}

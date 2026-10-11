import { useTranslation } from 'react-i18next';

import { LOCALE_NAMES, LOCALES, setLocale } from '@/i18n';
import { useLocale } from '@/i18n/useFormat';

import { Segmented } from './Segmented';

/** Lets the user pick the UI language. The choice is remembered on the device. */
export function LanguageSwitch() {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <Segmented
      legend={t('language.label')}
      showLegend
      value={locale}
      onChange={(next) => void setLocale(next)}
      options={LOCALES.map((code) => ({
        value: code,
        label: <span lang={code}>{LOCALE_NAMES[code]}</span>,
      }))}
    />
  );
}

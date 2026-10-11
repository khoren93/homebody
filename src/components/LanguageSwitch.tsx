import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { type Locale, LOCALE_NAMES, LOCALES, setLocale } from '@/i18n';
import { useLocale } from '@/i18n/useFormat';

/** Lets the user pick the UI language. The choice is remembered on the device. */
export function LanguageSwitch() {
  const { t } = useTranslation();
  const locale = useLocale();
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>{t('language.label')}</label>{' '}
      <select id={id} value={locale} onChange={(e) => void setLocale(e.target.value as Locale)}>
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
    </div>
  );
}

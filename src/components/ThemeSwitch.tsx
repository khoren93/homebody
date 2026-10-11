import { useTranslation } from 'react-i18next';

import { THEMES, useTheme } from '@/lib/theme';

import { Segmented } from './Segmented';

/** Lets the user follow the system theme or force light or dark. */
export function ThemeSwitch() {
  const { t } = useTranslation();
  const [theme, setTheme] = useTheme();

  return (
    <Segmented
      legend={t('theme.label')}
      showLegend
      value={theme}
      onChange={setTheme}
      options={THEMES.map((value) => ({ value, label: t(`theme.${value}`) }))}
    />
  );
}

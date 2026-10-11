import { useTranslation } from 'react-i18next';

import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useAppStore } from '@/store';

export function App() {
  const { t } = useTranslation();
  const status = useAppStore((store) => store.status);
  const loadError = useAppStore((store) => store.loadError);

  return (
    <main>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
      {status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {status === 'error' && <p role="alert">{loadError}</p>}
      <LanguageSwitch />
    </main>
  );
}

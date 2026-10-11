import 'i18next';

import type en from './locales/en.json';

// Makes `t()` keys type-checked against the English resource file.
declare module 'i18next' {
  type CustomTypeOptions = {
    defaultNS: 'translation';
    resources: { translation: typeof en };
    returnNull: false;
  };
}

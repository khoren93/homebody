import { useTranslation } from 'react-i18next';

import { type LoadedSession, sessionPhase } from '@/engine';

/** Localized names for a session: its template, the focus of the day and its phase. */
export function useSessionLabels() {
  const { t } = useTranslation();
  return {
    name: (session: Pick<LoadedSession, 'template'>) => t(`templates.${session.template}.name`),
    focus: (session: Pick<LoadedSession, 'template'>) => t(`templates.${session.template}.focus`),
    /** "Full body A · Squat & chest press focus" */
    title: (session: Pick<LoadedSession, 'template'>) =>
      `${t(`templates.${session.template}.name`)} · ${t(`templates.${session.template}.focus`)}`,
    phase: (session: Pick<LoadedSession, 'deload' | 'rir'>) => t(`phase.${sessionPhase(session)}`),
    /** "Working · 2 in reserve" or "Deload · fewer sets, lighter weights" */
    effort: (session: Pick<LoadedSession, 'deload' | 'rir'>) => {
      const phase = t(`phase.${sessionPhase(session)}`);
      return session.deload
        ? t('plan.phaseDeload', { phase })
        : t('plan.phaseRir', { phase, rir: session.rir });
    },
  };
}

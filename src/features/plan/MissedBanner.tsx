import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Button, ButtonLink } from '@/components/Button';
import { diffDays, type IsoDate, type LoadedSession } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { navigate, routeHref } from '@/lib/router';
import { actions } from '@/store';

import { useSessionLabels } from './useSessionLabels';

type Props = {
  session: LoadedSession;
  sessions: readonly LoadedSession[];
  today: IsoDate;
  /** On the plan the banner names the session and links to it. */
  context: 'plan' | 'session';
};

/** Offers to do a missed session today, which shifts the rest of the plan, or to skip it. */
export function MissedBanner({ session, sessions, today, context }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const labels = useSessionLabels();
  const later = sessions.filter((other) => other.date > session.date).length;
  const date = format.date(session.date);

  const text = [
    context === 'plan'
      ? t('missed.titlePlan', { name: t('common.quote', { text: labels.name(session) }), date })
      : t('missed.titleSession', { date }),
    later > 0
      ? t('missed.moveRest', {
          count: later,
          days: t('units.days', { count: diffDays(session.date, today) }),
        })
      : t('missed.moveLast'),
    t('missed.skipHint'),
  ];

  return (
    <Banner
      role="status"
      actions={
        <>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              actions.moveSessionToToday(session.id, today);
              navigate({ name: 'session', sessionId: session.id });
            }}
          >
            {t('missed.doToday')}
          </Button>
          <Button size="sm" onClick={() => actions.skipSession(session.id)}>
            {t('missed.skip')}
          </Button>
          {context === 'plan' && (
            <ButtonLink
              size="sm"
              variant="ghost"
              href={routeHref({ name: 'session', sessionId: session.id })}
            >
              {t('missed.open')}
            </ButtonLink>
          )}
        </>
      }
    >
      <strong>{text[0]}</strong> {text.slice(1).join(' ')}
    </Banner>
  );
}

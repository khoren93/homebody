import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/Button';
import type { IsoDate, LoadedSession } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { routeHref } from '@/lib/router';
import { CATALOG, useAppStore } from '@/store';

import styles from './NextSessionHero.module.css';
import { useSessionLabels } from './useSessionLabels';

/** The next workout, front and centre, with a button that opens it. */
export function NextSessionHero({ session, today }: { session: LoadedSession; today: IsoDate }) {
  const { t } = useTranslation();
  const format = useFormat();
  const labels = useSessionLabels();
  const equipment = useAppStore((store) => store.state.equipment);

  const when = session.date === today ? t('plan.hero.today') : t('plan.hero.next');
  const effort = session.deload
    ? t('plan.hero.deload')
    : t('plan.hero.rir', { count: session.rir });

  return (
    <section className={styles.hero} aria-labelledby="next-session-title">
      <span className={styles.eyebrow}>
        {when} · {t('plan.hero.week', { week: session.week + 1 })}
      </span>
      <h2 id="next-session-title">{labels.name(session)}</h2>
      <p>{labels.focus(session)}</p>
      <p className={styles.meta}>
        {format.date(session.date)} · {t('plan.hero.about', { minutes: session.minutes })} ·{' '}
        {effort}
      </p>
      <ul className={styles.exercises}>
        {session.items.map((item) => {
          const exercise = CATALOG.byId.get(item.exerciseId);
          return (
            <li key={item.key} className={styles.exercise}>
              {exercise ? format.exercise(exercise, equipment) : item.exerciseId}
            </li>
          );
        })}
      </ul>
      <ButtonLink
        className={styles.open}
        href={routeHref({ name: 'session', sessionId: session.id })}
      >
        {t('plan.hero.open')}
      </ButtonLink>
    </section>
  );
}

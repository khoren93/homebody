import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { ButtonLink } from '@/components/Button';
import { Page } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Section } from '@/components/Section';
import { routeHref } from '@/lib/router';
import { useToday } from '@/lib/useToday';
import { firstMissed, nextSession, useAppStore, usePlan } from '@/store';

import { BlockCard } from './BlockCard';
import { MissedBanner } from './MissedBanner';
import { NextBlockPanel } from './NextBlockPanel';
import styles from './PlanScreen.module.css';
import { TodayHero } from './TodayHero';
import { VolumePanel } from './VolumePanel';
import { WeekList } from './WeekList';
import { WeekStrip } from './WeekStrip';

export function PlanScreen() {
  const { t } = useTranslation();
  const today = useToday();
  const { plan, volume } = usePlan();
  const setupDone = useAppStore((store) => store.state.setupDone);
  const upcoming = useAppStore((store) => nextSession(plan.sessions, store.state, today));
  const missed = useAppStore((store) => firstMissed(plan.sessions, store.state, today));

  return (
    <Page>
      {!setupDone && (
        <Banner
          actions={
            <ButtonLink size="sm" href={routeHref({ name: 'settings' })}>
              {t('plan.sample.cta')}
            </ButtonLink>
          }
        >
          <strong>{t('plan.sample.title')}</strong> {t('plan.sample.body')}
        </Banner>
      )}

      {plan.sessions.length === 0 ? (
        <Panel>
          <h1 className={styles.heading}>{t('nav.plan')}</h1>
          <p>{t('plan.empty')}</p>
        </Panel>
      ) : (
        <>
          {missed && (
            <MissedBanner session={missed} sessions={plan.sessions} today={today} context="plan" />
          )}

          {upcoming ? (
            <TodayHero session={upcoming} today={today} />
          ) : (
            <Section title={t('plan.blockDone.title')} description={t('plan.blockDone.body')} />
          )}

          <BlockCard sessions={plan.sessions} today={today} />
          <WeekStrip sessions={plan.sessions} today={today} />
          <VolumePanel volume={volume} />

          <h2 className={styles.heading}>{t('plan.allSessions')}</h2>
          <WeekList sessions={plan.sessions} today={today} />
          <NextBlockPanel sessions={plan.sessions} today={today} />
        </>
      )}
    </Page>
  );
}

import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { ButtonLink } from '@/components/Button';
import { Page } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Section } from '@/components/Section';
import { Stat, StatGrid } from '@/components/Stat';
import { routeHref } from '@/lib/router';
import { useToday } from '@/lib/useToday';
import { nextSession, useAppStore, usePlan } from '@/store';

import { NextBlockPanel } from './NextBlockPanel';
import { NextSessionHero } from './NextSessionHero';
import { VolumePanel } from './VolumePanel';
import { WeekList } from './WeekList';

export function PlanScreen() {
  const { t } = useTranslation();
  const today = useToday();
  const { plan, volume } = usePlan();
  const setupDone = useAppStore((store) => store.state.setupDone);
  const schedule = useAppStore((store) => store.state.schedule);
  const block = useAppStore((store) => store.state.block);
  const doneCount = useAppStore(
    (store) => plan.sessions.filter((session) => store.state.done[session.id]).length,
  );
  const upcoming = useAppStore((store) => nextSession(plan.sessions, store.state, today));

  const title =
    block > 1
      ? `${t('plan.block', { block })} · ${t('units.weeks', { count: schedule.weeks })}`
      : t('plan.title', { count: schedule.weeks });
  const longest = Math.max(0, ...Object.values(plan.templates).map((template) => template.minutes));

  return (
    <Page>
      <ScreenTitle title={title} />

      {!setupDone && (
        <Banner
          actions={
            <ButtonLink variant="primary" size="sm" href={routeHref({ name: 'settings' })}>
              {t('plan.sample.cta')}
            </ButtonLink>
          }
        >
          <strong>{t('plan.sample.title')}</strong> {t('plan.sample.body')}
        </Banner>
      )}

      {plan.sessions.length === 0 ? (
        <Panel>
          <p>{t('plan.empty')}</p>
        </Panel>
      ) : (
        <>
          {upcoming ? (
            <NextSessionHero session={upcoming} today={today} />
          ) : (
            <Section title={t('plan.blockDone.title')} description={t('plan.blockDone.body')} />
          )}

          <StatGrid>
            <Stat value={schedule.weeks} label={t('plan.stats.weeks')} />
            <Stat value={`${doneCount}/${plan.sessions.length}`} label={t('plan.stats.sessions')} />
            <Stat value={schedule.days.length} label={t('plan.stats.daysPerWeek')} />
            <Stat value={longest} label={t('plan.stats.maxMinutes')} />
          </StatGrid>

          <WeekList sessions={plan.sessions} today={today} />
          <NextBlockPanel sessions={plan.sessions} today={today} />
          <VolumePanel volume={volume} />
        </>
      )}
    </Page>
  );
}

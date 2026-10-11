import { useTranslation } from 'react-i18next';

import { BarList } from '@/components/BarList';
import { ButtonLink } from '@/components/Button';
import { Section } from '@/components/Section';
import type { MuscleId } from '@/data';
import { GOALS, volumeTier } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { routeHref } from '@/lib/router';
import { useAppStore } from '@/store';

/** The scale of the bars, in sets: a little above the highest optimal maximum. */
const SCALE_MAX = 24;

/** Planned weekly sets per muscle against the optimal range of the goal. */
export function VolumePanel({ volume }: { volume: Partial<Record<MuscleId, number>> }) {
  const { t } = useTranslation();
  const format = useFormat();
  const goal = useAppStore((store) => store.state.profile.goal);
  const [min, max] = GOALS[goal].weeklySets;

  const rows = (Object.entries(volume) as [MuscleId, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([muscle, sets]) => ({
      id: muscle,
      tier: volumeTier(muscle, sets, goal),
      label: format.capitalize(t(`muscles.${muscle}.name`)),
      value: sets,
      valueText: format.number(sets),
    }));

  return (
    <Section
      title={t('plan.volume.title')}
      description={t('plan.volume.about', {
        min,
        max,
        goal: t(`goal.${goal}`).toLocaleLowerCase(format.locale),
      })}
      aside={
        <ButtonLink size="sm" href={routeHref({ name: 'muscles', mode: 'plan' })}>
          {t('plan.volume.map')}
        </ButtonLink>
      }
    >
      <BarList rows={rows} max={SCALE_MAX} />
    </Section>
  );
}

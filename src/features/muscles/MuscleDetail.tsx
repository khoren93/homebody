import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Muted } from '@/components/Layout';
import { Stat, StatGrid } from '@/components/Stat';
import type { MuscleId } from '@/data';
import {
  diffDays,
  type IsoDate,
  optimalWeeklySets,
  RECOVERY_HOURS,
  type VolumeTier,
} from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { CATALOG } from '@/store';

import styles from './MuscleDetail.module.css';

/** Chip tone per heat tier. */
const TIER_TONES = { 0: 'neutral', 1: 'heat1', 2: 'heat2', 3: 'heat3', 4: 'heat4' } as const;

type Props = {
  muscle: MuscleId;
  goal: Parameters<typeof optimalWeeklySets>[1];
  today: IsoDate;
  /** Tier to show as a chip; omitted in the overview. */
  tier?: VolumeTier | undefined;
  sets7: number;
  sets30: number;
  planned: number;
  lastTrained: IsoDate | undefined;
  /** Jumps to the exercises of the muscle, when they are not right below the sheet. */
  onBrowse?: (() => void) | undefined;
  onClose: () => void;
};

/** The sheet for one muscle: what it does, how much it got, and where to find its exercises. */
export function MuscleDetail(props: Props) {
  const { muscle, goal, today, tier, sets7, sets30, planned, lastTrained, onBrowse, onClose } =
    props;
  const { t } = useTranslation();
  const format = useFormat();
  const name = t(`muscles.${muscle}.name`);
  const [min, max] = optimalWeeklySets(muscle, goal);
  const daysAgo = lastTrained ? diffDays(lastTrained, today) : undefined;
  const count = CATALOG.list.filter((exercise) => exercise.primary.includes(muscle)).length;

  const since =
    daysAgo === undefined
      ? t('map.detail.never')
      : daysAgo === 0
        ? t('map.detail.today')
        : t('map.detail.days', { count: daysAgo });

  return (
    <section
      className={styles.sheet}
      aria-label={t('map.detail.label', { muscle: format.capitalize(name) })}
    >
      <div className={styles.head}>
        <h2>{format.capitalize(name)}</h2>
        <div className={styles.headEnd}>
          {tier !== undefined && tier > 0 && (
            <Chip tone={TIER_TONES[tier]}>{t(`map.tiers.${tier}`)}</Chip>
          )}
          <button
            type="button"
            className={styles.close}
            aria-label={t('map.detail.close', { muscle: name })}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
      <Muted small>{t(`muscles.${muscle}.about`)}</Muted>

      <StatGrid columns={3} look="plain">
        <Stat value={format.number(sets7, 1)} label={t('map.detail.sets7')} />
        <Stat
          value={`${format.number(min)}–${format.number(max)}`}
          label={t('map.detail.target')}
        />
        <Stat value={since} label={t('map.detail.since')} />
        <Stat value={format.number(sets30, 1)} label={t('map.detail.sets30')} />
        <Stat value={format.number(planned, 1)} label={t('map.detail.planned')} />
      </StatGrid>

      {daysAgo !== undefined && daysAgo * 24 < RECOVERY_HOURS && (
        <Banner className={styles.note}>{t('map.detail.recovering')}</Banner>
      )}
      {planned === 0 && <Banner className={styles.note}>{t('map.detail.notInPlan')}</Banner>}

      {onBrowse && (
        <button type="button" className={styles.browse} onClick={onBrowse}>
          <span>{t('map.detail.exercises', { count, muscle: name })}</span>
          <span className={styles.arrow}>{t('map.detail.browse')}</span>
        </button>
      )}
    </section>
  );
}

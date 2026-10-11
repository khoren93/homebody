import { useTranslation } from 'react-i18next';

import type { VolumeTier } from '@/engine';
import { cx } from '@/lib/cx';

import styles from './HeatLegend.module.css';

const TIERS: readonly VolumeTier[] = [0, 1, 2, 3, 4];

/** Design system: HeatScale legend. Five tiers, always in this order and wording. */
export function HeatLegend({ current }: { current?: VolumeTier | undefined }) {
  const { t } = useTranslation();
  return (
    <ul className={styles.legend} aria-label={t('map.legend')}>
      {TIERS.map((tier) => (
        <li key={tier} className={cx(styles.item, tier === current && styles.current)}>
          <span className={cx(styles.swatch, styles[`tier${tier}`])} aria-hidden="true" />
          {t(`map.tiers.${tier}`)}
        </li>
      ))}
    </ul>
  );
}

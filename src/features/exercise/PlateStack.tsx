import { useTranslation } from 'react-i18next';

import { plateLoading } from '@/engine';
import { useFormat } from '@/i18n/useFormat';

import styles from './PlateStack.module.css';

/** Maps a plate weight to its color class. */
function plateClass(kg: number): string | undefined {
  if (kg >= 25) return styles.p25;
  if (kg >= 20) return styles.p20;
  if (kg >= 15) return styles.p15;
  if (kg >= 10) return styles.p10;
  if (kg >= 5) return styles.p5;
  return styles.small;
}

/** Shows which plates go on each side of the bar for a given total load. */
export function PlateStack({ total, bar }: { total: number; bar: number }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { perSide } = plateLoading(total, bar);

  const label =
    perSide.length === 0
      ? t('session.plates.barOnly', { bar: format.number(bar) })
      : t('session.plates.loading', {
          bar: format.number(bar),
          plates: perSide.map((kg) => format.number(kg)).join(' + '),
        });

  return (
    <div className={styles.stack}>
      <span className={styles.drawing} aria-hidden="true">
        <span className={styles.bar} />
        {perSide.map((kg, index) => (
          <span
            key={index}
            className={`${styles.plate} ${plateClass(kg)}`}
            style={{ blockSize: `${Math.max(40, Math.min(100, 40 + kg * 2.4))}%` }}
          />
        ))}
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

import type { Rating } from '@/engine';

import styles from './EffortRating.module.css';

const RATINGS: readonly Rating[] = ['easy', 'ok', 'hard', 'fail'];

type Props = {
  value: Rating | undefined;
  /** Called with the pressed rating; pressing the current one again clears it. */
  onRate: (rating: Rating) => void;
};

/**
 * Design system: the effort rating. Four outlined buttons; the chosen one
 * inverts. It feeds the load calculator, so the four values are fixed.
 */
export function EffortRating({ value, onRate }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.rating} role="group" aria-label={t('session.rate.label')}>
      {RATINGS.map((rating) => (
        <button
          key={rating}
          type="button"
          className={styles.button}
          aria-pressed={value === rating}
          title={t(`rating.${rating}.hint`)}
          onClick={() => onRate(rating)}
        >
          {t(`rating.${rating}.name`)}
        </button>
      ))}
    </div>
  );
}

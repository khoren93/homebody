import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MUSCLE_IDS, type MuscleId } from '@/data';
import { useFormat } from '@/i18n/useFormat';
import { CATALOG } from '@/store';

import styles from './MuscleChips.module.css';

type Props = {
  selected: MuscleId | undefined;
  onSelect: (muscle: MuscleId) => void;
};

/** Every muscle by name, with the number of exercises that train it directly. */
export function MuscleChips({ selected, onSelect }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const row = useRef<HTMLDivElement>(null);

  // A muscle picked on the map may sit outside the scrolled row: bring its chip into view.
  useEffect(() => {
    const chip = row.current?.querySelector('[aria-pressed="true"]');
    if (!row.current || !chip) return;
    const outer = row.current.getBoundingClientRect();
    const inner = chip.getBoundingClientRect();
    if (inner.left < outer.left || inner.right > outer.right) {
      row.current.scrollLeft += inner.left - outer.left - (outer.width - inner.width) / 2;
    }
  }, [selected]);

  return (
    <div ref={row} className={styles.muscles} role="group" aria-label={t('library.muscles')}>
      {MUSCLE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={styles.muscle}
          aria-pressed={id === selected}
          onClick={() => onSelect(id)}
        >
          {format.capitalize(t(`muscles.${id}.name`))}{' '}
          <span className={styles.muscleCount}>
            {CATALOG.list.filter((exercise) => exercise.primary.includes(id)).length}
          </span>
        </button>
      ))}
    </div>
  );
}

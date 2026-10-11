import { cx } from '@/lib/cx';

import { Icon } from './Icon';
import styles from './SetTracker.module.css';

type Props = {
  /** One flag per working set. */
  done: readonly boolean[];
  onToggle: (index: number) => void;
  /** Names the group for assistive technology. */
  label: string;
  /** Accessible name of a set button, by state. */
  setLabel: (state: 'done' | 'current' | 'upcoming', number: number) => string;
};

/**
 * Design system: SetTracker. A row of equal buttons, one per working set.
 * Tapping a set marks it done; tapping a done set undoes it.
 */
export function SetTracker({ done, onToggle, label, setLabel }: Props) {
  const current = done.findIndex((flag) => !flag);

  return (
    <div className={styles.sets} role="group" aria-label={label}>
      {done.map((flag, index) => {
        const state = flag ? 'done' : index === current ? 'current' : 'upcoming';
        return (
          <button
            key={index}
            type="button"
            className={cx(styles.set, styles[state])}
            aria-pressed={flag}
            aria-label={setLabel(state, index + 1)}
            onClick={() => onToggle(index)}
          >
            {flag ? <Icon name="check" /> : index + 1}
          </button>
        );
      })}
    </div>
  );
}

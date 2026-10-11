import type { HTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Chip.module.css';

type Props = HTMLAttributes<HTMLSpanElement> & {
  /**
   * `tag` is an uppercase status label, `data` a figure such as a rest time.
   */
  kind?: 'tag' | 'data';
  tone?: 'neutral' | 'accent' | 'good' | 'danger' | 'heat1' | 'heat2' | 'heat3' | 'heat4';
};

/** Design system: Chip. A compact pill that labels a state or shows a figure. */
export function Chip({ kind = 'tag', tone = 'neutral', className, ...rest }: Props) {
  return <span className={cx(styles.chip, styles[kind], styles[tone], className)} {...rest} />;
}

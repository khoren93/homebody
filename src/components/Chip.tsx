import type { HTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Chip.module.css';

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'accent' | 'warning' | 'danger';
};

/** A small label for a status or a category. */
export function Chip({ tone = 'neutral', className, ...rest }: Props) {
  return <span className={cx(styles.chip, styles[tone], className)} {...rest} />;
}

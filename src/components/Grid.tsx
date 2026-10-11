import type { HTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Grid.module.css';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** `fields` for form controls, `week` for seven equal columns. */
  kind?: 'fields' | 'week';
};

/** A responsive grid for groups of equally important items. */
export function Grid({ kind = 'fields', className, ...rest }: Props) {
  return <div className={cx(styles.grid, styles[kind], className)} {...rest} />;
}

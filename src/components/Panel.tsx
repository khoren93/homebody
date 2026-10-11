import type { ElementType, HTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Panel.module.css';

type Props = HTMLAttributes<HTMLElement> & { as?: ElementType };

/** A bordered surface that groups related content. */
export function Panel({ as: Tag = 'section', className, ...rest }: Props) {
  return <Tag className={cx(styles.panel, className)} {...rest} />;
}

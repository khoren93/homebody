import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

import styles from './Banner.module.css';

type Props = {
  tone?: 'warning' | 'info' | 'danger';
  /** `alert` interrupts screen readers; use it for errors only. */
  role?: 'status' | 'alert' | 'note';
  children: ReactNode;
  /** Buttons shown next to the message. */
  actions?: ReactNode;
  className?: string;
};

/** A message that needs attention, optionally with actions. */
export function Banner({ tone = 'warning', role = 'note', children, actions, className }: Props) {
  return (
    <div role={role} className={cx(styles.banner, styles[tone], className)}>
      <div className={styles.body}>{children}</div>
      {actions != null && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

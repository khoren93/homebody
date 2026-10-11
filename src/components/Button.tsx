import type { ButtonHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
};

export function Button({ variant = 'default', size = 'md', className, type, ...rest }: Props) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(styles.button, styles[variant], styles[size], className)}
      {...rest}
    />
  );
}

import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Button.module.css';

type Look = {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & Look;

export function Button({ variant = 'default', size = 'md', className, type, ...rest }: Props) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(styles.button, styles[variant], styles[size], className)}
      {...rest}
    />
  );
}

/** A link that looks like a button, for navigation that deserves the same weight. */
export function ButtonLink({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & Look) {
  return (
    <a className={cx(styles.button, styles[variant], styles[size], className)} {...rest}>
      {children}
    </a>
  );
}

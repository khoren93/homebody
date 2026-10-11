import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Button.module.css';

type Look = {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  /** Stretches the button to the width of its container. */
  block?: boolean;
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & Look;

export function Button({
  variant = 'default',
  size = 'md',
  block = false,
  className,
  type,
  ...rest
}: Props) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      {...rest}
    />
  );
}

/** A link that looks like a button, for navigation that deserves the same weight. */
export function ButtonLink({
  variant = 'default',
  size = 'md',
  block = false,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & Look) {
  return (
    <a
      className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      {...rest}
    >
      {children}
    </a>
  );
}

/** A round icon-only link. `label` names it for assistive technology. */
export function IconLink({
  label,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string }) {
  return (
    <a className={cx(styles.icon, className)} aria-label={label} {...rest}>
      {children}
    </a>
  );
}

import type { CSSProperties, ElementType, HTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './Layout.module.css';

type Gap = 1 | 2 | 3 | 4 | 5 | 6 | 8;

type BoxProps = HTMLAttributes<HTMLElement> & {
  /** Spacing token between children (`--space-<gap>`). */
  gap?: Gap;
  as?: ElementType;
};

function gapStyle(gap: Gap, style: CSSProperties | undefined): CSSProperties {
  return { ...style, '--gap': `var(--space-${gap})` } as CSSProperties;
}

/** Children stacked vertically with even spacing. */
export function Stack({ gap = 3, as: Tag = 'div', className, style, ...rest }: BoxProps) {
  return <Tag className={cx(styles.stack, className)} style={gapStyle(gap, style)} {...rest} />;
}

type RowProps = BoxProps & {
  justify?: 'start' | 'between' | 'end';
  align?: 'center' | 'start' | 'end' | 'baseline';
};

/** Children in a wrapping horizontal row. */
export function Row({
  gap = 2,
  as: Tag = 'div',
  justify = 'start',
  align = 'center',
  className,
  style,
  ...rest
}: RowProps) {
  return (
    <Tag
      className={cx(styles.row, styles[`justify-${justify}`], styles[`align-${align}`], className)}
      style={gapStyle(gap, style)}
      {...rest}
    />
  );
}

/** A screen: one column of content with a consistent rhythm. */
export function Page({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.page, className)} {...rest} />;
}

/** Secondary text. */
export function Muted({
  small,
  className,
  as: Tag = 'p',
  ...rest
}: HTMLAttributes<HTMLElement> & { small?: boolean; as?: ElementType }) {
  return <Tag className={cx(styles.muted, small && styles.small, className)} {...rest} />;
}

/** Content for assistive technology only. */
export function VisuallyHidden({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx(styles.visuallyHidden, className)} {...rest} />;
}

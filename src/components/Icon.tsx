import type { ReactNode } from 'react';

import styles from './Icon.module.css';

const PATHS = {
  plan: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  progress: <path d="M2.5 12h3M18.5 12h3M5.5 8v8M18.5 8v8M8 6.5v11M16 6.5v11M8 12h8" />,
  muscles: (
    <>
      <circle cx="12" cy="4.5" r="2.2" />
      <path d="M7 8.5Q12 7 17 8.5L15.5 14 14 21M8.5 14 10 21M7 8.5 5 14M17 8.5 19 14M8.5 14Q12 15 15.5 14" />
    </>
  ),
  body: (
    <>
      <path d="M4 18l5-6 4 3 7-9" />
      <path d="M15 6h5v5" />
    </>
  ),
  library: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  swap: <path d="M4 7h11l-3-3M20 17H9l3 3" />,
  back: <path d="M15 5 8 12l7 7" />,
  play: <path d="M7 4.5 19 12 7 19.5Z" fill="currentColor" stroke="none" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  list: <path d="M4 7h16M4 12h16M4 17h16" />,
  cards: (
    <>
      <rect x="4" y="4" width="16" height="7" rx="2" />
      <rect x="4" y="13" width="16" height="7" rx="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

/** A decorative line icon. Always pair it with visible or hidden text. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

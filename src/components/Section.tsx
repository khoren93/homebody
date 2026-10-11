import { type ReactNode, useId } from 'react';

import { Muted, Stack } from './Layout';
import { Panel } from './Panel';
import styles from './Section.module.css';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  /** Shown next to the title, for example a button. */
  aside?: ReactNode;
  children?: ReactNode;
  id?: string;
};

/** A titled panel: the standard container for a block of a screen. */
export function Section({ title, description, aside, children, id }: Props) {
  const headingId = useId();
  return (
    <Panel aria-labelledby={headingId} id={id}>
      <Stack gap={1}>
        <div className={styles.head}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {aside}
        </div>
        {description != null && <Muted small>{description}</Muted>}
      </Stack>
      {children}
    </Panel>
  );
}

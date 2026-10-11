import type { ReactNode } from 'react';

import { Muted, Stack } from './Layout';

/** The heading of a screen with an optional introduction. */
export function ScreenTitle({ title, intro }: { title: ReactNode; intro?: ReactNode }) {
  return (
    <Stack gap={2} as="header">
      <h1>{title}</h1>
      {intro != null && <Muted>{intro}</Muted>}
    </Stack>
  );
}

import { lazy, Suspense } from 'react';

import { AppShell } from '@/app/AppShell';
import { LoadErrorScreen, LoadingScreen } from '@/app/StatusScreens';
import { PlanScreen } from '@/features/plan/PlanScreen';
import type { Route } from '@/lib/router';
import { useAppStore } from '@/store';

// The plan is the landing screen and ships in the main bundle; the other
// screens are loaded when they are first opened.
const SessionScreen = lazy(() =>
  import('@/features/session/SessionScreen').then((m) => ({ default: m.SessionScreen })),
);
const ProgressScreen = lazy(() =>
  import('@/features/progress/ProgressScreen').then((m) => ({ default: m.ProgressScreen })),
);
const MusclesScreen = lazy(() =>
  import('@/features/muscles/MusclesScreen').then((m) => ({ default: m.MusclesScreen })),
);
const BodyScreen = lazy(() =>
  import('@/features/body/BodyScreen').then((m) => ({ default: m.BodyScreen })),
);
const LibraryScreen = lazy(() =>
  import('@/features/library/LibraryScreen').then((m) => ({ default: m.LibraryScreen })),
);
const SettingsScreen = lazy(() =>
  import('@/features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'plan':
      return <PlanScreen />;
    case 'session':
      return <SessionScreen sessionId={route.sessionId} />;
    case 'progress':
      return <ProgressScreen />;
    case 'muscles':
      return <MusclesScreen mode={route.mode} muscle={route.muscle} />;
    case 'body':
      return <BodyScreen />;
    case 'library':
      return <LibraryScreen muscle={route.muscle} />;
    case 'settings':
      return <SettingsScreen />;
  }
}

export function App() {
  const status = useAppStore((store) => store.status);
  const loadError = useAppStore((store) => store.loadError);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') return <LoadErrorScreen message={loadError} />;
  return (
    <AppShell>
      {(route) => (
        <Suspense fallback={null}>
          <Screen route={route} />
        </Suspense>
      )}
    </AppShell>
  );
}

import { AppShell } from '@/app/AppShell';
import { LoadErrorScreen, LoadingScreen } from '@/app/StatusScreens';
import { BodyScreen } from '@/features/body/BodyScreen';
import { CalculatorScreen } from '@/features/calculator/CalculatorScreen';
import { MusclesScreen } from '@/features/muscles/MusclesScreen';
import { PlanScreen } from '@/features/plan/PlanScreen';
import { SessionScreen } from '@/features/session/SessionScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import type { Route } from '@/lib/router';
import { useAppStore } from '@/store';

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'plan':
      return <PlanScreen />;
    case 'session':
      return <SessionScreen sessionId={route.sessionId} />;
    case 'calculator':
      return <CalculatorScreen />;
    case 'muscles':
      return <MusclesScreen />;
    case 'body':
      return <BodyScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

export function App() {
  const status = useAppStore((store) => store.status);
  const loadError = useAppStore((store) => store.loadError);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') return <LoadErrorScreen message={loadError} />;
  return <AppShell>{(route) => <Screen route={route} />}</AppShell>;
}

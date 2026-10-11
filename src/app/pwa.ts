import { create } from 'zustand';

type PwaState = {
  /** A new version has been downloaded and is waiting for a reload. */
  updateReady: boolean;
  /** Everything needed to run offline has been cached. */
  offlineReady: boolean;
  /** Activates the waiting version and reloads the page. */
  applyUpdate: () => void;
};

export const usePwaStore = create<PwaState>(() => ({
  updateReady: false,
  offlineReady: false,
  applyUpdate: () => undefined,
}));

/**
 * Registers the service worker in production builds. The worker precaches the
 * app shell and the exercise photos, which makes the app installable and
 * usable without a connection. Updates are applied only when the user asks.
 */
export async function registerPwa(): Promise<void> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const { registerSW } = await import('virtual:pwa-register');
  const update = registerSW({
    onNeedRefresh: () => usePwaStore.setState({ updateReady: true }),
    onOfflineReady: () => usePwaStore.setState({ offlineReady: true }),
  });
  usePwaStore.setState({ applyUpdate: () => void update(true) });
}

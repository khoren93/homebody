import { useSyncExternalStore } from 'react';

import { MUSCLE_IDS, type MuscleId } from '@/data';
import { isIsoDate } from '@/engine';

/**
 * A minimal hash router. Hash routes work on any static host without
 * rewrite rules, and the app has only a handful of screens.
 *
 *   #/plan                      plan overview (default)
 *   #/session/2026-10-12        one workout
 *   #/progress
 *   #/exercises?mode=plan&muscle=chest
 *   #/body
 *   #/settings                  opened from the header, not a tab
 */
export const MUSCLE_MODES = ['overview', 'done', 'plan'] as const;
export type MuscleMode = (typeof MUSCLE_MODES)[number];

export type Route =
  | { name: 'plan' }
  | { name: 'session'; sessionId: string }
  | { name: 'progress' }
  | { name: 'exercises'; mode?: MuscleMode; muscle?: MuscleId }
  | { name: 'body' }
  | { name: 'settings' };

export type TabName = 'plan' | 'progress' | 'exercises' | 'body';

export const TABS: readonly TabName[] = ['plan', 'progress', 'exercises', 'body'];

/** The tab a route belongs to, if any. A session is part of the plan; settings have no tab. */
export function tabOf(route: Route): TabName | undefined {
  if (route.name === 'session') return 'plan';
  return route.name === 'settings' ? undefined : route.name;
}

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return values.find((candidate) => candidate === value);
}

export function parseRoute(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?');
  const [name, param] = path.split('/').map(decodeURIComponent);
  const params = new URLSearchParams(query);

  switch (name) {
    case 'session':
      return param && isIsoDate(param) ? { name: 'session', sessionId: param } : { name: 'plan' };
    case 'progress':
    case 'body':
    case 'settings':
      return { name };
    case 'exercises': {
      const route: Route = { name: 'exercises' };
      const mode = oneOf(MUSCLE_MODES, params.get('mode'));
      const muscle = oneOf(MUSCLE_IDS, params.get('muscle'));
      if (mode) route.mode = mode;
      if (muscle) route.muscle = muscle;
      return route;
    }
    default:
      return { name: 'plan' };
  }
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'session':
      return `#/session/${encodeURIComponent(route.sessionId)}`;
    case 'exercises': {
      const params = new URLSearchParams();
      if (route.mode) params.set('mode', route.mode);
      if (route.muscle) params.set('muscle', route.muscle);
      const query = params.toString();
      return query ? `#/exercises?${query}` : '#/exercises';
    }
    default:
      return `#/${route.name}`;
  }
}

/** Goes to a route. `replace` swaps the current history entry instead of adding one. */
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const href = routeHref(route);
  if (options.replace) {
    history.replaceState(null, '', href);
    // replaceState does not fire hashchange, so listeners are told by hand.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = href;
  }
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

function currentHash(): string {
  return window.location.hash;
}

/** The current route, re-rendering the component when the hash changes. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, currentHash);
  return parseRoute(hash);
}

import { describe, expect, it } from 'vitest';

import { navigate, parseRoute, type Route, routeHref, tabOf } from '../router';

describe('router', () => {
  const routes: Route[] = [
    { name: 'plan' },
    { name: 'session', sessionId: '2026-10-12' },
    { name: 'progress' },
    { name: 'exercises' },
    { name: 'exercises', mode: 'plan' },
    { name: 'exercises', muscle: 'chest' },
    { name: 'exercises', mode: 'done', muscle: 'middle_back' },
    { name: 'body' },
    { name: 'settings' },
  ];

  it.each(routes)('round-trips $name through its href', (route) => {
    expect(parseRoute(routeHref(route))).toEqual(route);
  });

  it('builds readable hrefs', () => {
    expect(routeHref({ name: 'plan' })).toBe('#/plan');
    expect(routeHref({ name: 'session', sessionId: '2026-10-12' })).toBe('#/session/2026-10-12');
    expect(routeHref({ name: 'exercises', mode: 'plan', muscle: 'chest' })).toBe(
      '#/exercises?mode=plan&muscle=chest',
    );
  });

  it.each(['', '#', '#/', '#/nope', '#/session', '#/session/not-a-date', 'plan'])(
    'falls back to the plan for %j',
    (hash) => {
      expect(parseRoute(hash)).toEqual({ name: 'plan' });
    },
  );

  it('ignores unknown query values', () => {
    expect(parseRoute('#/exercises?mode=hot&muscle=wings')).toEqual({ name: 'exercises' });
  });

  it('maps every route to its tab', () => {
    expect(tabOf({ name: 'session', sessionId: '2026-10-12' })).toBe('plan');
    expect(tabOf({ name: 'exercises', mode: 'plan' })).toBe('exercises');
    expect(tabOf({ name: 'settings' })).toBeUndefined();
  });

  it('navigates by changing the hash', () => {
    navigate({ name: 'body' });
    expect(window.location.hash).toBe('#/body');
    navigate({ name: 'settings' }, { replace: true });
    expect(window.location.hash).toBe('#/settings');
  });
});

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { navigate, type Route } from '@/lib/router';
import { initStore } from '@/store';
import { createMemoryPersistence } from '@/store/persistence';

import { App } from './App';
import { TEST_TODAY } from './test/setup';

beforeEach(() => {
  navigate({ name: 'plan' }, { replace: true });
});

/** Navigates like a link click would; `replace` notifies listeners synchronously. */
function go(route: Route): void {
  act(() => navigate(route, { replace: true }));
}

describe('App shell', () => {
  it('opens on the plan with the five sections in the navigation', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Skip to content',
      'Plan',
      'Calculator',
      'Muscles',
      'Body',
      'Settings',
    ]);
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'Plan' })).toBeInTheDocument();
  });

  it('switches screens when the route changes', () => {
    render(<App />);
    go({ name: 'settings' });
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');

    go({ name: 'session', sessionId: '2026-10-19' });
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');
  });

  it('switches the interface language and remembers the choice', async () => {
    render(<App />);
    go({ name: 'settings' });

    await userEvent.click(screen.getByRole('radio', { name: 'Русский' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Настройки' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Разделы' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ru');
    expect(localStorage.getItem('homebody.locale')).toBe('ru');
  });

  it('switches the theme and remembers the choice', async () => {
    render(<App />);
    go({ name: 'settings' });

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('homebody.theme')).toBe('dark');

    await userEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('warns when data cannot be saved', async () => {
    const broken = createMemoryPersistence();
    vi.spyOn(broken, 'load').mockRejectedValue(new Error('blocked'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await initStore({ persistence: broken, today: TEST_TODAY });

    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Storage is unavailable/);
  });
});

describe('App with unreadable data', () => {
  beforeEach(async () => {
    const persistence = createMemoryPersistence({ state: { version: 99 } as never });
    await initStore({ persistence, today: TEST_TODAY });
  });

  it('explains the problem and offers to start over, with a confirmation', async () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Your saved data could not be read' }),
    ).toBeVisible();
    expect(screen.getByText(/newer version of the app/)).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Erase data and start over' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Erase data and start over' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, erase everything' }));

    expect(await screen.findByRole('navigation', { name: 'Sections' })).toBeInTheDocument();
  });
});

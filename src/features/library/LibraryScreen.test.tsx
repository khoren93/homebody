import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { i18n } from '@/i18n';
import { navigate, parseRoute } from '@/lib/router';
import { useAppStore } from '@/store';

import { LibraryScreen } from './LibraryScreen';

function renderRoute() {
  const route = parseRoute(window.location.hash);
  if (route.name !== 'library') throw new Error('not on the library route');
  return render(<LibraryScreen muscle={route.muscle} />);
}

const count = () => screen.getByRole('status').textContent;
const names = () =>
  within(screen.getByRole('list'))
    .getAllByRole('button', { name: /^Open the photos of/ })
    .map((b) => b.getAttribute('aria-label')!.replace('Open the photos of ', ''));

beforeEach(() => navigate({ name: 'library' }, { replace: true }));

describe('LibraryScreen', () => {
  it('lists the whole catalog as a grid, plan exercises first', () => {
    renderRoute();
    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument();
    expect(count()).toBe('141 exercises');
    expect(names()).toHaveLength(141);
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');

    const first = screen.getAllByRole('button', { name: /^Open the photos of/ })[0]!;
    expect(first).toHaveTextContent('In plan');
  });

  it('searches by name, muscle and equipment, in either language', async () => {
    renderRoute();
    const search = screen.getByRole('searchbox', { name: 'Search exercises' });

    await userEvent.type(search, 'goblet');
    expect(names()).toEqual(['Dumbbell Goblet Squat']);

    await userEvent.clear(search);
    await userEvent.type(search, 'планка');
    expect(names()).toEqual(['Plank', 'Side Plank']);
    expect(count()).toBe('2 exercises');

    await userEvent.clear(search);
    await userEvent.type(search, 'medicine ball');
    expect(names()).toEqual(['Medicine Ball Slam']);

    await userEvent.clear(search);
    await userEvent.type(search, 'qqq');
    expect(screen.getByText('Nothing found. Try another search or filter.')).toBeInTheDocument();
    expect(count()).toBe('0 exercises');
  });

  it('filters by owned equipment and by the plan', async () => {
    renderRoute();
    await userEvent.click(screen.getByRole('radio', { name: 'My gear' }));
    expect(names()).not.toContain('Barbell Squat');
    expect(screen.queryByText(/^Needs /)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'In plan' }));
    expect(count()).toBe('16 exercises');
  });

  it('labels what each exercise needs', () => {
    renderRoute();
    const tile = (name: string) =>
      screen.getByRole('button', { name: `Open the photos of ${name}` });
    expect(tile('Push-Up')).toHaveTextContent('No gear');
    expect(tile('Dumbbell Bench Press')).toHaveTextContent('dumbbells + bench');
    expect(tile('Barbell Squat')).toHaveTextContent('Needs barbell + squat rack');
  });

  it('filters by muscle through the route and marks assisting exercises', async () => {
    const view = renderRoute();
    const chips = screen.getByRole('group', { name: 'Filter by muscle' });
    expect(within(chips).getAllByRole('button')).toHaveLength(17);
    expect(within(chips).getByRole('button', { name: 'Chest 17' })).toBeInTheDocument();

    await userEvent.click(within(chips).getByRole('button', { name: 'Chest 17' }));
    expect(window.location.hash).toBe('#/library?muscle=chest');

    view.unmount();
    renderRoute();
    expect(screen.getByRole('button', { name: 'Chest 17' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(count()).toBe('28 exercises');
    expect(names()[0]).toBe('Dumbbell Bench Press');
    expect(screen.getAllByText('Assists')).toHaveLength(11);

    await userEvent.click(screen.getByRole('button', { name: 'Chest 17' }));
    expect(window.location.hash).toBe('#/library');
  });

  it('opens the photos of an exercise', async () => {
    renderRoute();
    await userEvent.click(screen.getByRole('button', { name: 'Open the photos of Plank' }));
    expect(screen.getByRole('dialog', { name: 'Plank' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('remembers the chosen density', async () => {
    const view = renderRoute();
    await userEvent.click(screen.getByRole('button', { name: 'Compact list' }));
    expect(localStorage.getItem('homebody.libraryDensity')).toBe('compact');
    view.unmount();
    renderRoute();
    expect(screen.getByRole('button', { name: 'Compact list' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows everything about an exercise as a detailed card', async () => {
    renderRoute();
    await userEvent.click(screen.getByRole('button', { name: 'Detailed cards' }));
    await userEvent.type(screen.getByRole('searchbox'), 'goblet');

    const card = screen.getByRole('article', { name: 'Dumbbell Goblet Squat' });
    const fact = (term: string) => within(card).getByText(term).nextElementSibling;
    expect(fact('Primary muscles')).toHaveTextContent('Quads');
    expect(fact('Assisting')).toHaveTextContent('Calves, glutes, hamstrings');
    expect(fact('Equipment')).toHaveTextContent('Dumbbells or kettlebell');
    expect(fact('Type')).toHaveTextContent('compound (multi-joint), with weight, tracks ≈1RM');
    expect(fact('Difficulty')).toHaveTextContent('beginner');
    expect(fact('Next session')).toHaveTextContent('Mon, Oct 19: 3 × 12 · 24 kg');
    expect(fact('≈1RM now')).toHaveTextContent('36 kg');
    expect(card).toHaveTextContent('Technique · 3 steps');

    await userEvent.click(within(card).getByRole('button', { name: 'Do not suggest' }));
    expect(useAppStore.getState().state.excluded).toEqual({ Goblet_Squat: true });
    expect(card).toHaveTextContent('Excluded');
    await userEvent.click(within(card).getByRole('button', { name: 'Back into the plan' }));
    expect(useAppStore.getState().state.excluded).toEqual({});
  });

  it('is translated to Russian and still finds English names', async () => {
    await i18n.changeLanguage('ru');
    renderRoute();
    expect(screen.getByRole('status')).toHaveTextContent('141 упражнение');
    await userEvent.type(screen.getByRole('searchbox'), 'goblet');
    expect(
      screen.getByRole('button', { name: 'Открыть фото: Гоблет-присед с гантелью' }),
    ).toHaveTextContent('В плане');
  });
});

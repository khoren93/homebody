import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MUSCLE_IDS } from '@/data';
import type { HistoryEntry } from '@/engine';
import { i18n } from '@/i18n';
import { navigate, parseRoute } from '@/lib/router';
import { useAppStore } from '@/store';

import { musclesOf, ZONES } from './bodyMap';
import { MusclesScreen } from './MusclesScreen';

/** Renders the screen for the current hash, like the app shell does. */
function renderRoute() {
  const route = parseRoute(window.location.hash);
  if (route.name !== 'muscles') throw new Error('not on the muscles route');
  return render(<MusclesScreen mode={route.mode} muscle={route.muscle} />);
}

function entry(exerciseId: string, date: string, sets: number): HistoryEntry {
  return {
    sessionId: date,
    exerciseId,
    date,
    weight: 20,
    reps: 10,
    sets,
    capacity: 30,
    rating: null,
  };
}

beforeEach(() => {
  navigate({ name: 'muscles' }, { replace: true });
});

describe('body map data', () => {
  it('covers all 17 muscles between the two views', () => {
    const drawn = new Set([...musclesOf('front'), ...musclesOf('back')]);
    expect([...drawn].sort()).toEqual([...MUSCLE_IDS].sort());
  });

  it('has valid path data for every zone', () => {
    for (const zone of [...ZONES.front, ...ZONES.back]) {
      expect(zone.d, zone.muscle).toMatch(/^M[\d.\s,LQZ-]+Z$/);
    }
  });
});

describe('MusclesScreen: overview', () => {
  it('shows both views with a keyboard-reachable button per muscle', () => {
    renderRoute();
    const front = screen.getByRole('group', { name: 'Muscle map, front view' });
    const back = screen.getByRole('group', { name: 'Muscle map, back view' });
    expect(
      within(front)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      'Neck',
      'Traps',
      'Shoulders',
      'Chest',
      'Biceps',
      'Forearms',
      'Abs',
      'Quads',
      'Adductors',
      'Calves',
    ]);
    expect(within(back).getByRole('button', { name: 'Hamstrings' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.queryByRole('list', { name: 'Load legend' })).not.toBeInTheDocument();
  });

  it('opens the detail of a muscle from the map, also with the keyboard', async () => {
    const view = renderRoute();
    const chest = within(screen.getByRole('group', { name: /front view/ })).getByRole('button', {
      name: 'Chest',
    });
    chest.focus();
    await userEvent.keyboard('{Enter}');
    expect(window.location.hash).toBe('#/muscles?muscle=chest');

    view.unmount();
    renderRoute();
    const detail = screen.getByRole('region', { name: 'Chest details' });
    expect(detail).toHaveTextContent('The pectoralis major.');
    expect(detail).toHaveTextContent('10–20');
    expect(within(detail).getByText('planned a week').previousElementSibling).toHaveTextContent(
      '9.5',
    );
    expect(within(detail).getByText('since trained').previousElementSibling).toHaveTextContent('—');
    expect(
      within(screen.getByRole('group', { name: /front view/ })).getByRole('button', {
        name: 'Chest',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(within(detail).getByRole('button', { name: 'Close chest' }));
    expect(window.location.hash).toBe('#/muscles');
  });

  it('lists every exercise below the map, and only those of the chosen muscle', async () => {
    const view = renderRoute();
    const all = screen.getByRole('list', { name: 'All exercises' });
    expect(within(all).getAllByRole('listitem')).toHaveLength(141);

    await userEvent.click(
      within(screen.getByRole('group', { name: /front view/ })).getByRole('button', {
        name: 'Chest',
      }),
    );
    view.unmount();
    renderRoute();
    expect(window.location.hash).toBe('#/muscles?muscle=chest');
    expect(screen.getByRole('heading', { level: 2, name: 'Chest exercises' })).toBeInTheDocument();
    const chest = within(screen.getByRole('list', { name: 'Chest exercises' }));
    expect(chest.getAllByRole('listitem')).toHaveLength(28);
    expect(chest.getByRole('button', { name: 'Open the photos of Push-Up' })).toBeInTheDocument();
    expect(
      chest.queryByRole('button', { name: 'Open the photos of Dumbbell Goblet Squat' }),
    ).not.toBeInTheDocument();
  });

  it('says when a muscle gets no direct work in the plan', () => {
    navigate({ name: 'muscles', muscle: 'neck' }, { replace: true });
    renderRoute();
    expect(screen.getByRole('region', { name: 'Neck details' })).toHaveTextContent(
      'Your plan has no direct work for this muscle.',
    );
  });
});

describe('MusclesScreen: plan mode', () => {
  beforeEach(() => navigate({ name: 'muscles', mode: 'plan' }, { replace: true }));

  it('heats the map by planned weekly volume and ranks the muscles', () => {
    renderRoute();
    expect(screen.getByRole('radio', { name: 'Plan' })).toBeChecked();
    const front = screen.getByRole('group', { name: /front view/ });
    expect(within(front).getByRole('button', { name: 'Shoulders: optimal' })).toBeInTheDocument();
    expect(within(front).getByRole('button', { name: 'Chest: building' })).toBeInTheDocument();
    expect(within(front).getByRole('button', { name: 'Neck: none' })).toBeInTheDocument();

    expect(
      within(screen.getByRole('list', { name: 'Load legend' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['none', 'light', 'building', 'optimal', 'over']);

    const ranked = screen.getByRole('region', { name: 'Sets per week in the plan' });
    expect(ranked).toHaveTextContent('10–20 sets a week for a large muscle');
    const rows = within(ranked).getAllByRole('button');
    expect(rows).toHaveLength(17);
    expect(rows[0]).toHaveTextContent('Shoulders17.5');
    expect(rows.at(-1)).toHaveTextContent('0');
  });

  it('selects a muscle from the ranked list', async () => {
    renderRoute();
    const ranked = screen.getByRole('region', { name: 'Sets per week in the plan' });
    await userEvent.click(within(ranked).getByRole('button', { name: /Hamstrings/ }));
    expect(window.location.hash).toBe('#/muscles?mode=plan&muscle=hamstrings');
  });

  it('switches the mode through the route', async () => {
    renderRoute();
    await userEvent.click(screen.getByRole('radio', { name: 'Done' }));
    expect(window.location.hash).toBe('#/muscles?mode=done');
    await userEvent.click(screen.getByRole('radio', { name: 'Overview' }));
    expect(window.location.hash).toBe('#/muscles');
  });
});

describe('MusclesScreen: done mode', () => {
  beforeEach(() => navigate({ name: 'muscles', mode: 'done' }, { replace: true }));

  it('invites the user to log sets when there is no history', () => {
    renderRoute();
    expect(
      screen.getByText(/There are no finished exercises in this period yet/),
    ).toBeInTheDocument();
    expect(screen.getByText('0 workouts')).toBeInTheDocument();
  });

  it('heats the map by what was done in the chosen period', async () => {
    // Today is 2026-10-14.
    useAppStore.setState({
      history: [
        entry('Dumbbell_Bench_Press', '2026-10-13', 4),
        entry('Pushups', '2026-10-12', 4),
        entry('Pushups', '2026-10-10', 4),
        entry('Goblet_Squat', '2026-09-20', 3),
      ],
    });
    renderRoute();
    expect(screen.getByText('3 workouts')).toBeInTheDocument();
    const front = screen.getByRole('group', { name: /front view/ });
    expect(within(front).getByRole('button', { name: 'Chest: optimal' })).toBeInTheDocument();
    expect(within(front).getByRole('button', { name: 'Quads: none' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sets in the last 7 days' })).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole('group', { name: 'Period' })).getByRole('radio', { name: '30 days' }),
    );
    expect(
      screen.getByRole('region', { name: 'Sets per week, 30-day average' }),
    ).toBeInTheDocument();
    expect(within(front).getByRole('button', { name: 'Quads: light' })).toBeInTheDocument();
    expect(screen.getByText('4 workouts')).toBeInTheDocument();
  });

  it('lists the exercises of a chosen muscle under the ranking and jumps to them', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    const view = renderRoute();
    expect(screen.queryByRole('searchbox', { name: 'Search exercises' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Chest:/ }));
    view.unmount();
    renderRoute();
    const heading = screen.getByRole('heading', { level: 2, name: 'Chest exercises' });
    const detail = screen.getByRole('region', { name: 'Chest details' });
    await userEvent.click(within(detail).getByRole('button', { name: /17 chest exercises/ }));
    expect(scrollIntoView.mock.contexts).toContain(heading.parentElement);
    expect(window.location.hash).toBe('#/muscles?mode=done&muscle=chest');
  });

  it('warns that a muscle trained yesterday is still recovering', () => {
    useAppStore.setState({ history: [entry('Dumbbell_Bench_Press', '2026-10-13', 4)] });
    navigate({ name: 'muscles', mode: 'done', muscle: 'chest' }, { replace: true });
    renderRoute();
    const detail = screen.getByRole('region', { name: 'Chest details' });
    expect(within(detail).getByText('since trained').previousElementSibling).toHaveTextContent(
      '1d',
    );
    expect(within(detail).getByText('sets · 7 days').previousElementSibling).toHaveTextContent('4');
    expect(detail).toHaveTextContent('still recovering');
    expect(detail).toHaveTextContent('light');
  });
});

describe('MusclesScreen: Russian', () => {
  it('translates the map', async () => {
    await i18n.changeLanguage('ru');
    navigate({ name: 'muscles', mode: 'plan', muscle: 'chest' }, { replace: true });
    renderRoute();
    expect(screen.getByRole('group', { name: 'Карта мышц, вид спереди' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Грудь: ниже нормы' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Грудь: подробности' })).toHaveTextContent(
      '17 упражнений: грудь',
    );
  });
});

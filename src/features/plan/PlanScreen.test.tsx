import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { i18n } from '@/i18n';
import { actions, useAppStore } from '@/store';

import { PlanScreen } from './PlanScreen';

const store = () => useAppStore.getState();

// The tests run on Wednesday 2026-10-14; the sample plan starts on Monday 2026-10-19.
describe('PlanScreen', () => {
  it('labels the sample plan and points to the settings', () => {
    render(<PlanScreen />);
    expect(screen.getByText('This is a sample plan.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter my details' })).toHaveAttribute(
      'href',
      '#/settings',
    );
  });

  it('drops the sample label once the user has entered something', () => {
    actions.setProfile({ age: 35 });
    render(<PlanScreen />);
    expect(screen.queryByText('This is a sample plan.')).not.toBeInTheDocument();
  });

  it('presents the next session with its focus, gear, size and a way to start it', () => {
    render(<PlanScreen />);
    const hero = screen.getByRole('region', { name: 'Full body A' });
    expect(within(hero).getByRole('heading', { level: 1 })).toHaveTextContent('Full body A');
    expect(hero).toHaveTextContent('Mon, Oct 19 · week 1 · Introduction');
    expect(hero).toHaveTextContent('RIR 3');
    expect(hero).toHaveTextContent('Squat & chest press focus · dumbbells, bench');
    expect(
      within(hero)
        .getAllByRole('img')
        .map((img) => img.getAttribute('alt')),
    ).toEqual([
      'Dumbbell Goblet Squat',
      'Dumbbell Bench Press',
      'One-Arm Dumbbell Row',
      'Dumbbell Romanian Deadlift',
    ]);
    expect(hero).toHaveTextContent('+2');
    for (const [value, label] of [
      ['6', 'exercises'],
      ['17', 'working sets'],
      ['45′', 'with rest'],
    ]) {
      expect(within(hero).getByText(label!).previousElementSibling).toHaveTextContent(value!);
    }
    expect(within(hero).getByRole('link', { name: 'Start workout' })).toHaveAttribute(
      'href',
      '#/session/2026-10-19',
    );
  });

  it('offers to continue a session that was started', () => {
    useAppStore.setState({ setLogs: { '2026-10-19': { Goblet_Squat: [true] } } });
    render(<PlanScreen />);
    expect(screen.getByRole('link', { name: 'Continue workout' })).toBeInTheDocument();
  });

  it('shows where the user is in the block', () => {
    render(<PlanScreen />);
    const block = screen.getByRole('region', { name: 'Block 1 · 4 weeks' });
    expect(block).toHaveTextContent('0 / 12 done');
    const weeks = within(block).getAllByRole('listitem');
    expect(weeks.map((week) => week.textContent)).toEqual(['Intro', 'Work', 'Peak', 'Deload']);
    expect(weeks[0]).toHaveAttribute('aria-current', 'step');
    expect(weeks[0]).toHaveAccessibleName('Week 1, Intro: 0 of 3 sessions done');
  });

  it('shows the current week with today and the training days', () => {
    // Monday of the first plan week.
    vi.setSystemTime(new Date(2026, 9, 19, 12));
    render(<PlanScreen />);
    const strip = screen.getByRole('list', { name: 'This week' });
    const days = within(strip).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(within(strip).getByRole('link', { name: 'Mon, Oct 19: Full body A' })).toHaveAttribute(
      'aria-current',
      'date',
    );
    expect(within(strip).getAllByRole('link')).toHaveLength(3);
    expect(within(strip).getByLabelText('Tue, Oct 20: rest day')).toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 9, 14, 12));
  });

  it('lists every week with its phase and sessions', () => {
    render(<PlanScreen />);
    const week = (n: number) => screen.getByRole('region', { name: `Week ${n}` });
    expect(week(1)).toHaveTextContent('Introduction · 3 in reserve');
    expect(week(2)).toHaveTextContent('Working · 2 in reserve');
    expect(week(3)).toHaveTextContent('Peak · 1 in reserve');
    expect(week(4)).toHaveTextContent('Deload · fewer sets, lighter weights');

    const sessions = within(week(1)).getAllByRole('link');
    expect(sessions).toHaveLength(3);
    expect(sessions[0]).toHaveAttribute('href', '#/session/2026-10-19');
    expect(sessions[0]).toHaveTextContent('Full body A');
    expect(sessions[0]).toHaveTextContent('6 exercises · 17 sets · ~45 min');
    expect(within(week(4)).getAllByRole('link')[0]).toHaveTextContent('6 exercises · 12 sets');
  });

  it('ticks a session off, records it and moves on to the next one', async () => {
    render(<PlanScreen />);
    const tick = screen.getByRole('checkbox', {
      name: 'Mark “Full body A” on Mon, Oct 19 as done',
    });
    await userEvent.click(tick);

    expect(tick).toBeChecked();
    expect(store().state.done).toEqual({ '2026-10-19': true });
    expect(store().history).toHaveLength(6);
    expect(screen.getByRole('region', { name: 'Block 1 · 4 weeks' })).toHaveTextContent(
      '1 / 12 done',
    );
    expect(screen.getByRole('region', { name: 'Full body B' })).toHaveTextContent('Wed, Oct 21');

    await userEvent.click(tick);
    expect(store().state.done).toEqual({});
    expect(store().history).toEqual([]);
  });

  it('shows how far a started session is', () => {
    useAppStore.setState({ setLogs: { '2026-10-19': { Goblet_Squat: [true, true] } } });
    render(<PlanScreen />);
    expect(screen.getAllByRole('link', { name: /Full body A/ })[0]).toHaveTextContent(
      '2 of 17 sets · 6 exercises',
    );
  });

  it('starts the next block only after a confirmation', async () => {
    render(<PlanScreen />);
    const panel = screen.getByRole('region', { name: 'Next block' });
    expect(panel).toHaveTextContent('Press the button when you finish this block.');
    expect(panel).toHaveTextContent(
      'A new plan for 4 weeks will start on the first Monday after Fri, Nov 13',
    );

    await userEvent.click(within(panel).getByRole('button', { name: 'Start the next block' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    expect(store().state.block).toBe(1);

    await userEvent.click(within(panel).getByRole('button', { name: 'Start the next block' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Yes, start block 2' }));

    expect(store().state.block).toBe(2);
    expect(store().state.schedule.start).toBe('2026-11-16');
    expect(screen.getByRole('region', { name: 'Block 2 · 4 weeks' })).toBeInTheDocument();
  });

  it('says when the block is complete', () => {
    const { sessions } = { sessions: Array.from({ length: 28 }, (_, i) => i) };
    const done = Object.fromEntries(
      sessions.map((i) => {
        const date = new Date(Date.UTC(2026, 9, 19 + i)).toISOString().slice(0, 10);
        return [date, true as const];
      }),
    );
    useAppStore.setState({ state: { ...store().state, done } });
    render(<PlanScreen />);

    expect(screen.getByRole('region', { name: 'Block complete' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Next block' })).toHaveTextContent(
      'This block is over.',
    );
  });

  it('shows the planned weekly volume with a link to the muscle map', () => {
    render(<PlanScreen />);
    const volume = screen.getByRole('region', { name: 'This week’s load' });
    expect(volume).toHaveTextContent('10–20 sets, the optimal range for the “muscle gain” goal');
    const rows = within(volume).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Shoulders');
    expect(rows[0]).toHaveTextContent('17.5');
    expect(within(volume).getByRole('link', { name: 'Muscle map →' })).toHaveAttribute(
      'href',
      '#/exercises?mode=plan',
    );
  });

  it('asks for a training day when the plan is empty', () => {
    for (const day of [0, 2, 4]) actions.toggleTrainingDay(day);
    render(<PlanScreen />);
    expect(screen.getByText(/Pick at least one training day/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Next block' })).not.toBeInTheDocument();
  });

  it('is fully translated to Russian', async () => {
    await i18n.changeLanguage('ru');
    render(<PlanScreen />);
    const hero = screen.getByRole('region', { name: 'Всё тело A' });
    expect(hero).toHaveTextContent('неделя 1 · Втягивающая');
    expect(hero).toHaveTextContent('запас 3');
    expect(hero).toHaveTextContent('Акцент: присед и жим лёжа · гантели, скамья');
    expect(within(hero).getByText('рабочих подходов').previousElementSibling).toHaveTextContent(
      '17',
    );
    expect(within(hero).getByRole('link', { name: 'Начать тренировку' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Блок 1 · 4 недели' })).toHaveTextContent(
      '0 / 12 выполнено',
    );
    expect(screen.getByRole('region', { name: 'Неделя 4' })).toHaveTextContent(
      'Разгрузка · меньше подходов и вес',
    );
    expect(screen.getAllByText(/6 упражнений · 17 подходов · ~45 мин/)[0]).toBeInTheDocument();
  });
});

describe('PlanScreen: missed sessions', () => {
  // Thursday of the first plan week: Monday's and Wednesday's sessions were missed.
  const thursday = new Date(2026, 9, 22, 12);

  it('offers to do the first missed session today or to skip it', async () => {
    vi.setSystemTime(thursday);
    render(<PlanScreen />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('You missed “Full body A” on Mon, Oct 19.');
    expect(banner).toHaveTextContent('the remaining sessions (11) then move 3 days forward');
    expect(within(banner).getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '#/session/2026-10-19',
    );
    expect(screen.getAllByText('missed')).toHaveLength(2);

    await userEvent.click(within(banner).getByRole('button', { name: 'Skip' }));
    expect(store().state.skipped).toEqual({ '2026-10-19': true });
    expect(screen.getByRole('status')).toHaveTextContent(
      'You missed “Full body B” on Wed, Oct 21.',
    );
    expect(screen.getByText('skipped')).toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 9, 14, 12));
  });

  it('moves the plan when the session is done today', async () => {
    vi.setSystemTime(thursday);
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Do it today' }));

    expect(store().state.shifts).toEqual([{ at: '2026-10-19', days: 3 }]);
    expect(window.location.hash).toBe('#/session/2026-10-19');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getAllByText('moved').length).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: 'Full body A' })).toHaveTextContent('Today');
    vi.setSystemTime(new Date(2026, 9, 14, 12));
  });
});

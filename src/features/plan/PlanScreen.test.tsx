import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

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

  it('presents the next session with its focus, effort and exercises', () => {
    render(<PlanScreen />);
    const hero = screen.getByRole('region', { name: 'Full body A' });
    expect(hero).toHaveTextContent('Next session · week 1');
    expect(hero).toHaveTextContent('Squat & chest press focus');
    expect(hero).toHaveTextContent('Mon, Oct 19 · about 45 min · 3 reps in reserve');
    expect(
      within(hero)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Dumbbell Goblet Squat',
      'Dumbbell Bench Press',
      'One-Arm Dumbbell Row',
      'Dumbbell Romanian Deadlift',
      'Standing Dumbbell Press',
      'Plank',
    ]);
    expect(within(hero).getByRole('link', { name: 'Open workout' })).toHaveAttribute(
      'href',
      '#/session/2026-10-19',
    );
  });

  it('shows the key figures of the plan', () => {
    render(<PlanScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Plan for 4 weeks' })).toBeInTheDocument();
    for (const [value, label] of [
      ['4', 'weeks'],
      ['0/12', 'sessions done'],
      ['3', 'days per week'],
      ['45', 'minutes at most'],
    ]) {
      expect(screen.getByText(label!).previousElementSibling).toHaveTextContent(value!);
    }
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
    expect(screen.getByText('sessions done').previousElementSibling).toHaveTextContent('1/12');
    expect(screen.getByRole('region', { name: 'Full body B' })).toHaveTextContent('Next session');

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
    expect(
      screen.getByRole('heading', { level: 1, name: 'Block 2 · 4 weeks' }),
    ).toBeInTheDocument();
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
    const volume = screen.getByRole('region', { name: 'Weekly volume' });
    expect(volume).toHaveTextContent('10–20 sets, the optimal range for the “muscle gain” goal');
    const rows = within(volume).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Shoulders');
    expect(rows[0]).toHaveTextContent('17.5');
    expect(within(volume).getByRole('link', { name: 'Muscle map' })).toHaveAttribute(
      'href',
      '#/muscles?mode=plan',
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
    expect(screen.getByRole('heading', { level: 1, name: 'План на 4 недели' })).toBeInTheDocument();
    const hero = screen.getByRole('region', { name: 'Всё тело A' });
    expect(hero).toHaveTextContent('Следующая тренировка · неделя 1');
    expect(hero).toHaveTextContent('запас 3 повтора до отказа');
    expect(hero).toHaveTextContent('Гоблет-присед с гантелью');
    expect(screen.getByRole('region', { name: 'Неделя 4' })).toHaveTextContent(
      'Разгрузка · меньше подходов и вес',
    );
    expect(screen.getAllByText(/6 упражнений · 17 подходов · ~45 мин/)[0]).toBeInTheDocument();
  });
});

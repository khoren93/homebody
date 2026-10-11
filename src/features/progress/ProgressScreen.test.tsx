import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/i18n';
import { actions, useAppStore } from '@/store';

import { ProgressScreen } from './ProgressScreen';

// Tests run on Wednesday 2026-10-14; the sample plan starts on Monday 2026-10-19.
describe('ProgressScreen', () => {
  it('opens on the first exercise of the plan with its headline figure', () => {
    render(<ProgressScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Progress' })).toBeInTheDocument();
    expect(screen.getByText('Estimated one-rep max, block 1')).toBeInTheDocument();

    const card = screen.getByRole('region', { name: 'Dumbbell Goblet Squat' });
    expect(card).toHaveTextContent('quads');
    expect(card).toHaveTextContent('36');
    expect(card).toHaveTextContent('kg ≈1RM');
  });

  it('charts the plan and lists every session of the exercise', () => {
    render(<ProgressScreen />);
    const card = screen.getByRole('region', { name: 'Dumbbell Goblet Squat' });
    expect(
      within(card).getByRole('img', { name: 'Progress of Dumbbell Goblet Squat' }),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent('done');
    expect(card).toHaveTextContent('plan');

    const table = within(card).getByRole('table', { name: 'Sessions of Dumbbell Goblet Squat' });
    const rows = within(table).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      'DateSetsLoad≈1RM',
      'Oct 193 × 1224 kg36',
      'Oct 263 × 1424 kg36.5',
      'Nov 23 × 1524 kg37',
      'Nov 9 · deload2 × 824 kg37.5',
    ]);
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
    expect(within(table).getByRole('link', { name: 'Oct 26' })).toHaveAttribute(
      'href',
      '#/session/2026-10-26',
    );
  });

  it('lists the other exercises compactly and expands the one that is pressed', async () => {
    render(<ProgressScreen />);
    const rows = screen.getAllByRole('button', { name: /^Show the progress of/ });
    expect(rows).toHaveLength(15);
    expect(rows[0]).toHaveTextContent('Dumbbell Bench Press');
    expect(rows[0]).toHaveTextContent('30.5');

    await userEvent.click(rows[0]!);
    const card = screen.getByRole('region', { name: 'Dumbbell Bench Press' });
    expect(card).toHaveTextContent('chest · per hand');
    expect(card).toHaveTextContent('2 × 22 kg');
    expect(screen.queryByRole('region', { name: 'Dumbbell Goblet Squat' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show the progress of Dumbbell Goblet Squat' }),
    ).toBeInTheDocument();
  });

  it('shows limits instead of a one-rep max for exercises without weight', async () => {
    render(<ProgressScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Show the progress of Plank' }));
    const card = screen.getByRole('region', { name: 'Plank' });
    expect(card).toHaveTextContent('75');
    expect(card).toHaveTextContent('s max');
    expect(
      within(card)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Date', 'Sets', 'Limit']);
  });

  it('summarizes what was achieved once sessions are done', () => {
    actions.toggleSessionDone('2026-10-19');
    actions.editPrescription('Goblet_Squat', '2026-10-26', { weight: 24, reps: 18 });
    actions.toggleSessionDone('2026-10-26');
    render(<ProgressScreen />);

    const card = screen.getByRole('region', { name: 'Dumbbell Goblet Squat' });
    expect(card).toHaveTextContent('Sessions: 2 · Last: 24 kg × 18 · Best: 24 kg × 18');
    expect(card).toHaveTextContent('+11%');
    expect(card).toHaveTextContent('your edits applied');
    expect(card).toHaveTextContent('40'); // 24 × (1 + 20 / 30)
  });

  it('explains the estimated one-rep max', () => {
    render(<ProgressScreen />);
    expect(screen.getByText('What is ≈1RM?')).toBeInTheDocument();
    expect(
      screen.getByText('1RM ≈ weight × (1 + (reps + reps in reserve) / 30)'),
    ).toBeInTheDocument();
  });

  it('says so when the plan has no exercises', () => {
    for (const day of [0, 2, 4]) actions.toggleTrainingDay(day);
    render(<ProgressScreen />);
    expect(screen.getByText('There are no exercises in the plan yet.')).toBeInTheDocument();
  });

  it('is translated to Russian', async () => {
    await i18n.changeLanguage('ru');
    useAppStore.setState({ history: [] });
    render(<ProgressScreen />);
    const card = screen.getByRole('region', { name: 'Гоблет-присед с гантелью' });
    expect(card).toHaveTextContent('кг ≈1ПМ');
    expect(
      within(card)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Дата', 'Подходы', 'Вес', '≈1ПМ']);
    expect(card).toHaveTextContent('разгрузка');
  });
});

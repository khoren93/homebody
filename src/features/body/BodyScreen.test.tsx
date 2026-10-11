import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/i18n';
import { actions, useAppStore } from '@/store';

import { BodyScreen } from './BodyScreen';

const state = () => useAppStore.getState().state;

/** A short history: three weigh-ins and two tape measurements. */
function seed() {
  actions.logMeasurement('2026-09-01', { kg: 82.4, neck: 38, waist: 88, arm: 36 });
  actions.logMeasurement('2026-09-20', { kg: 81.8 });
  actions.logMeasurement('2026-10-10', { kg: 81.2, neck: 38, waist: 86, arm: 36.5 });
}

describe('BodyScreen', () => {
  it('shows the sample weight and the body mass index', () => {
    render(<BodyScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Body' })).toBeInTheDocument();
    const weight = screen.getByRole('region', { name: 'Weight' });
    expect(weight).toHaveTextContent('Weight · Oct 14');
    expect(weight).toHaveTextContent('80kg');
    expect(weight).toHaveTextContent('The chart needs at least two entries.');
    expect(screen.getByText('BMI').nextElementSibling).toHaveTextContent('25.2');
    expect(screen.getByText('overweight · 178 cm')).toBeInTheDocument();
  });

  it('logs a measurement, accepting decimal commas and skipping empty fields', async () => {
    render(<BodyScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Log' }));
    const form = screen.getByRole('region', { name: 'Add a measurement' });
    fireEvent.change(within(form).getByLabelText('Date'), { target: { value: '2026-10-10' } });
    await userEvent.type(within(form).getByLabelText('Weight, kg'), '81,2');
    await userEvent.type(within(form).getByLabelText('Waist, cm'), '86');
    await userEvent.type(within(form).getByLabelText('Neck, cm'), '38');
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }));

    expect(state().bodyWeights).toEqual([{ date: '2026-10-10', kg: 81.2 }]);
    expect(state().measurements).toEqual([{ date: '2026-10-10', waist: 86, neck: 38 }]);
    expect(screen.queryByRole('region', { name: 'Add a measurement' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Weight' })).toHaveTextContent('81.2kg');
  });

  it('charts the weight with the change since the first entry', () => {
    seed();
    render(<BodyScreen />);
    const weight = screen.getByRole('region', { name: 'Weight' });
    expect(weight).toHaveTextContent('81.2kg');
    expect(weight).toHaveTextContent('−1.2 kg · 39 days');
    expect(within(weight).getByRole('img', { name: 'Weight over time' })).toBeInTheDocument();
  });

  it('switches the chart to another metric', async () => {
    seed();
    render(<BodyScreen />);
    expect(screen.getAllByRole('radio').map((r) => r.parentElement?.textContent)).toEqual([
      'Weight',
      'Body fat',
      'Neck',
      'Waist',
      'Arm',
    ]);
    await userEvent.click(screen.getByRole('radio', { name: 'Waist' }));
    const waist = screen.getByRole('region', { name: 'Waist' });
    expect(waist).toHaveTextContent('86cm');
    expect(waist).toHaveTextContent('−2 cm · 39 days');
  });

  it('summarizes body fat and girths as tiles', () => {
    seed();
    render(<BodyScreen />);
    // The metric switch has labels with the same text; the tiles come last.
    const tile = (label: string) => screen.getAllByText(label).at(-1)!.parentElement!;
    expect(tile('Body fat')).toHaveTextContent('17.2%');
    expect(tile('Body fat')).toHaveTextContent('−1.5% · US Navy estimate');
    expect(tile('Waist')).toHaveTextContent('86 cm');
    expect(tile('Arm')).toHaveTextContent('+0.5 cm');
  });

  it('lists the journal newest first and deletes an entry', async () => {
    seed();
    render(<BodyScreen />);
    const journal = screen.getByRole('region', { name: 'Journal' });
    const entries = within(journal).getAllByRole('listitem');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent('Sat, Oct 10, 2026');
    expect(entries[0]).toHaveTextContent('81.2 kg · Neck 38 · Waist 86 · Arm 36.5 · fat 17.2%');
    expect(entries[1]).toHaveTextContent('81.8 kg');

    await userEvent.click(
      within(journal).getByRole('button', { name: 'Delete the entry of Sun, Sep 20, 2026' }),
    );
    expect(state().bodyWeights.map((w) => w.date)).toEqual(['2026-09-01', '2026-10-10']);
    expect(within(journal).getAllByRole('listitem')).toHaveLength(2);
  });

  it('is translated to Russian', async () => {
    await i18n.changeLanguage('ru');
    seed();
    render(<BodyScreen />);
    expect(screen.getByRole('region', { name: 'Вес' })).toHaveTextContent('81,2кг');
    expect(screen.getByRole('region', { name: 'Вес' })).toHaveTextContent('−1,2 кг · 39 дней');
    expect(screen.getByText(/оценка по формуле ВМС США/)).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/i18n';
import { actions, useAppStore } from '@/store';

import { SettingsScreen } from './SettingsScreen';

const state = () => useAppStore.getState().state;
const section = (name: string) => screen.getByRole('region', { name });

describe('SettingsScreen: profile', () => {
  it('shows the sample profile', () => {
    render(<SettingsScreen />);
    const profile = section('Profile');
    expect(within(profile).getByLabelText('Age')).toHaveValue('30');
    expect(within(profile).getByLabelText('Height, cm')).toHaveValue('178');
    expect(within(profile).getByLabelText('Current weight, kg')).toHaveValue('80');
    expect(within(profile).getByRole('radio', { name: 'Male' })).toBeChecked();
    expect(within(profile).getByRole('radio', { name: /Intermediate/ })).toBeChecked();
    expect(within(profile).getByRole('radio', { name: 'Muscle gain' })).toBeChecked();
  });

  it('commits a number when the field is left and ends the sample mode', async () => {
    render(<SettingsScreen />);
    const age = screen.getByLabelText('Age');
    await userEvent.clear(age);
    await userEvent.type(age, '41');
    expect(state().profile.age).toBe(30); // not yet committed
    await userEvent.tab();
    expect(state().profile.age).toBe(41);
    expect(state().setupDone).toBe(true);
  });

  it('accepts a decimal comma and commits on Enter', async () => {
    render(<SettingsScreen />);
    const weight = screen.getByLabelText('Current weight, kg');
    await userEvent.clear(weight);
    await userEvent.type(weight, '79,4{Enter}');
    expect(state().bodyWeights).toEqual([{ date: '2026-10-14', kg: 79.4 }]);
  });

  it('clamps out-of-range numbers and drops text that is not a number', async () => {
    render(<SettingsScreen />);
    const age = screen.getByLabelText('Age');
    await userEvent.clear(age);
    await userEvent.type(age, '7{Enter}');
    expect(state().profile.age).toBe(14);

    await userEvent.clear(age);
    await userEvent.type(age, 'old');
    await userEvent.tab();
    expect(state().profile.age).toBe(14);
    expect(age).toHaveValue('14');
  });

  it('discards an edit on Escape', async () => {
    render(<SettingsScreen />);
    const height = screen.getByLabelText('Height, cm');
    await userEvent.clear(height);
    await userEvent.type(height, '190{Escape}');
    expect(height).toHaveValue('178');
    expect(state().profile.heightCm).toBe(178);
  });

  it('changes sex, level and goal', async () => {
    render(<SettingsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: 'Female' }));
    await userEvent.click(screen.getByRole('radio', { name: /Beginner/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Strength' }));
    expect(state().profile).toMatchObject({ sex: 'female', level: 'beginner', goal: 'strength' });
  });
});

describe('SettingsScreen: overall load', () => {
  it('nudges the scale and resets it to 100 %', async () => {
    render(<SettingsScreen />);
    const load = section('Overall load');
    expect(within(load).getByRole('status')).toHaveTextContent('100%');

    await userEvent.click(within(load).getByRole('button', { name: '−10%' }));
    await userEvent.click(within(load).getByRole('button', { name: '−5%' }));
    expect(state().loadScale).toBe(0.85);
    expect(within(load).getByRole('status')).toHaveTextContent('85%');
    expect(within(load).getByRole('slider')).toHaveValue('85');

    await userEvent.click(within(load).getByRole('button', { name: '+5%' }));
    expect(state().loadScale).toBe(0.9);

    await userEvent.click(within(load).getByRole('button', { name: '100%' }));
    expect(state().loadScale).toBe(1);
    expect(within(load).getByRole('button', { name: '100%' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('SettingsScreen: schedule', () => {
  it('toggles training days', async () => {
    render(<SettingsScreen />);
    const schedule = section('Schedule');
    expect(within(schedule).getByText(/3 days per week/)).toBeInTheDocument();
    expect(within(schedule).getByRole('checkbox', { name: 'Mon' })).toBeChecked();

    await userEvent.click(within(schedule).getByRole('checkbox', { name: 'Tue' }));
    await userEvent.click(within(schedule).getByRole('checkbox', { name: 'Fri' }));
    expect(state().schedule.days).toEqual([0, 1, 2]);
    expect(within(schedule).getByText(/3 days per week/)).toBeInTheDocument();
  });

  it('changes the plan length, deload and start without ending the sample mode', async () => {
    render(<SettingsScreen />);
    await userEvent.click(screen.getByRole('radio', { name: '8 weeks' }));
    await userEvent.click(screen.getByRole('radio', { name: 'No deload' }));
    fireEvent.change(screen.getByLabelText('Plan start'), { target: { value: '2026-11-02' } });

    expect(state().schedule).toMatchObject({ weeks: 8, deload: false, start: '2026-11-02' });
    expect(state().setupDone).toBe(false);
  });
});

describe('SettingsScreen: equipment', () => {
  it('shows the configuration of owned equipment only', () => {
    render(<SettingsScreen />);
    expect(screen.getByLabelText(/Dumbbells: available weights/)).toHaveValue(
      '2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24',
    );
    expect(screen.queryByLabelText(/Kettlebells: available weights/)).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Barbell' })).not.toBeInTheDocument();
  });

  it('explains how the plan changed after adding equipment', async () => {
    render(<SettingsScreen />);
    const equipment = section('Equipment at home');
    await userEvent.click(within(equipment).getByRole('checkbox', { name: 'Barbell' }));

    expect(state().equipment.bb).toBe(true);
    const summary = within(equipment).getByRole('status');
    expect(summary).toHaveTextContent('Added: barbell.');
    expect(summary).toHaveTextContent('The plan was rebuilt.');
    expect(summary).toHaveTextContent(/New exercises: .*“Barbell Deadlift”/);
    expect(summary).toHaveTextContent(/No longer in the plan: /);
    expect(summary).toHaveTextContent('Weights were recalculated.');

    const bar = within(equipment).getByRole('group', { name: 'Barbell' });
    expect(within(bar).getByLabelText('Bar, kg')).toHaveValue('20');
  });

  it('says so when a change does not affect the plan', async () => {
    render(<SettingsScreen />);
    const equipment = section('Equipment at home');
    await userEvent.click(within(equipment).getByRole('checkbox', { name: 'Medicine ball' }));
    expect(within(equipment).getByRole('status')).toHaveTextContent(
      'Added: medicine ball. The exercises in the plan did not change: what is already there fits better',
    );

    await userEvent.click(within(equipment).getByRole('checkbox', { name: 'Medicine ball' }));
    expect(within(equipment).getByRole('status')).toHaveTextContent(
      'Removed: medicine ball. The exercises in the plan did not change.',
    );
  });

  it('parses the typed dumbbell list', async () => {
    render(<SettingsScreen />);
    const list = screen.getByLabelText(/Dumbbells: available weights/);
    await userEvent.clear(list);
    await userEvent.type(list, '10 2.5 5, 7.5{Enter}');
    expect(state().equipmentConfig.db).toEqual([2.5, 5, 7.5, 10]);
    expect(list).toHaveValue('2.5, 5, 7.5, 10');
  });

  it('edits the barbell configuration', async () => {
    render(<SettingsScreen />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Barbell' }));
    const max = within(screen.getByRole('group', { name: 'Barbell' })).getByLabelText(
      'Maximum, kg',
    );
    await userEvent.clear(max);
    await userEvent.type(max, '140{Enter}');
    expect(state().equipmentConfig.bb).toEqual({ bar: 20, step: 2.5, max: 140 });
  });
});

describe('SettingsScreen: Russian', () => {
  it('uses decimal commas and semicolons in lists', async () => {
    await i18n.changeLanguage('ru');
    render(<SettingsScreen />);
    const list = screen.getByLabelText(/Гантели: какие веса есть/);
    await userEvent.clear(list);
    await userEvent.type(list, '2,5; 5; 7,5{Enter}');
    expect(state().equipmentConfig.db).toEqual([2.5, 5, 7.5]);
    expect(list).toHaveValue('2,5; 5; 7,5');
    expect(screen.getByText(/3 дня в неделю/)).toBeInTheDocument();
  });
});

describe('SettingsScreen: excluded exercises', () => {
  it('is hidden while nothing is excluded', () => {
    render(<SettingsScreen />);
    expect(screen.queryByRole('region', { name: 'Excluded exercises' })).not.toBeInTheDocument();
  });

  it('lists excluded exercises and restores them', async () => {
    actions.excludeExercise('Plank');
    actions.excludeExercise('Goblet_Squat');
    render(<SettingsScreen />);
    const excluded = section('Excluded exercises');
    expect(within(excluded).getAllByRole('button')).toHaveLength(2);

    await userEvent.click(within(excluded).getByRole('button', { name: 'Restore Plank' }));
    expect(state().excluded).toEqual({ Goblet_Squat: true });
  });
});

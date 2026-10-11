import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { i18n } from '@/i18n';
import { actions, useAppStore } from '@/store';

import { SessionScreen } from './SessionScreen';

// The sample plan starts on Monday 2026-10-19 with "Full body A".
const FIRST = '2026-10-19';
const state = () => useAppStore.getState().state;
const card = (name: string) => screen.getByRole('article', { name });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SessionScreen: overview', () => {
  it('introduces the session and explains the prescribed effort', () => {
    render(<SessionScreen sessionId={FIRST} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Full body A' })).toBeInTheDocument();
    expect(screen.getByText('Week 1 · Introduction')).toBeInTheDocument();
    expect(screen.getByText('Squat & chest press focus')).toBeInTheDocument();
    expect(screen.getByText('Mon, Oct 19 · about 45 min · 17 working sets')).toBeInTheDocument();
    expect(screen.getByText('3 reps in reserve.')).toBeInTheDocument();
    expect(screen.getByText(/Warm up for 5 minutes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to the plan/ })).toHaveAttribute(
      'href',
      '#/plan',
    );
  });

  it('explains a deload session differently', () => {
    render(<SessionScreen sessionId="2026-11-09" />);
    expect(screen.getByText('Week 4 · Deload')).toBeInTheDocument();
    expect(screen.getByText('Deload.')).toBeInTheDocument();
    expect(screen.getByText(/about 90% of the calculated weight/)).toBeInTheDocument();
  });

  it('renders nothing for a session that is not in the plan', () => {
    const { container } = render(<SessionScreen sessionId="2020-01-01" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SessionScreen: exercise card', () => {
  it('shows what to do for a weighted exercise', () => {
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Dumbbell Goblet Squat');
    expect(squat).toHaveTextContent('1 · compound');
    expect(squat).toHaveTextContent('quads · calves, glutes, hamstrings');
    expect(squat).toHaveTextContent('3 × 12');
    expect(squat).toHaveTextContent('24 kg');
    expect(squat).toHaveTextContent('one dumbbell');
    expect(squat).toHaveTextContent('The photos show a kettlebell and you have a dumbbell');
    expect(squat).toHaveTextContent('rest 1:45');
    expect(squat).toHaveTextContent('3 in reserve');
    expect(squat).toHaveTextContent('≈1RM 36 kg');
    expect(squat).toHaveTextContent('Warm-up sets: 12 kg × 8, 18 kg × 3');
    expect(squat).toHaveTextContent('Not enough weight for the target rep range');
  });

  it('shows pairs per hand and one-sided exercises per side', () => {
    render(<SessionScreen sessionId={FIRST} />);
    const press = card('Dumbbell Bench Press');
    expect(press).toHaveTextContent('2 × 22 kg');
    expect(press).toHaveTextContent('a dumbbell in each hand');
    expect(press).toHaveTextContent('≈1RM 30.5 kg per hand');
    expect(card('One-Arm Dumbbell Row')).toHaveTextContent('one dumbbell, each side');
  });

  it('shows holds in seconds with their limit', () => {
    render(<SessionScreen sessionId={FIRST} />);
    const plank = card('Plank');
    expect(plank).toHaveTextContent('6 · isolation');
    expect(plank).toHaveTextContent('2 × 55 s');
    expect(plank).toHaveTextContent('limit ≈75 s');
    expect(within(plank).queryByLabelText(/Weight/)).not.toBeInTheDocument();
    expect(within(plank).getByLabelText('Seconds')).toHaveValue('55');
  });

  it('breaks a barbell load down into plates', () => {
    actions.toggleEquipment('bb');
    actions.toggleEquipment('rack');
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Barbell Squat');
    expect(squat).toHaveTextContent('3 × 8');
    expect(squat).toHaveTextContent('72.5 kg');
    expect(squat).toHaveTextContent('bar 20 kg + 25 + 1.25 on each side');
  });

  it('explains the estimated one-rep max with today’s numbers on demand', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Dumbbell Goblet Squat');
    const toggle = within(squat).getByRole('button', { name: /≈1RM 36 kg/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(squat).toHaveTextContent('Today: 24 × (1 + (12 + 3) / 30) ≈ 36 kg');

    await userEvent.click(toggle);
    expect(squat).not.toHaveTextContent('Today: 24');
  });

  it('opens the photos full screen and closes them again', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    const open = screen.getByRole('button', {
      name: 'Open the photos of “Dumbbell Goblet Squat” full screen',
    });
    await userEvent.click(open);

    const viewer = screen.getByRole('dialog', { name: 'Dumbbell Goblet Squat' });
    expect(within(viewer).getByRole('img', { name: 'Start of the movement' })).toHaveAttribute(
      'src',
      '/exercises/Goblet_Squat/0.webp',
    );
    expect(within(viewer).getByRole('button', { name: 'Close' })).toHaveFocus();

    await userEvent.click(within(viewer).getByRole('button', { name: 'End' }));
    expect(within(viewer).getByRole('img', { name: 'End of the movement' })).toHaveAttribute(
      'src',
      '/exercises/Goblet_Squat/1.webp',
    );
    expect(within(viewer).getByRole('button', { name: 'End' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(viewer).getByRole('button', { name: 'Animate' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await userEvent.keyboard('{ArrowLeft}');
    expect(within(viewer).getByRole('img', { name: 'Start of the movement' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
  });
});

describe('SessionScreen: edits', () => {
  it('re-anchors the plan to an edited weight and reps', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Dumbbell Goblet Squat');

    await userEvent.selectOptions(within(squat).getByLabelText('Weight, kg'), '20');
    expect(state().overrides[`Goblet_Squat|${FIRST}`]).toEqual({ weight: 20, reps: 12 });
    expect(squat).toHaveTextContent('edited by you');

    const reps = within(squat).getByLabelText('Reps');
    await userEvent.clear(reps);
    await userEvent.type(reps, '10{Enter}');
    expect(state().overrides[`Goblet_Squat|${FIRST}`]).toEqual({ weight: 20, reps: 10 });
    expect(squat).toHaveTextContent('3 × 10');
    expect(squat).toHaveTextContent('≈1RM 28.5 kg');
  });

  it('restores the calculation', async () => {
    actions.editPrescription('Goblet_Squat', FIRST, { weight: 20, reps: 10 });
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Dumbbell Goblet Squat');
    await userEvent.click(within(squat).getByRole('button', { name: 'Restore the calculation' }));

    expect(state().overrides).toEqual({});
    expect(squat).toHaveTextContent('3 × 12');
    expect(
      within(squat).queryByRole('button', { name: 'Restore the calculation' }),
    ).not.toBeInTheDocument();
  });

  it('edits the seconds of a hold', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    const seconds = within(card('Plank')).getByLabelText('Seconds');
    await userEvent.clear(seconds);
    await userEvent.type(seconds, '70{Enter}');
    expect(state().overrides[`Plank|${FIRST}`]).toEqual({ reps: 70 });
    expect(card('Plank')).toHaveTextContent('2 × 70 s');
  });
});

describe('SessionScreen: replacing exercises', () => {
  it('lists the technique and lets the user pick a replacement by hand', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Dumbbell Goblet Squat');
    expect(within(squat).getAllByRole('listitem')[0]).toHaveTextContent(
      /^Stand holding a light kettlebell/,
    );
    expect(squat).toHaveTextContent('Goblet Squat · instructions from the open Free Exercise DB');

    const options = within(squat).getByRole('group', { name: 'Replace in this template' });
    expect(within(options).getByRole('button', { name: 'Dumbbell Goblet Squat' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(within(options).getByRole('button', { name: 'Dumbbell Squat' }));

    expect(state().swaps).toEqual({ 'FA|0': 'Dumbbell_Squat' });
    const replaced = card('Dumbbell Squat');
    expect(replaced).toHaveTextContent('1 · compound');

    await userEvent.click(within(replaced).getByRole('button', { name: 'Automatic' }));
    expect(state().swaps).toEqual({});
    expect(card('Dumbbell Goblet Squat')).toBeInTheDocument();
  });

  it('picks a random replacement and can undo it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<SessionScreen sessionId={FIRST} />);
    const button = within(card('Dumbbell Goblet Squat')).getByRole('button', {
      name: /Another exercise · 6 options/,
    });
    await userEvent.click(button);

    expect(state().swaps).toEqual({ 'FA|0': 'Dumbbell_Squat' });
    const note = within(card('Dumbbell Squat')).getByRole('status');
    expect(note).toHaveTextContent(
      'Replaced “Dumbbell Goblet Squat” in every “Full body A” session. Weights were recalculated.',
    );

    await userEvent.click(within(note).getByRole('button', { name: 'Undo' }));
    expect(state().swaps).toEqual({});
    expect(card('Dumbbell Goblet Squat')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps cycling without returning to the original, and undo goes all the way back', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<SessionScreen sessionId={FIRST} />);
    const again = () =>
      userEvent.click(screen.getAllByRole('button', { name: /Another exercise/ })[0]!);

    await again();
    const afterFirst = state().swaps['FA|0'];
    await again();
    const afterSecond = state().swaps['FA|0'];

    expect(afterFirst).toBe('Dumbbell_Squat');
    expect(afterSecond).not.toBe('Goblet_Squat');
    expect(afterSecond).not.toBe(afterFirst);
    expect(screen.getByRole('status')).toHaveTextContent('Replaced “Dumbbell Goblet Squat”');

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(state().swaps).toEqual({});
  });

  it('undo restores a replacement that was chosen by hand before', async () => {
    actions.swapExercise('FA|0', 'Bodyweight_Squat');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<SessionScreen sessionId={FIRST} />);

    await userEvent.click(screen.getAllByRole('button', { name: /Another exercise/ })[0]!);
    expect(state().swaps['FA|0']).not.toBe('Bodyweight_Squat');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(state().swaps).toEqual({ 'FA|0': 'Bodyweight_Squat' });
  });

  it('says so when there is nothing to replace an exercise with', () => {
    for (const id of ['db', 'bench', 'bands', 'box', 'bar'] as const) actions.toggleEquipment(id);
    for (const exercise of ['Calf_Raises_-_With_Bands']) actions.excludeExercise(exercise);
    render(<SessionScreen sessionId={FIRST} />);
    const calves = card('Standing Calf Raise');
    expect(within(calves).getByRole('button', { name: 'No other options' })).toBeDisabled();
  });

  it('removes an exercise from all workouts', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    await userEvent.click(
      within(card('Plank')).getByRole('button', { name: 'Remove from all workouts' }),
    );
    expect(state().excluded).toEqual({ Plank: true });
    expect(screen.queryByRole('article', { name: 'Plank' })).not.toBeInTheDocument();
  });
});

describe('SessionScreen: Russian', () => {
  it('translates the card and keeps the English technique marked as English', async () => {
    await i18n.changeLanguage('ru');
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Гоблет-присед с гантелью');
    expect(squat).toHaveTextContent('1 · базовое');
    expect(squat).toHaveTextContent('квадрицепс · икры, ягодицы, бицепс бедра');
    expect(squat).toHaveTextContent('отдых 1:45');
    expect(squat).toHaveTextContent('≈1ПМ 36 кг');
    expect(squat).toHaveTextContent('Другое упражнение · 6 вариантов');
    expect(within(squat).getByRole('list')).toHaveAttribute('lang', 'en');
    expect(card('Жим гантелей лёжа')).toHaveTextContent('2 × 22 кг');
    expect(card('Жим гантелей лёжа')).toHaveTextContent('≈1ПМ 30,5 кг на руку');
  });
});

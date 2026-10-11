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
    expect(screen.getByText('Set 1 of 17')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Week 1 · Introduction · 17 working sets · Squat & chest press focus · Mon, Oct 19 · about 45 min',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('3 reps in reserve.')).toBeInTheDocument();
    expect(screen.getByText(/Warm up for 5 minutes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to the plan/ })).toHaveAttribute(
      'href',
      '#/plan',
    );
  });

  it('explains a deload session differently', () => {
    render(<SessionScreen sessionId="2026-11-09" />);
    expect(screen.getByText(/^Week 4 · Deload · 12 working sets/)).toBeInTheDocument();
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
    expect(squat).toHaveTextContent('01 · compound');
    expect(squat).toHaveTextContent('quads · calves, glutes, hamstrings · one dumbbell');
    expect(squat).toHaveTextContent('3 × 12');
    expect(squat).toHaveTextContent('24 kg');
    expect(squat).toHaveTextContent('The photos show a kettlebell and you have a dumbbell');
    expect(squat).toHaveTextContent('Rest 1:45');
    expect(squat).toHaveTextContent('RIR 3');
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
    expect(card('One-Arm Dumbbell Row')).toHaveTextContent('one dumbbell · each side');
  });

  it('shows holds in seconds with their limit', () => {
    render(<SessionScreen sessionId={FIRST} />);
    const plank = card('Plank');
    expect(plank).toHaveTextContent('06 · isolation');
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

    await userEvent.click(within(squat).getByLabelText('Weight, kg'));
    await userEvent.click(screen.getByRole('option', { name: '20' }));
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
    expect(replaced).toHaveTextContent('01 · compound');

    await userEvent.click(within(replaced).getByRole('button', { name: 'Automatic' }));
    expect(state().swaps).toEqual({});
    expect(card('Dumbbell Goblet Squat')).toBeInTheDocument();
  });

  it('picks a random replacement and can undo it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<SessionScreen sessionId={FIRST} />);
    const button = within(card('Dumbbell Goblet Squat')).getByRole('button', {
      name: 'Swap for another exercise, 6 options',
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
      userEvent.click(screen.getAllByRole('button', { name: /Swap for another exercise/ })[0]!);

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

    await userEvent.click(screen.getAllByRole('button', { name: /Swap for another exercise/ })[0]!);
    expect(state().swaps['FA|0']).not.toBe('Bodyweight_Squat');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(state().swaps).toEqual({ 'FA|0': 'Bodyweight_Squat' });
  });

  it('says so when there is nothing to replace an exercise with', () => {
    for (const id of ['db', 'bench', 'bands', 'box', 'bar'] as const) actions.toggleEquipment(id);
    for (const exercise of ['Calf_Raises_-_With_Bands']) actions.excludeExercise(exercise);
    render(<SessionScreen sessionId={FIRST} />);
    const calves = card('Standing Calf Raise');
    expect(within(calves).getByRole('button', { name: 'No swaps' })).toBeDisabled();
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
  it('translates the card and its technique', async () => {
    await i18n.changeLanguage('ru');
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Гоблет-присед с гантелью');
    expect(squat).toHaveTextContent('01 · базовое');
    expect(squat).toHaveTextContent('квадрицепс · икры, ягодицы, бицепс бедра · одна гантель');
    expect(squat).toHaveTextContent('Отдых 1:45');
    expect(squat).toHaveTextContent('≈1ПМ 36 кг');
    expect(
      within(squat).getByRole('button', { name: 'Заменить другим упражнением, 6 вариантов' }),
    ).toHaveTextContent('Замена · 6');
    const steps = within(squat).getByRole('list');
    expect(steps).toHaveAttribute('lang', 'ru');
    expect(steps).toHaveTextContent('Встань и держи лёгкую гирю за дужку у груди.');
    expect(card('Жим гантелей лёжа')).toHaveTextContent('2 × 22 кг');
    expect(card('Жим гантелей лёжа')).toHaveTextContent('≈1ПМ 30,5 кг на руку');
  });
});

describe('SessionScreen: tracking sets', () => {
  const squat = () => card('Dumbbell Goblet Squat');
  const set = (name: string) => within(squat()).getByRole('button', { name });

  it('shows the sets of an exercise with the current one marked', () => {
    render(<SessionScreen sessionId={FIRST} />);
    const sets = within(squat()).getByRole('group', { name: 'Sets' });
    expect(
      within(sets)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Set 1, current', 'Set 2', 'Set 3']);
    expect(screen.getByRole('img', { name: '0% of sets done' })).toBeInTheDocument();
  });

  it('ticks a set, advances the progress and starts the rest timer for the next set', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    await userEvent.click(set('Set 1, current'));

    expect(set('Set 1, done')).toHaveAttribute('aria-pressed', 'true');
    expect(set('Set 2, current')).toBeInTheDocument();
    expect(useAppStore.getState().setLogs[FIRST]).toEqual({ Goblet_Squat: [true, false, false] });
    expect(screen.getByText('Set 2 of 17')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '6% of sets done' })).toBeInTheDocument();

    const timer = screen.getByRole('timer', { name: 'Rest timer' });
    expect(timer).toHaveTextContent('1:45');
    expect(timer).toHaveTextContent('Rest · set 2 of 3 next');
    expect(timer).toHaveTextContent('12 reps · 24 kg');
  });

  it('adjusts and skips the rest', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    await userEvent.click(set('Set 1, current'));
    const timer = screen.getByRole('timer');

    await userEvent.click(within(timer).getByRole('button', { name: '15 seconds more' }));
    expect(timer).toHaveTextContent('2:00');
    await userEvent.click(within(timer).getByRole('button', { name: '15 seconds less' }));
    await userEvent.click(within(timer).getByRole('button', { name: '15 seconds less' }));
    expect(timer).toHaveTextContent('1:30');

    await userEvent.click(within(timer).getByRole('button', { name: 'Skip' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('says go when the rest is over', async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    render(<SessionScreen sessionId={FIRST} />);
    await userEvent.click(set('Set 1, current'));

    vi.setSystemTime(new Date(2026, 9, 14, 12, 1, 46));
    const timer = screen.getByRole('timer');
    expect(await within(timer).findByText('Go')).toBeInTheDocument();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(
      within(timer).queryByRole('button', { name: '15 seconds more' }),
    ).not.toBeInTheDocument();
    await userEvent.click(within(timer).getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 9, 14, 12));
  });

  it('points the timer at the next exercise after the last set of one', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    await userEvent.click(set('Set 1, current'));
    await userEvent.click(set('Set 2, current'));
    await userEvent.click(set('Set 3, current'));

    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('Next: Dumbbell Bench Press');
    expect(timer).toHaveTextContent('set 1 of 3 · 8 reps · 2 × 22 kg');
    expect(useAppStore.getState().history.map((e) => e.exerciseId)).toEqual(['Goblet_Squat']);
  });

  it('unticks a set without starting the timer', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    await userEvent.click(set('Set 1, current'));
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await userEvent.click(set('Set 1, done'));

    expect(useAppStore.getState().setLogs[FIRST]?.Goblet_Squat).toEqual([false, false, false]);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('finishes the session with the last set', async () => {
    const all = Object.fromEntries(
      [
        'Dumbbell_Bench_Press',
        'One-Arm_Dumbbell_Row',
        'Stiff-Legged_Dumbbell_Deadlift',
        'Standing_Dumbbell_Press',
      ].map((exercise) => [exercise, [true, true, true]]),
    );
    useAppStore.setState({
      setLogs: { [FIRST]: { ...all, Goblet_Squat: [true, true, true], Plank: [true, false] } },
    });
    render(<SessionScreen sessionId={FIRST} />);
    await userEvent.click(within(card('Plank')).getByRole('button', { name: 'Set 2, current' }));

    expect(state().done).toEqual({ [FIRST]: true });
    expect(useAppStore.getState().history).toHaveLength(6);
    expect(screen.getByText('All 17 sets done · done')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marked as done' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('marks the session as done by hand and takes it back', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark as done' }));
    expect(state().done).toEqual({ [FIRST]: true });
    await userEvent.click(screen.getByRole('button', { name: 'Marked as done' }));
    expect(state().done).toEqual({});
  });
});

describe('SessionScreen: rating', () => {
  it('rates an exercise and previews the next session', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Dumbbell Goblet Squat');
    const rating = within(squat).getByRole('group', { name: 'How did it feel?' });
    expect(
      within(rating)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Easy', 'On plan', 'Hard', 'Missed']);

    await userEvent.click(within(rating).getByRole('button', { name: 'Easy' }));
    expect(state().overrides[`Goblet_Squat|${FIRST}`]).toEqual({ rating: 'easy' });
    expect(within(rating).getByRole('button', { name: 'Easy' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(squat).toHaveTextContent('rating applied');
    expect(squat).toHaveTextContent('Next time, Mon, Oct 26: 3 × 16 · 24 kg');

    await userEvent.click(within(rating).getByRole('button', { name: 'Easy' }));
    expect(state().overrides).toEqual({});
    expect(squat).not.toHaveTextContent('Next time');
  });

  it('asks for the real reps after a missed set', async () => {
    render(<SessionScreen sessionId={FIRST} />);
    const squat = card('Dumbbell Goblet Squat');
    await userEvent.click(within(squat).getByRole('button', { name: 'Missed' }));
    expect(squat).toHaveTextContent('enter how many you actually did');
  });
});

describe('SessionScreen: missed and skipped sessions', () => {
  it('explains a missed session and lets the user skip and restore it', async () => {
    vi.setSystemTime(new Date(2026, 9, 22, 12));
    render(<SessionScreen sessionId={FIRST} />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('This session was planned for Mon, Oct 19.');
    expect(within(banner).queryByRole('link', { name: 'Open' })).not.toBeInTheDocument();

    await userEvent.click(within(banner).getByRole('button', { name: 'Skip' }));
    expect(screen.getByRole('status')).toHaveTextContent('This session was skipped.');

    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(state().skipped).toEqual({});
    expect(screen.getByRole('status')).toHaveTextContent('This session was planned for');
    vi.setSystemTime(new Date(2026, 9, 14, 12));
  });

  it('says that the plan is extended when the last session is moved', () => {
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    render(<SessionScreen sessionId="2026-11-13" />);
    expect(screen.getByRole('status')).toHaveTextContent('the plan is extended by those days');
    vi.setSystemTime(new Date(2026, 9, 14, 12));
  });
});

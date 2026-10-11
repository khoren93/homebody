import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the product name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Homebody' })).toBeInTheDocument();
  });

  it('switches the interface language and remembers the choice', async () => {
    render(<App />);
    expect(screen.getByText('Home workout planner and load calculator')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Language'), 'ru');

    expect(
      await screen.findByText('Планировщик домашних тренировок и калькулятор нагрузок'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Язык')).toHaveValue('ru');
    expect(document.documentElement.lang).toBe('ru');
    expect(localStorage.getItem('homebody.locale')).toBe('ru');
  });
});

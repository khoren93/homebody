import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Banner } from '../Banner';
import { Button } from '../Button';
import { Field, Input } from '../Field';
import { ProgressBar } from '../ProgressBar';
import { Segmented } from '../Segmented';
import { Select } from '../Select';
import { Stat, StatGrid } from '../Stat';

describe('Button', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('type', 'button');
  });

  it('can be a submit button', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
  });
});

describe('Segmented', () => {
  const options = [
    { value: 4, label: '4 weeks' },
    { value: 8, label: '8 weeks' },
    { value: 12, label: '12 weeks', hint: 'three blocks' },
  ];

  it('is a named radio group with the current value checked', () => {
    render(<Segmented legend="Length" options={options} value={8} onChange={() => undefined} />);
    expect(screen.getByRole('group', { name: 'Length' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '8 weeks' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '4 weeks' })).not.toBeChecked();
  });

  it('reports the typed value of the chosen option', async () => {
    const onChange = vi.fn();
    render(<Segmented legend="Length" options={options} value={8} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /12 weeks/ }));
    expect(onChange).toHaveBeenCalledWith(12);
  });

  it('can be operated with the arrow keys', async () => {
    const onChange = vi.fn();
    render(<Segmented legend="Length" options={options} value={4} onChange={onChange} />);
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: '4 weeks' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(8);
  });
});

describe('Field', () => {
  it('connects the label and the hint to the control', () => {
    render(
      <Field label="Age" hint="In years">
        {(control) => <Input type="number" {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText('Age');
    expect(input).toHaveAccessibleDescription('In years');
  });
});

describe('Select', () => {
  const options = [
    { value: 'front', label: 'Front' },
    { value: 'side', label: 'Side' },
    { value: 'back', label: 'Back' },
  ];
  const renderSelect = (onChange = vi.fn()) => {
    render(
      <Field label="Pose">
        {(control) => <Select {...control} options={options} value="side" onChange={onChange} />}
      </Field>,
    );
    return { onChange, trigger: screen.getByRole('combobox', { name: 'Pose' }) };
  };

  it('shows the current option and keeps the list closed', () => {
    const { trigger } = renderSelect();
    expect(trigger).toHaveTextContent('Side');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('reports the option picked with the pointer and closes', async () => {
    const { onChange, trigger } = renderSelect();
    await userEvent.click(trigger);
    expect(screen.getByRole('option', { name: 'Side' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'Back' }));
    expect(onChange).toHaveBeenCalledWith('back');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('can be operated with the keyboard', async () => {
    const { onChange, trigger } = renderSelect();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Side' }).id,
    );
    await userEvent.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Back' }).id,
    );
    await userEvent.keyboard('{Home}{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith('front');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('finds an option by typing and leaves the value alone on Escape', async () => {
    const { onChange, trigger } = renderSelect();
    await userEvent.tab();
    await userEvent.keyboard('b');
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Back' }).id,
    );
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes when the user clicks elsewhere', async () => {
    const { onChange, trigger } = renderSelect();
    await userEvent.click(trigger);
    await userEvent.click(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ProgressBar', () => {
  it('exposes its value to assistive technology', () => {
    render(<ProgressBar value={3} max={12} label="Sets done" />);
    const bar = screen.getByRole('progressbar', { name: 'Sets done' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '12');
  });

  it('copes with an empty total', () => {
    render(<ProgressBar value={0} max={0} label="Sets done" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('Banner and Stat', () => {
  it('renders the message with its actions', () => {
    render(
      <Banner role="alert" actions={<Button>Fix</Button>}>
        Something needs attention
      </Banner>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something needs attention');
    expect(screen.getByRole('button', { name: 'Fix' })).toBeInTheDocument();
  });

  it('pairs a figure with its caption', () => {
    render(
      <StatGrid>
        <Stat value="12" label="sessions" />
      </StatGrid>,
    );
    expect(screen.getByText('sessions')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});

import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cx } from '@/lib/cx';

import { Icon } from './Icon';
import styles from './Select.module.css';

export type SelectOption<T> = { value: T; label: string };

type Props<T> = {
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `sm` is the compact control for dense layouts. */
  size?: 'md' | 'sm';
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
};

/** Distance between the trigger and the list, and between the list and the viewport edge. */
const GAP = 6;
/** The list scrolls once it is taller than this. */
const MAX_HEIGHT = 320;
/** Keys typed within this time of each other are searched for as one word. */
const TYPEAHEAD_MS = 600;

/**
 * A single-choice menu in the design system's own look. It follows the
 * select-only combobox pattern: focus stays on the trigger while the arrow
 * keys, Home, End and typing move through the list, Enter picks an option and
 * Escape closes it.
 */
export function Select<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ...rest
}: Props<T>) {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  // The highlighted option while the list is open, null while it is closed.
  const [active, setActive] = useState<number | null>(null);
  const open = active !== null;
  const selected = options.findIndex((option) => option.value === value);
  const optionId = (index: number) => `${listId}-${index}`;

  const highlight = (index: number) => setActive(Math.max(0, Math.min(options.length - 1, index)));
  const choose = (index: number) => {
    const option = options[index];
    setActive(null);
    if (option && option.value !== value) onChange(option.value);
  };

  // The list is drawn above the page, so cards that clip their content cannot
  // cut it off. It opens below the trigger, or above it when there is no room.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      const menu = list.current;
      if (!anchor || !menu) return;
      const below = window.innerHeight - anchor.bottom - GAP * 2;
      const above = anchor.top - GAP * 2;
      const up = below < Math.min(menu.scrollHeight, MAX_HEIGHT) && above > below;
      menu.style.minWidth = `${anchor.width}px`;
      menu.style.maxHeight = `${Math.min(Math.max(up ? above : below, 0), MAX_HEIGHT)}px`;
      menu.style.top = up ? '' : `${anchor.bottom + GAP}px`;
      menu.style.bottom = up ? `${window.innerHeight - anchor.top + GAP}px` : '';
      const maxLeft = window.innerWidth - menu.offsetWidth - GAP;
      menu.style.left = `${Math.max(GAP, Math.min(anchor.left, maxLeft))}px`;
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !list.current?.contains(target)) setActive(null);
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (active === null) return;
    list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const move = (index: number) => {
      event.preventDefault();
      highlight(index);
    };

    switch (event.key) {
      case 'ArrowDown':
        return move(active === null ? selected : active + 1);
      case 'ArrowUp':
        return move(active === null ? selected : active - 1);
      case 'Home':
        return move(0);
      case 'End':
        return move(options.length - 1);
      case 'Enter':
      case ' ':
        event.preventDefault();
        return active === null ? highlight(selected) : choose(active);
      case 'Escape':
        if (active !== null) {
          event.preventDefault();
          setActive(null);
        }
        return;
      case 'Tab':
        if (active !== null) choose(active);
        return;
      default: {
        if (event.key.length !== 1) return;
        const recent = event.timeStamp - typed.current.at < TYPEAHEAD_MS;
        const text = (recent ? typed.current.text : '') + event.key.toLocaleLowerCase();
        typed.current = { text, at: event.timeStamp };
        const match = options.findIndex((option) =>
          option.label.toLocaleLowerCase().startsWith(text),
        );
        if (match >= 0) move(match);
      }
    }
  };

  return (
    <>
      <button
        {...rest}
        ref={trigger}
        type="button"
        role="combobox"
        className={cx(styles.trigger, size === 'sm' && styles.sm, className)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={active === null ? undefined : optionId(active)}
        onClick={() => {
          // Safari does not focus a button on click, and the keyboard needs the focus here.
          trigger.current?.focus();
          if (open) setActive(null);
          else highlight(selected);
        }}
        onKeyDown={onKeyDown}
        // A button is clicked when Space is released; the key has been handled already.
        onKeyUp={(event) => event.key === ' ' && event.preventDefault()}
        onBlur={() => setActive(null)}
      >
        <span className={styles.value}>{options[selected]?.label}</span>
        <span className={styles.chevron}>
          <Icon name="chevron" />
        </span>
      </button>
      {open &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            className={cx(styles.list, size === 'sm' && styles.sm)}
            aria-label={rest['aria-label']}
            aria-labelledby={rest['aria-label'] ? undefined : rest.id}
            onMouseDown={(event) => event.preventDefault()}
          >
            {options.map((option, index) => (
              // The options are operated from the trigger, which keeps the focus.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={String(option.value)}
                id={optionId(index)}
                role="option"
                className={styles.option}
                aria-selected={index === selected}
                data-active={index === active || undefined}
                onClick={() => choose(index)}
                onPointerMove={() => index !== active && setActive(index)}
              >
                {option.label}
                {index === selected && (
                  <span className={styles.check}>
                    <Icon name="check" />
                  </span>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}

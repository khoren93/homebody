import { afterEach, describe, expect, it } from 'vitest';

import { applyTheme, getTheme, setTheme } from '../theme';

afterEach(() => {
  applyTheme('system');
});

describe('theme', () => {
  it('follows the system by default', () => {
    expect(getTheme()).toBe('system');
    applyTheme(getTheme());
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('applies and remembers an explicit choice', () => {
    setTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('homebody.theme')).toBe('dark');
    expect(getTheme()).toBe('dark');
  });

  it('forgets the choice when going back to the system theme', () => {
    setTheme('light');
    setTheme('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem('homebody.theme')).toBeNull();
  });

  it('ignores a saved value it does not know', () => {
    localStorage.setItem('homebody.theme', 'sepia');
    expect(getTheme()).toBe('system');
  });
});

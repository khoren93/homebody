import { describe, expect, it } from 'vitest';

import tokensCss from './tokens.css?raw';

const sheets = import.meta.glob<string>('/src/**/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Custom properties that components set themselves, as parameters of a component. */
const LOCAL = new Set(['--gap', '--count', '--well', '--field-bg', '--tabs-track', '--series']);

const defined = new Set([...tokensCss.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]));

describe('design tokens', () => {
  it('defines every custom property that a stylesheet uses', () => {
    const missing: string[] = [];
    for (const [file, css] of Object.entries(sheets)) {
      for (const [, name] of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (name && !defined.has(name) && !LOCAL.has(name)) missing.push(`${file}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps raw colors in the token file', () => {
    const offenders: string[] = [];
    for (const [file, css] of Object.entries(sheets)) {
      if (file.endsWith('/styles/tokens.css') || file.includes('/fonts.css')) continue;
      const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
      if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(withoutComments)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('gives every color token a value for both themes', () => {
    const colors = [...tokensCss.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)].filter(
      ([, , value]) => /#[0-9a-f]{3,8}/i.test(value ?? ''),
    );
    expect(colors.length).toBeGreaterThan(25);
    // A few tokens are the same in both themes on purpose and are written as a single color.
    const sameInBoth = new Set(['--on-accent', '--photo-plate', '--overlay', '--on-overlay']);
    for (const [, name, value] of colors) {
      if (name && !sameInBoth.has(name)) expect(value, name).toMatch(/^light-dark\(/);
    }
  });
});

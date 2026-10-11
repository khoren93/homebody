import { describe, expect, it } from 'vitest';

import { EQUIPMENT_IDS, MUSCLE_IDS } from '@/data';
import { TEMPLATES } from '@/engine';

import { DEFAULT_LOCALE, LOCALE_NAMES, LOCALES } from '../locale';
import en from '../locales/en.json';
import ru from '../locales/ru.json';

const resources: Record<string, unknown> = { en, ru };
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Flattens a resource tree into `a.b.c` → string. */
function flatten(node: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof node === 'string') {
    out.set(prefix, node);
  } else if (typeof node === 'object' && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      for (const [k, v] of flatten(value, prefix ? `${prefix}.${key}` : key)) out.set(k, v);
    }
  }
  return out;
}

/** Keys with plural suffixes removed, because languages have different plural forms. */
function baseKeys(flat: Map<string, string>): string[] {
  return [...new Set([...flat.keys()].map((key) => key.replace(PLURAL_SUFFIX, '')))].sort();
}

function variables(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)[^}]*\}\}/g)].map((m) => m[1] ?? '').sort();
}

describe('locale resources', () => {
  const fallback = flatten(resources[DEFAULT_LOCALE]);

  it('names every supported locale', () => {
    expect(Object.keys(LOCALE_NAMES).sort()).toEqual([...LOCALES].sort());
    expect(Object.keys(resources).sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES)('%s has exactly the same keys as the fallback locale', (locale) => {
    expect(baseKeys(flatten(resources[locale]))).toEqual(baseKeys(fallback));
  });

  it.each(LOCALES)('%s has no empty strings', (locale) => {
    for (const [key, value] of flatten(resources[locale])) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it.each(LOCALES)('%s uses the same interpolation variables as the fallback', (locale) => {
    const flat = flatten(resources[locale]);
    const variablesOf = (source: Map<string, string>, base: string) =>
      [...source]
        .filter(([key]) => key.replace(PLURAL_SUFFIX, '') === base)
        .map(([, text]) => variables(text).join(','));

    for (const base of baseKeys(flat)) {
      const expected = new Set(variablesOf(fallback, base));
      for (const used of variablesOf(flat, base)) expect(expected.has(used), base).toBe(true);
    }
  });

  it('has every plural form each language needs', () => {
    const forms: Record<string, string[]> = {
      en: ['one', 'other'],
      ru: ['one', 'few', 'many', 'other'],
    };
    for (const locale of LOCALES) {
      const flat = flatten(resources[locale]);
      const plurals = new Set(
        [...flat.keys()]
          .filter((k) => PLURAL_SUFFIX.test(k))
          .map((k) => k.replace(PLURAL_SUFFIX, '')),
      );
      for (const base of plurals) {
        for (const form of forms[locale] ?? []) {
          expect(flat.has(`${base}_${form}`), `${locale}: ${base}_${form}`).toBe(true);
        }
      }
    }
  });

  it('covers every muscle, equipment item and template', () => {
    for (const locale of LOCALES) {
      const flat = flatten(resources[locale]);
      for (const id of MUSCLE_IDS) {
        expect(flat.has(`muscles.${id}.name`), `${locale}: ${id}`).toBe(true);
        expect(flat.has(`muscles.${id}.about`), `${locale}: ${id}`).toBe(true);
      }
      for (const id of EQUIPMENT_IDS) {
        expect(flat.has(`equipment.${id}.name`), `${locale}: ${id}`).toBe(true);
      }
      for (const id of Object.keys(TEMPLATES)) {
        expect(flat.has(`templates.${id}.name`), `${locale}: ${id}`).toBe(true);
        expect(flat.has(`templates.${id}.focus`), `${locale}: ${id}`).toBe(true);
      }
    }
  });
});

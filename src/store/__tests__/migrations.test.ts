import { describe, expect, it } from 'vitest';

import { createSampleState } from '../defaults';
import { migrateState, type Migration, StateFormatError, upgradeDocument } from '../migrations';
import { AppStateSchema, STATE_VERSION } from '../schema';

const sample = createSampleState('2026-10-14');

describe('sample state', () => {
  it('is a valid state document that starts next Monday', () => {
    expect(AppStateSchema.parse(sample)).toEqual(sample);
    expect(sample.schedule.start).toBe('2026-10-19');
    expect(sample.bodyWeights).toEqual([{ date: '2026-10-14', kg: 80 }]);
    expect(sample.setupDone).toBe(false);
  });

  it('starts today when today is a Monday', () => {
    expect(createSampleState('2026-10-12').schedule.start).toBe('2026-10-12');
  });
});

describe('migrateState', () => {
  it('accepts a current document and drops unknown fields', () => {
    expect(migrateState({ ...sample, somethingElse: 1 })).toEqual(sample);
  });

  it.each([
    ['null', null],
    ['a string', 'state'],
    ['a document without a version', { ...sample, version: undefined }],
    ['a document with a fractional version', { ...sample, version: 1.5 }],
    ['a document with version 0', { ...sample, version: 0 }],
  ])('rejects %s', (_label, raw) => {
    expect(() => migrateState(raw)).toThrow(StateFormatError);
  });

  it('refuses data saved by a newer version of the app', () => {
    expect(() => migrateState({ ...sample, version: STATE_VERSION + 1 })).toThrow(/newer version/);
  });

  it('reports where an invalid document is wrong', () => {
    const badAge = { ...sample, profile: { ...sample.profile, age: 'thirty' } };
    const badDate = { ...sample, schedule: { ...sample.schedule, start: 'soon' } };
    expect(() => migrateState(badAge)).toThrow(/profile\.age/);
    expect(() => migrateState(badDate)).toThrow(/schedule\.start/);
  });
});

describe('upgradeDocument', () => {
  const migrations: Record<number, Migration> = {
    1: ({ scale, ...rest }) => ({ ...rest, loadScale: scale }),
    2: (doc) => ({ ...doc, block: 1 }),
  };

  it('applies each migration in order and stamps the new version', () => {
    expect(upgradeDocument({ version: 1, scale: 0.9 }, migrations, 3)).toEqual({
      version: 3,
      loadScale: 0.9,
      block: 1,
    });
  });

  it('starts from the version of the document', () => {
    expect(upgradeDocument({ version: 2, loadScale: 1 }, migrations, 3)).toEqual({
      version: 3,
      loadScale: 1,
      block: 1,
    });
  });

  it('leaves a current document untouched', () => {
    const current = { version: 3, loadScale: 1, block: 2 };
    expect(upgradeDocument(current, migrations, 3)).toBe(current);
  });

  it('fails when a step of the chain is missing', () => {
    expect(() => upgradeDocument({ version: 1 }, { 2: migrations[2]! }, 3)).toThrow(
      /No migration from state format 1/,
    );
  });
});

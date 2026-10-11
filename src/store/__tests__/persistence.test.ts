import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import type { HistoryEntry } from '@/engine';

import { HomebodyDb } from '../db';
import { createSampleState } from '../defaults';
import { StateFormatError } from '../migrations';
import {
  createDexiePersistence,
  createMemoryPersistence,
  fromSetLogs,
  type Persistence,
  toSetLogs,
} from '../persistence';
import type { Photo } from '../schema';

const state = createSampleState('2026-10-12');

function entry(exerciseId: string, sessionId: string, capacity = 30): HistoryEntry {
  return {
    sessionId,
    exerciseId,
    date: sessionId,
    weight: 20,
    reps: 10,
    sets: 3,
    capacity,
    rating: null,
  };
}

function photo(id: string): Photo {
  return {
    id,
    date: '2026-10-12',
    pose: 'front',
    image: 'data:image/jpeg;base64,AAAA',
    createdAt: 1,
  };
}

let counter = 0;
const databases: HomebodyDb[] = [];

const implementations: [string, () => Persistence][] = [
  ['memory', () => createMemoryPersistence()],
  [
    'IndexedDB',
    () => {
      const db = new HomebodyDb(`homebody-test-${counter++}`);
      databases.push(db);
      return createDexiePersistence(db);
    },
  ],
];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

describe.each(implementations)('%s persistence', (_name, create) => {
  it('has nothing stored on first launch', async () => {
    expect(await create().load()).toBeNull();
  });

  it('saves and loads the state document', async () => {
    const persistence = create();
    await persistence.saveState(state);
    await persistence.saveState({ ...state, block: 2 });
    expect((await persistence.load())?.state).toEqual({ ...state, block: 2 });
  });

  it('upserts and deletes history by exercise and session', async () => {
    const persistence = create();
    await persistence.saveState(state);
    await persistence.putHistory([entry('Plank', '2026-10-12'), entry('Pushups', '2026-10-12')]);
    await persistence.putHistory([entry('Plank', '2026-10-12', 99), entry('Plank', '2026-10-14')]);
    await persistence.deleteHistory([['Pushups', '2026-10-12']]);

    const history = (await persistence.load())?.history ?? [];
    expect(history.map((e) => [e.exerciseId, e.sessionId, e.capacity]).sort()).toEqual([
      ['Plank', '2026-10-12', 99],
      ['Plank', '2026-10-14', 30],
    ]);
  });

  it('stores set logs per session', async () => {
    const persistence = create();
    await persistence.saveState(state);
    await persistence.putSetLog({ sessionId: '2026-10-12', sets: { Plank: [true] } });
    await persistence.putSetLog({ sessionId: '2026-10-12', sets: { Plank: [true, true] } });
    await persistence.putSetLog({ sessionId: '2026-10-14', sets: { Pushups: [true, false] } });
    await persistence.deleteSetLog('2026-10-14');

    expect((await persistence.load())?.setLogs).toEqual({ '2026-10-12': { Plank: [true, true] } });
  });

  it('stores photos separately from the snapshot', async () => {
    const persistence = create();
    await persistence.putPhoto(photo('a'));
    await persistence.putPhoto(photo('b'));
    await persistence.deletePhoto('a');
    expect((await persistence.listPhotos()).map((p) => p.id)).toEqual(['b']);
    expect(await persistence.load()).toBeNull();
  });

  it('restores a full data set, replacing the snapshot and merging photos', async () => {
    const persistence = create();
    await persistence.saveState(state);
    await persistence.putHistory([entry('Plank', '2026-10-12')]);
    await persistence.putSetLog({ sessionId: '2026-10-12', sets: { Plank: [true] } });
    await persistence.putPhoto(photo('kept'));

    await persistence.restore({
      state: { ...state, block: 3 },
      history: [entry('Pushups', '2026-10-19')],
      setLogs: { '2026-10-19': { Pushups: [true] } },
      photos: [photo('imported')],
    });

    const loaded = await persistence.load();
    expect(loaded?.state.block).toBe(3);
    expect(loaded?.history.map((e) => e.exerciseId)).toEqual(['Pushups']);
    expect(loaded?.setLogs).toEqual({ '2026-10-19': { Pushups: [true] } });
    expect((await persistence.listPhotos()).map((p) => p.id).sort()).toEqual(['imported', 'kept']);
  });

  it('clears everything', async () => {
    const persistence = create();
    await persistence.saveState(state);
    await persistence.putHistory([entry('Plank', '2026-10-12')]);
    await persistence.putPhoto(photo('a'));
    await persistence.clear();
    expect(await persistence.load()).toBeNull();
    expect(await persistence.listPhotos()).toEqual([]);
  });

  it('refuses to load a state document it cannot read', async () => {
    const persistence = create();
    await persistence.saveState({ ...state, version: 99 } as never);
    await expect(persistence.load()).rejects.toBeInstanceOf(StateFormatError);
  });
});

describe('IndexedDB persistence', () => {
  it('skips damaged rows instead of failing the whole load', async () => {
    const db = new HomebodyDb(`homebody-test-${counter++}`);
    databases.push(db);
    const persistence = createDexiePersistence(db);
    await persistence.saveState(state);
    await db.history.bulkPut([
      entry('Plank', '2026-10-12'),
      { ...entry('Pushups', '2026-10-12'), sets: 'three' } as never,
    ]);
    await db.photos.bulkPut([photo('ok'), { ...photo('bad'), image: 'not-a-data-url' }]);

    expect((await persistence.load())?.history.map((e) => e.exerciseId)).toEqual(['Plank']);
    expect((await persistence.listPhotos()).map((p) => p.id)).toEqual(['ok']);
  });
});

describe('set log conversion', () => {
  it('round-trips between rows and the in-memory map', () => {
    const logs = { '2026-10-12': { Plank: [true, false] }, '2026-10-14': {} };
    expect(toSetLogs(fromSetLogs(logs))).toEqual(logs);
  });
});

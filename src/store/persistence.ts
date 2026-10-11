import type { HistoryEntry } from '@/engine';

import type { HomebodyDb } from './db';
import { migrateState } from './migrations';
import {
  type AppState,
  HistoryEntrySchema,
  type Photo,
  PhotoSchema,
  type SetLog,
  SetLogSchema,
} from './schema';
import type { SetLogs, Snapshot } from './types';

/** Everything that can be written to a backup file or restored from one. */
export type FullData = Snapshot & { photos: Photo[] };

/**
 * Storage port of the store. The app talks to IndexedDB through Dexie; tests
 * and browsers without IndexedDB use the in-memory implementation.
 */
export type Persistence = {
  readonly kind: 'indexeddb' | 'memory';
  /** Reads the stored snapshot, or null on first launch. Throws on corrupt data. */
  load(): Promise<Snapshot | null>;
  saveState(state: AppState): Promise<void>;
  putHistory(entries: readonly HistoryEntry[]): Promise<void>;
  deleteHistory(keys: readonly HistoryKey[]): Promise<void>;
  putSetLog(log: SetLog): Promise<void>;
  deleteSetLog(sessionId: string): Promise<void>;
  listPhotos(): Promise<Photo[]>;
  putPhoto(photo: Photo): Promise<void>;
  deletePhoto(id: string): Promise<void>;
  /** Replaces the state, history and set logs, and adds or replaces the given photos. */
  restore(data: FullData): Promise<void>;
  /** Deletes everything. */
  clear(): Promise<void>;
};

export type HistoryKey = [exerciseId: string, sessionId: string];

export function historyKey(entry: Pick<HistoryEntry, 'exerciseId' | 'sessionId'>): HistoryKey {
  return [entry.exerciseId, entry.sessionId];
}

export function toSetLogs(rows: readonly SetLog[]): SetLogs {
  return Object.fromEntries(rows.map((row) => [row.sessionId, row.sets]));
}

export function fromSetLogs(logs: SetLogs): SetLog[] {
  return Object.entries(logs).map(([sessionId, sets]) => ({ sessionId, sets }));
}

/** Drops rows that do not match the schema instead of failing the whole load. */
function keepValid<T>(
  rows: readonly unknown[],
  schema: { safeParse(v: unknown): { success: boolean; data?: T } },
): T[] {
  const valid: T[] = [];
  for (const row of rows) {
    const result = schema.safeParse(row);
    if (result.success && result.data !== undefined) valid.push(result.data);
  }
  return valid;
}

export function createDexiePersistence(db: HomebodyDb): Persistence {
  return {
    kind: 'indexeddb',

    async load() {
      const [row, history, setLogs] = await Promise.all([
        db.state.get('app'),
        db.history.toArray(),
        db.setLogs.toArray(),
      ]);
      if (!row) return null;
      return {
        state: migrateState(row.data),
        history: keepValid(history, HistoryEntrySchema),
        setLogs: toSetLogs(keepValid(setLogs, SetLogSchema)),
      };
    },

    async saveState(state) {
      await db.state.put({ id: 'app', data: state, updatedAt: Date.now() });
    },

    async putHistory(entries) {
      await db.history.bulkPut([...entries]);
    },

    async deleteHistory(keys) {
      await db.history.bulkDelete([...keys]);
    },

    async putSetLog(log) {
      await db.setLogs.put(log);
    },

    async deleteSetLog(sessionId) {
      await db.setLogs.delete(sessionId);
    },

    async listPhotos() {
      return keepValid(await db.photos.toArray(), PhotoSchema);
    },

    async putPhoto(photo) {
      await db.photos.put(photo);
    },

    async deletePhoto(id) {
      await db.photos.delete(id);
    },

    async restore(data) {
      await db.transaction('rw', db.state, db.history, db.setLogs, db.photos, async () => {
        await Promise.all([db.history.clear(), db.setLogs.clear()]);
        await db.state.put({ id: 'app', data: data.state, updatedAt: Date.now() });
        await db.history.bulkPut(data.history);
        await db.setLogs.bulkPut(fromSetLogs(data.setLogs));
        await db.photos.bulkPut(data.photos);
      });
    },

    async clear() {
      await db.transaction('rw', db.state, db.history, db.setLogs, db.photos, async () => {
        await Promise.all([
          db.state.clear(),
          db.history.clear(),
          db.setLogs.clear(),
          db.photos.clear(),
        ]);
      });
    },
  };
}

/** Keeps everything in memory. Used by tests and when IndexedDB is unavailable. */
export function createMemoryPersistence(initial?: Partial<FullData>): Persistence {
  let state: AppState | null = initial?.state ?? null;
  const history = new Map<string, HistoryEntry>(
    (initial?.history ?? []).map((entry) => [historyKey(entry).join('|'), entry]),
  );
  const setLogs = new Map<string, SetLog>(
    fromSetLogs(initial?.setLogs ?? {}).map((log) => [log.sessionId, log]),
  );
  const photos = new Map<string, Photo>((initial?.photos ?? []).map((p) => [p.id, p]));

  return {
    kind: 'memory',

    // eslint-disable-next-line @typescript-eslint/require-await -- async so a bad document rejects
    async load() {
      if (!state) return null;
      return {
        state: migrateState(state),
        history: [...history.values()],
        setLogs: toSetLogs([...setLogs.values()]),
      };
    },

    saveState(next) {
      state = next;
      return Promise.resolve();
    },

    putHistory(entries) {
      for (const entry of entries) history.set(historyKey(entry).join('|'), entry);
      return Promise.resolve();
    },

    deleteHistory(keys) {
      for (const key of keys) history.delete(key.join('|'));
      return Promise.resolve();
    },

    putSetLog(log) {
      setLogs.set(log.sessionId, log);
      return Promise.resolve();
    },

    deleteSetLog(sessionId) {
      setLogs.delete(sessionId);
      return Promise.resolve();
    },

    listPhotos: () => Promise.resolve([...photos.values()]),

    putPhoto(photo) {
      photos.set(photo.id, photo);
      return Promise.resolve();
    },

    deletePhoto(id) {
      photos.delete(id);
      return Promise.resolve();
    },

    restore(data) {
      state = data.state;
      history.clear();
      setLogs.clear();
      for (const entry of data.history) history.set(historyKey(entry).join('|'), entry);
      for (const log of fromSetLogs(data.setLogs)) setLogs.set(log.sessionId, log);
      for (const photo of data.photos) photos.set(photo.id, photo);
      return Promise.resolve();
    },

    clear() {
      state = null;
      history.clear();
      setLogs.clear();
      photos.clear();
      return Promise.resolve();
    },
  };
}

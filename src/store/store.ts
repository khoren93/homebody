import { create } from 'zustand';

import { type HistoryEntry, type IsoDate, toIsoDate } from '@/engine';

import { createSampleSnapshot } from './defaults';
import { StateFormatError } from './migrations';
import {
  createMemoryPersistence,
  type FullData,
  type HistoryKey,
  historyKey,
  type Persistence,
} from './persistence';
import type { Patch, Snapshot } from './types';

export type StoreStatus = 'loading' | 'ready' | 'error';

export type StoreState = Snapshot & {
  status: StoreStatus;
  /** Where data is kept. `memory` means nothing survives a reload. */
  storage: Persistence['kind'];
  /** Why the stored data could not be loaded, when `status` is `error`. */
  loadError: string | null;
  /** True after a write to storage failed. */
  saveFailed: boolean;
};

export const useAppStore = create<StoreState>(() => ({
  ...createSampleSnapshot(toIsoDate(new Date())),
  status: 'loading',
  storage: 'memory',
  loadError: null,
  saveFailed: false,
}));

let persistence: Persistence = createMemoryPersistence();
let writes: Promise<void> = Promise.resolve();
/** True while a write of the state document is queued but has not started yet. */
let stateSaveQueued = false;

function snapshotOf(store: StoreState): Snapshot {
  return { state: store.state, history: store.history, setLogs: store.setLogs };
}

/** Runs storage writes one after another and records failures instead of throwing. */
function enqueue(write: () => Promise<void>): void {
  writes = writes.then(write).catch((error: unknown) => {
    console.error('Homebody could not save data', error);
    useAppStore.setState({ saveFailed: true });
  });
}

/**
 * Queues a write of the state document. Writes start right away, so closing
 * the page a moment after an edit does not lose it; edits that arrive while a
 * write is already queued are covered by that write.
 */
function queueStateSave(): void {
  if (stateSaveQueued) return;
  stateSaveQueued = true;
  const target = persistence;
  enqueue(() => {
    stateSaveQueued = false;
    return target.saveState(useAppStore.getState().state);
  });
}

function historyChanges(
  previous: readonly HistoryEntry[],
  next: readonly HistoryEntry[],
): { put: HistoryEntry[]; remove: HistoryKey[] } {
  const before = new Map(previous.map((entry) => [historyKey(entry).join('|'), entry]));
  const put: HistoryEntry[] = [];
  for (const entry of next) {
    const key = historyKey(entry).join('|');
    if (before.get(key) !== entry) put.push(entry);
    before.delete(key);
  }
  return { put, remove: [...before.values()].map(historyKey) };
}

/** Writes whatever differs between two snapshots to storage. */
function persistChanges(previous: Snapshot, next: Snapshot): void {
  const target = persistence;

  if (next.state !== previous.state) queueStateSave();

  if (next.history !== previous.history) {
    const { put, remove } = historyChanges(previous.history, next.history);
    if (put.length > 0) enqueue(() => target.putHistory(put));
    if (remove.length > 0) enqueue(() => target.deleteHistory(remove));
  }

  if (next.setLogs !== previous.setLogs) {
    const sessionIds = new Set([...Object.keys(previous.setLogs), ...Object.keys(next.setLogs)]);
    for (const sessionId of sessionIds) {
      const sets = next.setLogs[sessionId];
      if (sets === previous.setLogs[sessionId]) continue;
      if (sets) enqueue(() => target.putSetLog({ sessionId, sets }));
      else enqueue(() => target.deleteSetLog(sessionId));
    }
  }
}

/**
 * Loads the stored data into the store. Call once at startup.
 *
 * - First launch: the sample profile is shown and nothing is written until
 *   the user changes something.
 * - Unreadable data (corrupt, or saved by a newer app): the store goes into
 *   the `error` state and never overwrites what is stored.
 * - Storage unavailable (for example blocked site data): the app keeps
 *   working in memory and `storage` reports it.
 */
export async function initStore(options: {
  persistence: Persistence;
  today: IsoDate;
}): Promise<void> {
  await writes;
  stateSaveQueued = false;
  persistence = options.persistence;
  const base = { loadError: null, saveFailed: false } as const;

  try {
    const stored = await persistence.load();
    useAppStore.setState({
      ...(stored ?? createSampleSnapshot(options.today)),
      ...base,
      status: 'ready',
      storage: persistence.kind,
    });
  } catch (error) {
    if (error instanceof StateFormatError) {
      useAppStore.setState({ ...base, status: 'error', loadError: error.message });
      return;
    }
    console.warn('Homebody cannot use IndexedDB, data is kept in memory only', error);
    persistence = createMemoryPersistence();
    useAppStore.setState({
      ...createSampleSnapshot(options.today),
      ...base,
      status: 'ready',
      storage: 'memory',
    });
  }
}

/**
 * Applies a change to the store and persists it. `recipe` receives the
 * current snapshot and returns the parts that changed; it must not mutate
 * its argument. Ignored until the store is ready.
 */
export function applyPatch(recipe: (snapshot: Snapshot) => Patch): void {
  const store = useAppStore.getState();
  if (store.status !== 'ready') return;
  const previous = snapshotOf(store);
  const patch = recipe(previous);
  useAppStore.setState(patch);
  persistChanges(previous, { ...previous, ...patch });
}

/** Resolves when every pending write has reached storage. */
export async function flushStore(): Promise<void> {
  // A write can queue another one while it runs, so wait until the queue is quiet.
  let settled: Promise<void>;
  do {
    settled = writes;
    await settled;
  } while (settled !== writes);
}

/** Replaces everything with the given data (used when importing a backup). */
export async function restoreData(data: FullData): Promise<void> {
  await flushStore();
  await persistence.restore(data);
  useAppStore.setState({
    state: data.state,
    history: data.history,
    setLogs: data.setLogs,
    status: 'ready',
    loadError: null,
    saveFailed: false,
  });
}

/** Deletes all stored data and returns to the sample profile. */
export async function resetAllData(today: IsoDate): Promise<void> {
  await flushStore();
  await persistence.clear();
  useAppStore.setState({
    ...createSampleSnapshot(today),
    status: 'ready',
    loadError: null,
    saveFailed: false,
  });
}

/** The storage port currently in use (for features that manage their own data, like photos). */
export function getPersistence(): Persistence {
  return persistence;
}

import type { HistoryEntry } from '@/engine';

import type { AppState } from './schema';

/** Ticked sets: session id → exercise id → one flag per set. */
export type SetLogs = Record<string, Record<string, boolean[]>>;

/** Everything the store holds that is persisted (photos are loaded separately). */
export type Snapshot = {
  state: AppState;
  history: HistoryEntry[];
  setLogs: SetLogs;
};

/** A partial update returned by a transform. Omitted parts stay untouched. */
export type Patch = Partial<Snapshot>;

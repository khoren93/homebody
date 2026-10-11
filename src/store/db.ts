import Dexie, { type Table } from 'dexie';

import type { HistoryEntry } from '@/engine';

import type { Photo, SetLog } from './schema';

/** The single row of the `state` table. */
export type StateRow = { id: 'app'; data: unknown; updatedAt: number };

/**
 * IndexedDB layout. The main state is one small document; history, set logs
 * and photos live in their own tables so that saving the state stays cheap.
 */
export class HomebodyDb extends Dexie {
  state!: Table<StateRow, string>;
  history!: Table<HistoryEntry, [string, string]>;
  setLogs!: Table<SetLog, string>;
  photos!: Table<Photo, string>;

  constructor(name = 'homebody') {
    super(name);
    this.version(1).stores({
      state: 'id',
      history: '[exerciseId+sessionId], sessionId, date',
      setLogs: 'sessionId',
      photos: 'id, date, pose',
    });
  }
}

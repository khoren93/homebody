import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HistoryEntry } from '@/engine';

import { createSampleState } from '../defaults';
import { derivePlan } from '../derived';
import { createMemoryPersistence, type Persistence } from '../persistence';
import {
  applyPatch,
  flushStore,
  getPersistence,
  initStore,
  resetAllData,
  restoreData,
  useAppStore,
} from '../store';

const today = '2026-10-14';
const stored = { ...createSampleState('2026-10-01'), setupDone: true, block: 2 };

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

/** A persistence whose write methods are spies around the in-memory implementation. */
function spied(persistence: Persistence = createMemoryPersistence()) {
  for (const method of [
    'saveState',
    'putHistory',
    'deleteHistory',
    'putSetLog',
    'deleteSetLog',
  ] as const) {
    vi.spyOn(persistence, method);
  }
  return persistence;
}

const get = () => useAppStore.getState();

describe('initStore', () => {
  it('shows the sample profile on first launch without writing anything', async () => {
    const persistence = spied();
    await initStore({ persistence, today });

    expect(get().status).toBe('ready');
    expect(get().storage).toBe('memory');
    expect(get().state.setupDone).toBe(false);
    expect(get().state.schedule.start).toBe('2026-10-19');
    await flushStore();
    expect(persistence.saveState).not.toHaveBeenCalled();
    expect(await persistence.load()).toBeNull();
  });

  it('loads what was stored', async () => {
    const persistence = createMemoryPersistence({
      state: stored,
      history: [entry('Plank', '2026-10-05')],
      setLogs: { '2026-10-05': { Plank: [true, true] } },
    });
    await initStore({ persistence, today });

    expect(get().state).toEqual(stored);
    expect(get().history).toHaveLength(1);
    expect(get().setLogs['2026-10-05']).toEqual({ Plank: [true, true] });
  });

  it('goes into the error state for unreadable data and never overwrites it', async () => {
    const persistence = spied(
      createMemoryPersistence({ state: { ...stored, version: 99 } as never }),
    );
    await initStore({ persistence, today });

    expect(get().status).toBe('error');
    expect(get().loadError).toMatch(/newer version/);

    applyPatch((s) => ({ state: { ...s.state, block: 7 } }));
    await flushStore();
    expect(persistence.saveState).not.toHaveBeenCalled();
  });

  it('falls back to memory when storage itself is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const broken = createMemoryPersistence();
    vi.spyOn(broken, 'load').mockRejectedValue(new Error('IndexedDB is blocked'));

    await initStore({ persistence: broken, today });

    expect(get().status).toBe('ready');
    expect(get().storage).toBe('memory');
    expect(getPersistence()).not.toBe(broken);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('applyPatch', () => {
  let persistence: Persistence;

  beforeEach(async () => {
    persistence = spied(
      createMemoryPersistence({
        state: stored,
        history: [entry('Plank', '2026-10-05'), entry('Pushups', '2026-10-05')],
        setLogs: { '2026-10-05': { Plank: [true] }, '2026-10-07': { Pushups: [true] } },
      }),
    );
    await initStore({ persistence, today });
  });

  it('updates the store immediately and saves the state once for a burst of edits', async () => {
    applyPatch((s) => ({ state: { ...s.state, loadScale: 0.9 } }));
    applyPatch((s) => ({ state: { ...s.state, loadScale: 0.8 } }));
    expect(get().state.loadScale).toBe(0.8);

    await flushStore();
    expect(persistence.saveState).toHaveBeenCalledTimes(1);
    expect((await persistence.load())?.state.loadScale).toBe(0.8);
  });

  it('writes only the history entries that changed and deletes the removed ones', async () => {
    const updated = entry('Plank', '2026-10-05', 42);
    const added = entry('Plank', '2026-10-12');
    // Replaces the plank entry, adds a new one and drops the push-ups.
    applyPatch(() => ({ history: [updated, added] }));

    await flushStore();
    expect(persistence.putHistory).toHaveBeenCalledWith([updated, added]);
    expect(persistence.deleteHistory).toHaveBeenCalledWith([['Pushups', '2026-10-05']]);
    expect(persistence.saveState).not.toHaveBeenCalled();
  });

  it('does not rewrite history entries that stayed the same', async () => {
    const added = entry('Crunches', '2026-10-12');
    applyPatch((s) => ({ history: [...s.history, added] }));
    await flushStore();
    expect(persistence.putHistory).toHaveBeenCalledWith([added]);
    expect(persistence.deleteHistory).not.toHaveBeenCalled();
  });

  it('writes and deletes set logs per session', async () => {
    applyPatch((s) => ({
      setLogs: { '2026-10-05': s.setLogs['2026-10-05']!, '2026-10-12': { Plank: [true, false] } },
    }));

    await flushStore();
    expect(persistence.putSetLog).toHaveBeenCalledTimes(1);
    expect(persistence.putSetLog).toHaveBeenCalledWith({
      sessionId: '2026-10-12',
      sets: { Plank: [true, false] },
    });
    expect(persistence.deleteSetLog).toHaveBeenCalledWith('2026-10-07');
  });

  it('writes nothing when the recipe returns nothing', async () => {
    applyPatch(() => ({}));
    await flushStore();
    for (const method of ['saveState', 'putHistory', 'deleteHistory', 'putSetLog'] as const) {
      expect(persistence[method]).not.toHaveBeenCalled();
    }
  });

  it('flags a failed write and keeps working', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(persistence.saveState).mockRejectedValueOnce(new Error('quota'));

    applyPatch((s) => ({ state: { ...s.state, block: 5 } }));
    await flushStore();
    expect(get().saveFailed).toBe(true);
    expect(get().state.block).toBe(5);

    applyPatch((s) => ({ state: { ...s.state, block: 6 } }));
    await flushStore();
    expect((await persistence.load())?.state.block).toBe(6);
    error.mockRestore();
  });
});

describe('replacing data', () => {
  beforeEach(async () => {
    await initStore({ persistence: createMemoryPersistence({ state: stored }), today });
  });

  it('restores a full data set into the store and storage', async () => {
    const data = {
      state: { ...stored, block: 9 },
      history: [entry('Plank', '2026-10-12')],
      setLogs: { '2026-10-12': { Plank: [true] } },
      photos: [],
    };
    await restoreData(data);

    expect(get().state.block).toBe(9);
    expect(get().history).toEqual(data.history);
    expect((await getPersistence().load())?.state.block).toBe(9);
  });

  it('resets to the sample profile and wipes storage', async () => {
    applyPatch((s) => ({ state: { ...s.state, block: 4 } }));
    await resetAllData(today);

    expect(get().state.setupDone).toBe(false);
    expect(get().state.block).toBe(1);
    expect(await getPersistence().load()).toBeNull();
  });
});

describe('derivePlan', () => {
  it('builds the plan with loads and weekly volume', () => {
    const { plan, volume } = derivePlan(stored);
    expect(plan.sessions).toHaveLength(12);
    expect(plan.sessions[0]?.items[0]?.prescription.type).toBe('weighted');
    expect(volume.quads).toBeGreaterThan(0);
  });

  it('reuses the result while the state object is the same', () => {
    expect(derivePlan(stored)).toBe(derivePlan(stored));
    expect(derivePlan({ ...stored })).not.toBe(derivePlan(stored));
  });
});

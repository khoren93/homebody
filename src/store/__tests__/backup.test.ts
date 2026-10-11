import { beforeEach, describe, expect, it } from 'vitest';

import {
  BACKUP_FORMAT,
  BackupError,
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
} from '../backup';
import { addPhoto, usePhotoStore } from '../photos';
import { STATE_VERSION } from '../schema';
import { applyPatch, getPersistence, useAppStore } from '../store';
import { toggleSessionDone } from '../transforms/sessions';
import { toggleSet } from '../transforms/tracking';

const today = '2026-10-14';
const IMAGE = 'data:image/jpeg;base64,AAAA';

/** Puts some of everything into the store. */
async function fill() {
  applyPatch((s) => ({ state: { ...s.state, setupDone: true, loadScale: 0.9 } }));
  applyPatch((s) => toggleSet(s, '2026-10-19', 'Goblet_Squat', 0));
  applyPatch((s) => toggleSessionDone(s, '2026-10-21'));
  await addPhoto({ date: '2026-10-10', pose: 'front', image: IMAGE });
}

describe('backup files', () => {
  beforeEach(fill);

  it('names the file after the date', () => {
    expect(backupFilename('2026-10-14')).toBe('homebody-backup-2026-10-14.json');
  });

  it('contains the state, history, set logs and photos', async () => {
    const backup = await createBackup(new Date('2026-10-14T10:00:00Z'));
    expect(backup).toMatchObject({
      app: 'homebody',
      format: BACKUP_FORMAT,
      exportedAt: '2026-10-14T10:00:00.000Z',
    });
    expect((backup.state as { loadScale: number }).loadScale).toBe(0.9);
    expect(backup.history).toHaveLength(6);
    expect(backup.setLogs).toEqual([
      { sessionId: '2026-10-19', sets: { Goblet_Squat: [true, false, false] } },
    ]);
    expect(backup.photos).toHaveLength(1);
  });

  it('survives a round trip through JSON and replaces what is on the device', async () => {
    const text = JSON.stringify(await createBackup());
    const before = useAppStore.getState();

    // Change everything, then restore.
    applyPatch((s) => ({
      state: { ...s.state, loadScale: 1.2, done: {} },
      history: [],
      setLogs: {},
    }));
    const parsed = parseBackup(text, today);
    expect(parsed.legacy).toBe(false);
    expect(parsed.summary).toEqual({ sessions: 1, measurements: 1, photos: 1 });
    await restoreBackup(parsed);

    const after = useAppStore.getState();
    expect(after.state).toEqual(before.state);
    expect(after.history).toEqual(before.history);
    expect(after.setLogs).toEqual(before.setLogs);
    expect((await getPersistence().load())?.state.loadScale).toBe(0.9);
    expect(usePhotoStore.getState().photos).toHaveLength(1);
  });

  it.each([
    ['text that is not JSON', 'hello'],
    ['JSON of another shape', '{"some":"thing"}'],
    [
      'a backup with a broken state',
      JSON.stringify({
        app: 'homebody',
        format: 1,
        exportedAt: 'x',
        state: { version: 1 },
        history: [],
        setLogs: [],
        photos: [],
      }),
    ],
    [
      'a backup with a broken history row',
      JSON.stringify({
        app: 'homebody',
        format: 1,
        exportedAt: 'x',
        state: {},
        history: [{ sets: 'three' }],
        setLogs: [],
        photos: [],
      }),
    ],
  ])('rejects %s', (_label, text) => {
    expect(() => parseBackup(text, today)).toThrow(BackupError);
    try {
      parseBackup(text, today);
    } catch (error) {
      expect((error as BackupError).reason).toBe('invalid');
    }
  });

  it('recognises backups made by a newer version', async () => {
    const backup = await createBackup();
    const newerFile = JSON.stringify({ ...backup, format: BACKUP_FORMAT + 1 });
    const newerState = JSON.stringify({
      ...backup,
      state: { ...(backup.state as object), version: STATE_VERSION + 1 },
    });
    for (const text of [newerFile, newerState]) {
      expect(() => parseBackup(text, today)).toThrow(expect.objectContaining({ reason: 'tooNew' }));
    }
  });
});

describe('prototype backups', () => {
  const prototype = {
    app: 'home-trainer',
    v: 1,
    exported: '2026-10-01T08:00:00.000Z',
    state: {
      v: 1,
      setup: true,
      profile: { sex: 'f', age: 34, height: 168, level: 'beg' },
      weights: [
        { d: '2026-09-01', kg: 64 },
        { d: 'bad', kg: 1 },
      ],
      eq: { db: true, kb: true, bench: false },
      eqCfg: {
        db: '2, 4, 6',
        kb: '8, 12',
        bb: { bar: 20, step: 2.5, max: 80 },
        ez: { bar: 10, step: 2.5, max: 50 },
      },
      sched: {
        days: [1, 3],
        min: 40,
        start: '2026-09-07',
        weeks: 6,
        deload: false,
        goal: 'str',
        scale: 0.9,
      },
      swaps: { 'FA|0': 'Dumbbell_Squat' },
      ov: { 'Goblet_Squat|2026-09-08': { w: 6, r: 10, rate: 'easy' }, 'Plank|2026-09-08': {} },
      done: { '2026-09-08': true },
      skip: { '2026-09-10': true },
      log: { '2026-09-08': { Goblet_Squat: [true, true, null] } },
      ban: { Plank: true },
      base: { Goblet_Squat: 20.5 },
      block: 2,
      shifts: [{ at: '2026-09-15', days: 1 }],
      hist: {
        Goblet_Squat: [
          { sid: '2026-09-08', d: '2026-09-08', w: 6, r: 10, n: 3, E: 9.4, rate: 'easy' },
        ],
      },
      meas: [{ d: '2026-09-01', waist: 70, neck: 32 }],
    },
    photos: [
      { id: 'p1', d: '2026-09-01', pose: 'side', img: IMAGE, ts: 5 },
      { d: '2026-09-02', img: 'nope' },
    ],
  };

  it('converts the abbreviated prototype format', () => {
    const parsed = parseBackup(JSON.stringify(prototype), today);
    expect(parsed.legacy).toBe(true);
    expect(parsed.exportedAt).toBe('2026-10-01T08:00:00.000Z');

    const { state, history, setLogs, photos } = parsed.data;
    expect(state.version).toBe(STATE_VERSION);
    expect(state.profile).toEqual({
      sex: 'female',
      age: 34,
      heightCm: 168,
      level: 'beginner',
      goal: 'strength',
    });
    expect(state.schedule).toEqual({
      days: [1, 3],
      minutes: 40,
      start: '2026-09-07',
      weeks: 6,
      deload: false,
    });
    expect(state.loadScale).toBe(0.9);
    expect(state.equipment).toEqual({ db: true, kb: true, bench: false });
    expect(state.equipmentConfig.db).toEqual([2, 4, 6]);
    expect(state.bodyWeights).toEqual([{ date: '2026-09-01', kg: 64 }]);
    expect(state.measurements).toEqual([{ date: '2026-09-01', neck: 32, waist: 70 }]);
    expect(state.overrides).toEqual({
      'Goblet_Squat|2026-09-08': { weight: 6, reps: 10, rating: 'easy' },
    });
    expect(state.swaps).toEqual({ 'FA|0': 'Dumbbell_Squat' });
    expect(state.excluded).toEqual({ Plank: true });
    expect(state.carried).toEqual({ Goblet_Squat: 20.5 });
    expect(state.done).toEqual({ '2026-09-08': true });
    expect(state.skipped).toEqual({ '2026-09-10': true });
    expect(state.shifts).toEqual([{ at: '2026-09-15', days: 1 }]);
    expect(state.block).toBe(2);

    expect(history).toEqual([
      {
        sessionId: '2026-09-08',
        exerciseId: 'Goblet_Squat',
        date: '2026-09-08',
        weight: 6,
        reps: 10,
        sets: 3,
        capacity: 9.4,
        rating: 'easy',
      },
    ]);
    expect(setLogs).toEqual({ '2026-09-08': { Goblet_Squat: [true, true, false] } });
    expect(photos).toEqual([
      { id: 'p1', date: '2026-09-01', pose: 'side', image: IMAGE, createdAt: 5 },
    ]);
  });

  it('fills in defaults for a sparse prototype state', () => {
    const sparse = { app: 'home-trainer', state: { profile: {}, sched: {} } };
    const { state } = parseBackup(JSON.stringify(sparse), today).data;
    expect(state.profile.level).toBe('intermediate');
    expect(state.schedule.start).toBe('2026-10-19');
    expect(state.equipmentConfig.db.length).toBeGreaterThan(0);
  });
});

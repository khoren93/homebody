import { z } from 'zod';

import type { IsoDate } from '@/engine';

import { convertPrototypeBackup, isPrototypeBackup } from './legacy';
import { migrateState, StateFormatError } from './migrations';
import { fromSetLogs, type FullData, toSetLogs } from './persistence';
import { loadPhotos, resetPhotos } from './photos';
import { HistoryEntrySchema, PhotoSchema, SetLogSchema } from './schema';
import { flushStore, getPersistence, restoreData, useAppStore } from './store';

/** Version of the backup file layout (not of the state inside it). */
export const BACKUP_FORMAT = 1;

const BackupSchema = z.object({
  app: z.literal('homebody'),
  format: z.literal(BACKUP_FORMAT),
  exportedAt: z.string(),
  /** Validated and migrated separately, because it may be an older version. */
  state: z.unknown(),
  history: z.array(HistoryEntrySchema),
  setLogs: z.array(SetLogSchema),
  photos: z.array(PhotoSchema),
});

export type BackupFile = z.infer<typeof BackupSchema>;

export type ParsedBackup = {
  data: FullData;
  /** When the backup was made, if the file says so. */
  exportedAt: string | null;
  /** True when the file came from the prototype and was converted. */
  legacy: boolean;
  summary: { sessions: number; measurements: number; photos: number };
};

export type BackupErrorReason = 'invalid' | 'tooNew';

export class BackupError extends Error {
  override name = 'BackupError';
  constructor(readonly reason: BackupErrorReason) {
    super(reason === 'tooNew' ? 'The backup is from a newer app version' : 'Not a backup file');
  }
}

export function backupFilename(date: IsoDate): string {
  return `homebody-backup-${date}.json`;
}

/** Collects everything stored on the device into one backup object. */
export async function createBackup(now: Date = new Date()): Promise<BackupFile> {
  await flushStore();
  const { state, history, setLogs } = useAppStore.getState();
  return {
    app: 'homebody',
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    state,
    history,
    setLogs: fromSetLogs(setLogs),
    photos: await getPersistence().listPhotos(),
  };
}

function summarize(data: FullData): ParsedBackup['summary'] {
  return {
    sessions: Object.keys(data.state.done).length,
    measurements: new Set(
      [...data.state.bodyWeights, ...data.state.measurements].map((entry) => entry.date),
    ).size,
    photos: data.photos.length,
  };
}

/**
 * Reads the text of a backup file and validates it. Accepts Homebody backups
 * (whose state is migrated to the current version) and backups of the
 * prototype. Throws {@link BackupError} for anything else.
 */
export function parseBackup(text: string, today: IsoDate): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid');
  }

  if (isPrototypeBackup(raw)) {
    try {
      const data = convertPrototypeBackup(raw, today);
      const exported = (raw as { exported?: unknown }).exported;
      return {
        data,
        exportedAt: typeof exported === 'string' ? exported : null,
        legacy: true,
        summary: summarize(data),
      };
    } catch {
      throw new BackupError('invalid');
    }
  }

  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) {
    const format = (raw as { app?: unknown; format?: unknown } | null)?.format;
    const fromHomebody = (raw as { app?: unknown } | null)?.app === 'homebody';
    throw new BackupError(
      fromHomebody && typeof format === 'number' && format > BACKUP_FORMAT ? 'tooNew' : 'invalid',
    );
  }

  let state;
  try {
    state = migrateState(parsed.data.state);
  } catch (error) {
    const newer = error instanceof StateFormatError && error.message.includes('newer version');
    throw new BackupError(newer ? 'tooNew' : 'invalid');
  }

  const data: FullData = {
    state,
    history: parsed.data.history,
    setLogs: toSetLogs(parsed.data.setLogs),
    photos: parsed.data.photos,
  };
  return { data, exportedAt: parsed.data.exportedAt, legacy: false, summary: summarize(data) };
}

/** Replaces the stored data with a parsed backup and reloads the photos. */
export async function restoreBackup(backup: ParsedBackup): Promise<void> {
  await restoreData(backup.data);
  resetPhotos();
  await loadPhotos({ force: true });
}

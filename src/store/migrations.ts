import { type AppState, AppStateSchema, STATE_VERSION } from './schema';

type Document = Record<string, unknown>;

/** Upgrades a state document from the version it is keyed by to the next one. */
export type Migration = (document: Document) => Document;

/**
 * Migrations, keyed by the version they upgrade *from*. To change the state
 * format: bump `STATE_VERSION`, add a migration from the previous version
 * here and cover it with a test.
 */
const MIGRATIONS: Record<number, Migration> = {};

export class StateFormatError extends Error {
  override name = 'StateFormatError';
}

/**
 * Applies migrations one version at a time until the document reaches
 * `target`. Throws {@link StateFormatError} when the version is missing,
 * newer than `target`, or a step of the chain does not exist.
 */
export function upgradeDocument(
  raw: unknown,
  migrations: Record<number, Migration>,
  target: number,
): Document {
  if (typeof raw !== 'object' || raw === null) {
    throw new StateFormatError('The state document is not an object');
  }

  let document = raw as Document;
  let version = document.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new StateFormatError('The state document has no valid version');
  }
  if (version > target) {
    throw new StateFormatError(
      `The data was saved by a newer version of the app (format ${version}, this app reads ${target})`,
    );
  }

  while (version < target) {
    const migrate = migrations[version];
    if (!migrate) throw new StateFormatError(`No migration from state format ${version}`);
    version += 1;
    document = { ...migrate(document), version };
  }
  return document;
}

/**
 * Brings a stored or imported state document up to the current version and
 * validates it. Throws {@link StateFormatError} when the document cannot be
 * used.
 */
export function migrateState(raw: unknown): AppState {
  const document = upgradeDocument(raw, MIGRATIONS, STATE_VERSION);
  const result = AppStateSchema.safeParse(document);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue && issue.path.length > 0 ? issue.path.join('.') : 'document';
    throw new StateFormatError(`Invalid state at "${where}": ${issue?.message ?? 'unknown error'}`);
  }
  return result.data;
}

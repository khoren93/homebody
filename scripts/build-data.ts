/**
 * Syncs the dataset with the upstream free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, public domain).
 *
 *   node scripts/build-data.ts                  download photos that are missing
 *   node scripts/build-data.ts --force-photos   re-download and re-encode every photo
 *   node scripts/build-data.ts --add <id>       append a draft record for an upstream exercise
 *
 * Curated fields (names, patterns, equipment, baseline, ...) are never
 * overwritten. Run with `make data-build`, then `make data-validate`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { format } from 'prettier';
import sharp from 'sharp';

import { MUSCLE_IDS, type MuscleId, PHOTO_FRAMES } from '../src/data/schema.ts';

const UPSTREAM = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const PHOTO_WIDTH = 800;
const PHOTO_QUALITY = 60;

type UpstreamExercise = {
  id: string;
  name: string;
  level: string;
  mechanic: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

type DatasetRecord = { id: string } & Record<string, unknown>;

const root = join(import.meta.dirname, '..');
const datasetPath = join(root, 'data', 'exercises.json');
const photosDir = join(root, 'public', 'exercises');

/** Upstream muscle names that differ from our ids. */
const MUSCLE_ALIASES: Record<string, MuscleId> = {
  abdominals: 'abs',
  quadriceps: 'quads',
  'middle back': 'middle_back',
  'lower back': 'lower_back',
};

function toMuscleId(name: string): MuscleId {
  const id = MUSCLE_ALIASES[name] ?? name;
  if (!(MUSCLE_IDS as readonly string[]).includes(id)) {
    throw new Error(`Upstream muscle "${name}" has no matching muscle id`);
  }
  return id as MuscleId;
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed with ${response.status}`);
  return response;
}

async function downloadPhoto(upstreamPath: string, target: string): Promise<void> {
  const response = await fetchOk(`${UPSTREAM}/exercises/${upstreamPath}`);
  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input)
    .resize({ width: PHOTO_WIDTH, withoutEnlargement: true })
    .webp({ quality: PHOTO_QUALITY })
    .toFile(target);
}

function draftRecord(upstream: UpstreamExercise): DatasetRecord {
  const primary = upstream.primaryMuscles.map(toMuscleId);
  const secondary = upstream.secondaryMuscles.map(toMuscleId).filter((m) => !primary.includes(m));
  return {
    id: upstream.id,
    name: { en: upstream.name, ru: '' },
    patterns: [],
    equipment: [[]],
    type: 'reps',
    baseline: 0,
    unilateral: false,
    compound: upstream.mechanic === 'compound',
    primary,
    secondary,
    level: upstream.level,
    instructions: { en: upstream.instructions },
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      add: { type: 'string', multiple: true },
      'force-photos': { type: 'boolean', default: false },
    },
  });

  console.log('Fetching the upstream index...');
  const index = (await (
    await fetchOk(`${UPSTREAM}/dist/exercises.json`)
  ).json()) as UpstreamExercise[];
  const upstreamById = new Map(index.map((e) => [e.id, e]));

  const dataset = JSON.parse(readFileSync(datasetPath, 'utf8')) as DatasetRecord[];
  const known = new Set(dataset.map((e) => e.id));

  const added: string[] = [];
  for (const id of values.add ?? []) {
    const upstream = upstreamById.get(id);
    if (!upstream) throw new Error(`"${id}" does not exist in free-exercise-db`);
    if (known.has(id)) {
      console.log(`  ${id} is already in the dataset, skipped`);
      continue;
    }
    dataset.push(draftRecord(upstream));
    known.add(id);
    added.push(id);
  }

  if (added.length > 0) {
    const json = await format(JSON.stringify(dataset), { parser: 'json', printWidth: 100 });
    writeFileSync(datasetPath, json);
  }

  let downloaded = 0;
  for (const { id } of dataset) {
    const upstream = upstreamById.get(id);
    if (!upstream) {
      console.warn(`  ! ${id} is not in free-exercise-db: its photos must be added by hand`);
      continue;
    }
    mkdirSync(join(photosDir, id), { recursive: true });
    for (let frame = 0; frame < PHOTO_FRAMES; frame++) {
      const target = join(photosDir, id, `${frame}.webp`);
      const source = upstream.images[frame];
      if (!source || (existsSync(target) && !values['force-photos'])) continue;
      await downloadPhoto(source, target);
      downloaded++;
      console.log(`  + public/exercises/${id}/${frame}.webp`);
    }
  }

  console.log(`\nDone: ${downloaded} photo(s) written, ${added.length} draft record(s) added.`);
  if (added.length > 0) {
    console.log(
      `\nFill in the curated fields of ${added.join(', ')} in data/exercises.json\n` +
        '(name.ru, instructions.ru, patterns, equipment, type, loadMode, baseline, unilateral),\n' +
        'then run `make data-validate`.',
    );
  }
}

await main();

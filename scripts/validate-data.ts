/**
 * Validates data/exercises.json against the schema and checks that every
 * exercise has its photos. Run with `make data-validate`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ExerciseListSchema, PATTERN_IDS, PHOTO_FRAMES } from '../src/data/schema.ts';

const root = join(import.meta.dirname, '..');
const datasetPath = join(root, 'data', 'exercises.json');
const photosDir = join(root, 'public', 'exercises');

const errors: string[] = [];

const raw: unknown = JSON.parse(readFileSync(datasetPath, 'utf8'));
const result = ExerciseListSchema.safeParse(raw);

if (!result.success) {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  const idAt = (index: number): string => {
    const record = list[index];
    const id = typeof record === 'object' && record !== null && 'id' in record ? record.id : null;
    return typeof id === 'string' ? id : `#${index}`;
  };
  for (const issue of result.error.issues) {
    const [index, ...rest] = issue.path;
    const id = typeof index === 'number' ? idAt(index) : 'dataset';
    errors.push(`${id}: ${rest.join('.') || '(record)'}: ${issue.message}`);
  }
} else {
  const exercises = result.data;
  const ids = new Set(exercises.map((e) => e.id));

  for (const exercise of exercises) {
    for (let frame = 0; frame < PHOTO_FRAMES; frame++) {
      const file = join(photosDir, exercise.id, `${frame}.webp`);
      if (!existsSync(file)) {
        errors.push(`${exercise.id}: missing photo public/exercises/${exercise.id}/${frame}.webp`);
      }
    }
  }

  if (existsSync(photosDir)) {
    for (const entry of readdirSync(photosDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !ids.has(entry.name)) {
        errors.push(`${entry.name}: photo folder has no matching exercise in the dataset`);
      }
    }
  }

  if (errors.length === 0) {
    console.log(`✓ ${exercises.length} exercises are valid, all photos present\n`);
    for (const pattern of PATTERN_IDS) {
      const count = exercises.filter((e) => e.patterns.includes(pattern)).length;
      console.log(`  ${pattern.padEnd(16)} ${String(count).padStart(3)}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`✗ data/exercises.json has ${errors.length} problem(s):\n`);
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

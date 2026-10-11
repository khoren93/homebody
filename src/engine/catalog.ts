import type { Exercise } from '@/data/schema';

import type { Catalog } from './types';

export function createCatalog(list: readonly Exercise[]): Catalog {
  return { list, byId: new Map(list.map((exercise) => [exercise.id, exercise])) };
}

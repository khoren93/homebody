import { EXERCISES } from '@/data';
import { createCatalog } from '@/engine';

/** The exercise catalog in the shape the engine expects. */
export const CATALOG = createCatalog(EXERCISES);

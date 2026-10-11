import { create } from 'zustand';

import type { IsoDate } from '@/engine';

import type { Photo, Pose } from './schema';
import { getPersistence } from './store';

type PhotoState = {
  /** Null until the photos have been read from storage. */
  photos: Photo[] | null;
  /** True when reading from storage failed. */
  failed: boolean;
};

/**
 * Progress photos. They are large, so they are kept out of the main store and
 * loaded only when the body screen needs them.
 */
export const usePhotoStore = create<PhotoState>(() => ({ photos: null, failed: false }));

function sorted(photos: readonly Photo[]): Photo[] {
  return [...photos].sort(
    (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || a.createdAt - b.createdAt,
  );
}

function newId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `p${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

/** Reads the photos from storage once; later calls reuse what is in memory. */
export async function loadPhotos(options: { force?: boolean } = {}): Promise<void> {
  if (usePhotoStore.getState().photos && !options.force) return;
  try {
    usePhotoStore.setState({ photos: sorted(await getPersistence().listPhotos()), failed: false });
  } catch {
    usePhotoStore.setState({ photos: [], failed: true });
  }
}

/** Stores a compressed photo. Rejects when storage refuses it (for example when full). */
export async function addPhoto(input: {
  date: IsoDate;
  pose: Pose;
  image: string;
}): Promise<Photo> {
  const photo: Photo = { ...input, id: newId(), createdAt: Date.now() };
  await getPersistence().putPhoto(photo);
  usePhotoStore.setState((state) => ({ photos: sorted([...(state.photos ?? []), photo]) }));
  return photo;
}

export async function removePhoto(id: string): Promise<void> {
  await getPersistence().deletePhoto(id);
  usePhotoStore.setState((state) => ({
    photos: (state.photos ?? []).filter((photo) => photo.id !== id),
  }));
}

/** Forgets what is in memory, so the next load reads storage again. */
export function resetPhotos(): void {
  usePhotoStore.setState({ photos: null, failed: false });
}

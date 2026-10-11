import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { fitWithin } from '@/lib/compressImage';
import { actions, addPhoto, getPersistence, usePhotoStore } from '@/store';

import { PhotosPanel } from './PhotosPanel';

const IMAGE = 'data:image/jpeg;base64,AAAA';
const file = () => new File(['x'], 'me.jpg', { type: 'image/jpeg' });
const compress = () => Promise.resolve(IMAGE);

async function seed() {
  actions.logMeasurement('2026-09-01', { kg: 82.4, waist: 88 });
  actions.logMeasurement('2026-10-10', { kg: 81.2, waist: 86 });
  await addPhoto({ date: '2026-09-01', pose: 'front', image: IMAGE });
  await addPhoto({ date: '2026-09-20', pose: 'front', image: IMAGE });
  await addPhoto({ date: '2026-10-10', pose: 'front', image: IMAGE });
  await addPhoto({ date: '2026-10-10', pose: 'side', image: IMAGE });
}

describe('fitWithin', () => {
  it('scales the longest side down and never up', () => {
    expect(fitWithin(3000, 4000, 900)).toEqual({ width: 675, height: 900 });
    expect(fitWithin(4000, 3000, 900)).toEqual({ width: 900, height: 675 });
    expect(fitWithin(600, 400, 900)).toEqual({ width: 600, height: 400 });
  });
});

describe('PhotosPanel', () => {
  it('loads the photos and invites the user to add the first one', async () => {
    render(<PhotosPanel compress={compress} />);
    expect(await screen.findByRole('region', { name: 'Progress photos' })).toBeInTheDocument();
    expect(screen.getAllByText('Your photo')).toHaveLength(2);
  });

  it('compresses and stores a picked photo', async () => {
    render(<PhotosPanel compress={compress} />);
    await screen.findByRole('region', { name: 'Progress photos' });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-10' } });
    await userEvent.selectOptions(screen.getByLabelText('Pose'), 'side');
    await userEvent.upload(screen.getByLabelText('Add photo'), file());

    expect(
      await screen.findByRole('region', { name: 'Progress photos · side' }),
    ).toBeInTheDocument();
    const stored = await getPersistence().listPhotos();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ date: '2026-10-10', pose: 'side', image: IMAGE });
    expect(
      screen.getByRole('button', { name: 'Open the photo of Sat, Oct 10, 2026' }),
    ).toBeInTheDocument();
  });

  it('compares the first and the latest photo with the changes between them', async () => {
    await seed();
    render(<PhotosPanel compress={compress} />);
    const panel = await screen.findByRole('region', { name: 'Progress photos · front' });
    expect(panel).toHaveTextContent('39 days apart · weight −1.2 kg · waist −2 cm');
    expect(within(panel).getByLabelText('First photo')).toHaveDisplayValue('Tue, Sep 1, 2026');
    expect(within(panel).getByLabelText('Second photo')).toHaveDisplayValue('Sat, Oct 10, 2026');

    await userEvent.selectOptions(within(panel).getByLabelText('First photo'), 'Sun, Sep 20, 2026');
    expect(panel).toHaveTextContent('20 days apart · weight −1.2 kg');
  });

  it('switches between poses that have photos', async () => {
    await seed();
    render(<PhotosPanel compress={compress} />);
    await screen.findByRole('region', { name: 'Progress photos · front' });
    expect(screen.getAllByRole('radio').map((r) => r.parentElement?.textContent)).toEqual([
      'Front',
      'Side',
    ]);
    await userEvent.click(screen.getByRole('radio', { name: 'Side' }));
    expect(screen.getByRole('region', { name: 'Progress photos · side' })).toBeInTheDocument();
    expect(screen.queryByLabelText('First photo')).not.toBeInTheDocument();
  });

  it('opens a photo full screen and deletes it only after a second press', async () => {
    await seed();
    render(<PhotosPanel compress={compress} />);
    await screen.findByRole('region', { name: 'Progress photos · front' });
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Open the photo of Sun, Sep 20, 2026' })[0]!,
    );

    const viewer = screen.getByRole('dialog', { name: 'Sun, Sep 20, 2026 · Front' });
    await userEvent.click(within(viewer).getByRole('button', { name: 'Delete photo' }));
    expect(usePhotoStore.getState().photos).toHaveLength(4);
    await userEvent.click(
      within(viewer).getByRole('button', { name: 'Really delete? Press again' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(usePhotoStore.getState().photos).toHaveLength(3);
    expect(await getPersistence().listPhotos()).toHaveLength(3);
  });

  it('explains when a photo cannot be saved', async () => {
    render(<PhotosPanel compress={() => Promise.reject(new Error('not an image'))} />);
    await screen.findByRole('region', { name: 'Progress photos' });
    await userEvent.upload(screen.getByLabelText('Add photo'), file());
    expect(await screen.findByRole('alert')).toHaveTextContent('The photo could not be saved');
  });

  it('explains when the device is out of space', async () => {
    render(<PhotosPanel compress={compress} />);
    await screen.findByRole('region', { name: 'Progress photos' });
    vi.spyOn(getPersistence(), 'putPhoto').mockRejectedValue(
      new DOMException('full', 'QuotaExceededError'),
    );
    await userEvent.upload(screen.getByLabelText('Add photo'), file());
    expect(await screen.findByRole('alert')).toHaveTextContent('run out of space');
  });

  it('says so when the photos cannot be loaded', async () => {
    vi.spyOn(getPersistence(), 'listPhotos').mockRejectedValue(new Error('blocked'));
    render(<PhotosPanel compress={compress} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('The photos could not be loaded');
  });
});

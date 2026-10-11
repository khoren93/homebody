import { type ChangeEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Dialog } from '@/components/Dialog';
import { Field, Input, Select } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Muted, Num } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Segmented } from '@/components/Segmented';
import { diffDays, isIsoDate } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { compressImage } from '@/lib/compressImage';
import { cx } from '@/lib/cx';
import { useToday } from '@/lib/useToday';
import {
  addPhoto,
  loadPhotos,
  metricSeries,
  type Photo,
  type Pose,
  POSES,
  removePhoto,
  useAppStore,
  usePhotoStore,
  valueOn,
} from '@/store';

import styles from './PhotosPanel.module.css';

type Props = {
  /** Shrinks a picked file to a data URL. Replaceable in tests, where canvas is missing. */
  compress?: (file: Blob) => Promise<string>;
};

/** Progress photos by pose, with a side-by-side comparison of any two dates. */
export function PhotosPanel({ compress = compressImage }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const today = useToday();
  const fileId = useId();
  const photos = usePhotoStore((store) => store.photos);
  const failed = usePhotoStore((store) => store.failed);
  const state = useAppStore((store) => store.state);

  const [date, setDate] = useState(today);
  const [newPose, setNewPose] = useState<Pose>('front');
  const [chosenPose, setChosenPose] = useState<Pose | null>(null);
  const [pick, setPick] = useState<{ first?: string; second?: string }>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'errorSave' | 'errorSpace'>('idle');
  const [viewing, setViewing] = useState<Photo | null>(null);

  useEffect(() => {
    void loadPhotos();
  }, []);

  if (!photos) {
    return (
      <Panel>
        <h2 className={styles.title}>{t('photos.title')}</h2>
        <Muted small role="status">
          {t('photos.loading')}
        </Muted>
      </Panel>
    );
  }

  const posesWithPhotos = POSES.filter((pose) => photos.some((photo) => photo.pose === pose));
  const pose =
    chosenPose && posesWithPhotos.includes(chosenPose)
      ? chosenPose
      : (posesWithPhotos[0] ?? 'front');
  const list = photos.filter((photo) => photo.pose === pose);
  const first = list.find((photo) => photo.id === pick.first) ?? list[0];
  const second = list.find((photo) => photo.id === pick.second) ?? list.at(-1);
  const comparing = list.length >= 2 && first && second;

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setStatus('saving');
    try {
      const image = await compress(file);
      const photo = await addPhoto({ date: isIsoDate(date) ? date : today, pose: newPose, image });
      setChosenPose(newPose);
      setPick((current) => ({ ...current, second: photo.id }));
      setStatus('idle');
    } catch (error) {
      const full = error instanceof DOMException && error.name === 'QuotaExceededError';
      setStatus(full ? 'errorSpace' : 'errorSave');
    }
  };

  const poseName = (value: Pose) => t(`photos.pose.${value}`);
  const label = (photo: Photo) => format.date(photo.date, 'long');
  const delta = () => {
    if (!comparing) return '';
    const parts = [
      t('photos.apart', {
        days: t('units.days', { count: Math.abs(diffDays(first.date, second.date)) }),
      }),
    ];
    for (const metric of ['kg', 'waist'] as const) {
      const series = metricSeries(state, metric);
      const from = valueOn(series, first.date);
      const to = valueOn(series, second.date);
      if (from === null || to === null || from === to) continue;
      const change = format.signed(Math.round((to - from) * 10) / 10);
      parts.push(
        metric === 'kg'
          ? t('photos.delta.weight', { change: t('units.kg', { value: change }) })
          : t('photos.delta.waist', { change: t('units.cm', { value: change }) }),
      );
    }
    return parts.join(' · ');
  };

  const figure = (photo: Photo, slot: 'first' | 'second') => (
    <figure className={styles.figure}>
      <button
        type="button"
        className={cx(styles.frame, slot === 'second' && styles.latest)}
        aria-label={t('photos.open', { date: label(photo) })}
        onClick={() => setViewing(photo)}
      >
        <img
          src={photo.image}
          alt={t('photos.alt', { pose: poseName(photo.pose), date: label(photo) })}
        />
      </button>
      <figcaption>
        <Select
          className={styles.pick}
          aria-label={t(`photos.${slot}`)}
          value={photo.id}
          onChange={(event) => setPick((current) => ({ ...current, [slot]: event.target.value }))}
        >
          {list.map((option) => (
            <option key={option.id} value={option.id}>
              {label(option)}
            </option>
          ))}
        </Select>
      </figcaption>
    </figure>
  );

  return (
    <Panel aria-labelledby="photos-title">
      <div className={styles.head}>
        <h2 id="photos-title" className={styles.title}>
          {list.length > 0
            ? t('photos.titlePose', { pose: poseName(pose).toLowerCase() })
            : t('photos.title')}
        </h2>
        {comparing && <Num className={styles.delta}>{delta()}</Num>}
      </div>

      {failed && <Banner role="alert">{t('photos.errorLoad')}</Banner>}

      {posesWithPhotos.length > 1 && (
        <Segmented
          legend={t('photos.pose.label')}
          value={pose}
          onChange={(next) => {
            setChosenPose(next);
            setPick({});
          }}
          options={posesWithPhotos.map((value) => ({ value, label: poseName(value) }))}
        />
      )}

      {comparing ? (
        <div className={styles.compare}>
          {figure(first, 'first')}
          {figure(second, 'second')}
        </div>
      ) : (
        list.length === 0 && (
          <div className={styles.compare} aria-hidden="true">
            {[0, 1].map((slot) => (
              <div key={slot} className={cx(styles.placeholder, slot === 1 && styles.latest)}>
                <Icon name="camera" />
                {t('photos.empty')}
              </div>
            ))}
          </div>
        )
      )}

      {list.length > 0 && (
        <ul className={styles.thumbs}>
          {[...list].reverse().map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                className={styles.thumb}
                aria-label={t('photos.open', { date: label(photo) })}
                onClick={() => setViewing(photo)}
              >
                <img src={photo.image} alt="" loading="lazy" />
              </button>
              <Num className={styles.thumbDate}>{format.date(photo.date, 'dayMonth')}</Num>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.add}>
        <Field label={t('photos.date')}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('photos.pose.label')}>
          {(control) => (
            <Select
              {...control}
              value={newPose}
              onChange={(e) => setNewPose(e.target.value as Pose)}
            >
              {POSES.map((value) => (
                <option key={value} value={value}>
                  {poseName(value)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <label className={styles.file} htmlFor={fileId}>
          <Icon name="camera" />
          {t('photos.add')}
          <input
            id={fileId}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={(event) => void onFile(event)}
          />
        </label>
      </div>
      {status === 'saving' && (
        <Muted small role="status">
          {t('photos.saving')}
        </Muted>
      )}
      {(status === 'errorSave' || status === 'errorSpace') && (
        <Banner role="alert">{t(`photos.${status}`)}</Banner>
      )}
      <Muted small>{t('photos.about')}</Muted>

      {viewing && (
        <PhotoViewer
          photo={viewing}
          title={`${label(viewing)} · ${poseName(viewing.pose)}`}
          onClose={() => setViewing(null)}
        />
      )}
    </Panel>
  );
}

/** A photo full screen, with a delete button that asks twice. */
function PhotoViewer({
  photo,
  title,
  onClose,
}: {
  photo: Photo;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'idle' | 'confirm' | 'failed'>('idle');

  const remove = async () => {
    if (step !== 'confirm') {
      setStep('confirm');
      return;
    }
    try {
      await removePhoto(photo.id);
      onClose();
    } catch {
      setStep('failed');
    }
  };

  return (
    <Dialog title={title} onClose={onClose}>
      <div className={styles.stage}>
        <img className={styles.full} src={photo.image} alt={title} />
      </div>
      <div className={styles.viewerActions}>
        <button type="button" className={styles.delete} onClick={() => void remove()}>
          {t(
            step === 'confirm'
              ? 'photos.confirmDelete'
              : step === 'failed'
                ? 'photos.deleteFailed'
                : 'photos.delete',
          )}
        </button>
      </div>
    </Dialog>
  );
}

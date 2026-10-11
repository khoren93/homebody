import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/Dialog';
import { type Exercise, exercisePhotoUrl } from '@/data';

import styles from './ExerciseViewer.module.css';
import { useExerciseText } from './useExerciseText';

/** How long each frame stays on screen while the viewer animates, in milliseconds. */
const VIEWER_FRAME_MS = 1100;

type Frame = 0 | 1;

/**
 * Full-screen photos of an exercise next to its technique: animate, or hold
 * the start or end position. The steps stay put while the photos move.
 */
export function ExerciseViewer({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { t } = useTranslation();
  const text = useExerciseText();
  const techniqueId = useId();
  const [frame, setFrame] = useState<Frame>(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), VIEWER_FRAME_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const hold = (next: Frame) => {
    setPlaying(false);
    setFrame(next);
  };
  const flip = () => hold(frame === 0 ? 1 : 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      setPlaying(false);
      setFrame((f) => (f === 0 ? 1 : 0));
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const steps = text.instructions(exercise);

  return (
    <Dialog title={text.name(exercise)} onClose={onClose}>
      <div className={styles.layout}>
        <div className={styles.media}>
          {/* The image is a convenience target; the buttons below do the same for keyboards. */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className={styles.stage} onClick={flip}>
            <img
              className={styles.image}
              src={exercisePhotoUrl(exercise.id, frame)}
              alt={t(frame === 0 ? 'exercise.photo.startAlt' : 'exercise.photo.endAlt')}
            />
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.control}
              aria-pressed={!playing && frame === 0}
              onClick={() => hold(0)}
            >
              {t('exercise.photo.start')}
            </button>
            <button
              type="button"
              className={styles.control}
              aria-pressed={!playing && frame === 1}
              onClick={() => hold(1)}
            >
              {t('exercise.photo.end')}
            </button>
            <button
              type="button"
              className={styles.control}
              aria-pressed={playing}
              onClick={() => setPlaying((p) => !p)}
            >
              {t(playing ? 'exercise.photo.pause' : 'exercise.photo.play')}
            </button>
          </div>
        </div>
        {/* Focusable so that a keyboard can scroll the steps. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <section className={styles.technique} aria-labelledby={techniqueId} tabIndex={0}>
          <h3 id={techniqueId}>{t('exercise.instructions')}</h3>
          <ol className={styles.steps} lang={steps.lang}>
            {steps.items.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </Dialog>
  );
}

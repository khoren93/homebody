import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/Icon';
import { type Exercise, exercisePhotoUrl } from '@/data';
import { cx } from '@/lib/cx';

import styles from './ExercisePhoto.module.css';
import { ExerciseViewer } from './ExerciseViewer';
import { useExerciseText } from './useExerciseText';

type Props = {
  exercise: Exercise;
  /** A still thumbnail of the start position instead of the animation. */
  still?: boolean;
  className?: string;
};

/**
 * The photos of an exercise, cross-fading between the start and the end
 * position. Pressing it opens the full-screen viewer.
 */
export function ExercisePhoto({ exercise, still = false, className }: Props) {
  const { t } = useTranslation();
  const text = useExerciseText();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cx(styles.photo, className)}
        aria-label={t('exercise.photo.open', { name: text.name(exercise) })}
        onClick={() => setOpen(true)}
      >
        <img
          className={styles.frame}
          src={exercisePhotoUrl(exercise.id, 0)}
          alt=""
          loading="lazy"
        />
        {!still && (
          <>
            <img
              className={cx(styles.frame, styles.end)}
              src={exercisePhotoUrl(exercise.id, 1)}
              alt=""
              loading="lazy"
            />
            <span className={cx(styles.caption, styles.startCaption)} aria-hidden="true">
              {t('exercise.photo.start')}
            </span>
            <span className={cx(styles.caption, styles.endCaption)} aria-hidden="true">
              {t('exercise.photo.end')}
            </span>
            <span className={styles.zoom} aria-hidden="true">
              <Icon name="expand" />
            </span>
          </>
        )}
      </button>
      {open && <ExerciseViewer exercise={exercise} onClose={() => setOpen(false)} />}
    </>
  );
}

import { useTranslation } from 'react-i18next';

import { Sparkline } from '@/components/chart/TsChart';
import { Chip } from '@/components/Chip';
import { Num } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { type Exercise, exercisePhotoUrl } from '@/data';
import type { LoadedSession } from '@/engine';
import { ExercisePhoto } from '@/features/exercise/ExercisePhoto';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { useFormat } from '@/i18n/useFormat';

import styles from './ExerciseProgress.module.css';
import { ProgressDetails } from './ProgressDetails';
import { useExerciseProgress } from './useExerciseProgress';

type Props = {
  exercise: Exercise;
  sessions: readonly LoadedSession[];
  expanded: boolean;
  onExpand: () => void;
  /** True when the user's own numbers drive this exercise. */
  edited: boolean;
};

/** One exercise on the progress screen: a compact row, or the full card when expanded. */
export function ExerciseProgress({ exercise, sessions, expanded, onExpand, edited }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const text = useExerciseText();
  const progress = useExerciseProgress(exercise, sessions);
  const weighted = exercise.type === 'weighted';
  const value =
    progress.current === undefined
      ? '—'
      : weighted
        ? format.number(Math.round(progress.current * 2) / 2, 1)
        : String(Math.round(progress.current));

  if (!expanded) {
    const trend = [
      ...progress.series.actual,
      ...progress.series.planned.slice(progress.series.actual.length > 0 ? 1 : 0),
    ];
    return (
      <button
        type="button"
        className={styles.row}
        aria-expanded={false}
        aria-label={t('progress.show', { name: text.name(exercise) })}
        onClick={onExpand}
      >
        <ExerciseThumb exercise={exercise} />
        <span className={styles.rowName}>{text.name(exercise)}</span>
        <Sparkline values={trend.map(([, v]) => v)} />
        <Num className={styles.rowValue}>{value}</Num>
      </button>
    );
  }

  const gain = progress.summary?.gainPercent;
  const subtitle = [
    text.primaryMuscles(exercise),
    exercise.loadMode === 'pair' ? t('progress.perHand') : null,
    exercise.unilateral ? t('exercise.perSide') : null,
    edited ? t('progress.edited') : null,
  ].filter(Boolean);

  return (
    <Panel aria-labelledby={`progress-${exercise.id}`}>
      <div className={styles.head}>
        <div className={styles.photo}>
          <ExercisePhoto exercise={exercise} still />
        </div>
        <div className={styles.titles}>
          <h2 id={`progress-${exercise.id}`} className={styles.name}>
            {text.name(exercise)}
          </h2>
          <p className={styles.subtitle}>{subtitle.join(' · ')}</p>
        </div>
        {gain != null && (
          <Chip kind="data" tone={gain >= 0 ? 'good' : 'accent'} className={styles.gain}>
            {format.signed(gain, 0)}%
          </Chip>
        )}
      </div>
      <p className={styles.figure}>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{t(`progress.unit.${exercise.type}`)}</span>
      </p>
      <ProgressDetails exercise={exercise} sessions={sessions} />
    </Panel>
  );
}

function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  return (
    <img className={styles.thumb} src={exercisePhotoUrl(exercise.id, 0)} alt="" loading="lazy" />
  );
}

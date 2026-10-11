import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Eyebrow, Muted } from '@/components/Layout';
import type { Exercise } from '@/data';
import { e1rm, implementOf, type LoadedItem, type LoadedSession } from '@/engine';
import { ExercisePhoto } from '@/features/exercise/ExercisePhoto';
import { PlateStack } from '@/features/exercise/PlateStack';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { formatClock } from '@/i18n/format';
import { useFormat } from '@/i18n/useFormat';
import { cx } from '@/lib/cx';
import { useAppStore } from '@/store';

import styles from './ExerciseCard.module.css';
import { PrescriptionEditor } from './PrescriptionEditor';
import { TechniqueDetails } from './TechniqueDetails';

type Props = {
  exercise: Exercise;
  item: LoadedItem;
  session: LoadedSession;
  /** Position in the session, starting at 1. */
  index: number;
  complete?: boolean;
  /** The swap button, shown next to the eyebrow. */
  swap?: ReactNode;
  /** A message under the title, for example about a swap that can be undone. */
  notice?: ReactNode;
  /** Blocks after the prescription: set tracker, effort rating. */
  children?: ReactNode;
};

/**
 * Design system: ExerciseCard. One exercise of a workout: the animated photo,
 * today's prescription, and the controls to log and change it.
 */
export function ExerciseCard({
  exercise,
  item,
  session,
  index,
  complete,
  swap,
  notice,
  children,
}: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const text = useExerciseText();
  const [explaining, setExplaining] = useState(false);
  const equipment = useAppStore((store) => store.state.equipment);
  const barConfig = useAppStore((store) => store.state.equipmentConfig);
  const override = useAppStore((store) => store.state.overrides[`${exercise.id}|${session.id}`]);

  const p = item.prescription;
  const photoNote = text.photoNote(exercise);
  const implement = implementOf(exercise, equipment);
  const pair = exercise.loadMode === 'pair';
  const explainerId = `e1rm-${session.id}-${item.key}`;
  // Capacities are shown to the nearest half kilogram, like plates.
  const roundedCapacity = format.number(Math.round(p.capacity * 2) / 2);
  // Per-hand and per-side hints join the muscles line.
  const muscleLine = [text.muscles(exercise), ...text.hints(exercise)].join(' · ');

  return (
    <article
      className={cx(styles.card, complete && styles.complete)}
      aria-labelledby={`exercise-${item.key}`}
    >
      <ExercisePhoto exercise={exercise} />
      <div className={styles.body}>
        <div className={styles.top}>
          <Eyebrow>
            {t('session.card.position', {
              index: String(index).padStart(2, '0'),
              kind: text.kind(exercise),
            })}
          </Eyebrow>
          {swap}
        </div>
        <div>
          <h2 id={`exercise-${item.key}`} className={styles.name}>
            {text.name(exercise)}
          </h2>
          <p className={styles.muscles}>{muscleLine}</p>
        </div>
        {notice}

        <p className={styles.rx}>
          <span className={styles.dose}>{text.dose(item)}</span>
          {p.type === 'weighted' && (
            <span className={styles.load}>{text.load(exercise, p.weight)}</span>
          )}
        </p>

        <p className={styles.chips}>
          <Chip kind="data">{t('session.card.rest', { time: formatClock(item.rest) })}</Chip>
          <Chip kind="data">{t('session.card.reserve', { count: session.rir })}</Chip>
          {p.type === 'weighted' ? (
            <button
              type="button"
              className={styles.chipButton}
              aria-expanded={explaining}
              aria-controls={explainerId}
              onClick={() => setExplaining((open) => !open)}
            >
              {t(pair ? 'session.card.e1rmPerHand' : 'session.card.e1rm', {
                weight: roundedCapacity,
              })}
            </button>
          ) : (
            <Chip kind="data">
              {t(p.type === 'timed' ? 'session.card.limitSeconds' : 'session.card.limitReps', {
                value: Math.round(p.capacity),
              })}
            </Chip>
          )}
          {p.edited && (
            <Chip tone="accent">
              {t(
                override?.weight != null || override?.reps != null
                  ? 'session.card.edited'
                  : 'session.card.rated',
              )}
            </Chip>
          )}
        </p>

        {p.type === 'weighted' && explaining && (
          <Banner tone="info" className={styles.note}>
            <span id={explainerId}>
              {t('session.card.explain', {
                perHand: pair ? t('session.card.explainPerHand') : '',
                weight: format.number(p.weight),
                reps: p.reps,
                rir: session.rir,
                result: format.number(e1rm(p.weight, p.reps, session.rir), 1),
              })}
            </span>
          </Banner>
        )}
        {p.type === 'weighted' && (implement === 'bb' || implement === 'ez') && (
          <PlateStack total={p.weight} bar={barConfig[implement].bar} />
        )}
        {p.type === 'weighted' && p.warmup && p.warmup.length > 0 && (
          <Muted small>
            {t('session.card.warmupSets', {
              sets: p.warmup
                .map((set) =>
                  t(pair ? 'session.card.warmupSetPair' : 'session.card.warmupSet', {
                    weight: format.number(set.weight),
                    reps: set.reps,
                  }),
                )
                .join(', '),
            })}
          </Muted>
        )}
        {photoNote && <Muted small>{photoNote}</Muted>}
        {p.note && <Banner className={styles.note}>{t(`notes.${p.note}`)}</Banner>}

        {children}
      </div>

      <PrescriptionEditor exercise={exercise} item={item} sessionId={session.id} />
      <TechniqueDetails exercise={exercise} item={item} />
    </article>
  );
}

/** The swap button of a card: replaces the exercise with a random alternative. */
export function RandomSwapButton({ options, onClick }: { options: number; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={styles.swap}
      disabled={options === 0}
      aria-label={
        options > 0 ? t('session.swap.randomLabel', { count: options }) : t('session.swap.none')
      }
      onClick={onClick}
    >
      <Icon name="swap" />
      {options > 0 ? `${t('session.swap.random')} · ${options}` : t('session.swap.none')}
    </button>
  );
}

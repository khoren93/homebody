import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Muted } from '@/components/Layout';
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
  /** Swap controls shown under the title. */
  swap?: ReactNode;
  /** Extra blocks between the editor and the details (set tracker, rating). */
  children?: ReactNode;
};

/** Everything about one exercise of a workout: what to do, how, and how to change it. */
export function ExerciseCard({ exercise, item, session, index, complete, swap, children }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const text = useExerciseText();
  const [explaining, setExplaining] = useState(false);
  const equipment = useAppStore((store) => store.state.equipment);
  const barConfig = useAppStore((store) => store.state.equipmentConfig);
  const override = useAppStore((store) => store.state.overrides[`${exercise.id}|${session.id}`]);

  const p = item.prescription;
  const hints = text.hints(exercise);
  const photoNote = text.photoNote(exercise);
  const implement = implementOf(exercise, equipment);
  const pair = exercise.loadMode === 'pair';
  const explainerId = `e1rm-${session.id}-${item.key}`;
  // Capacities are shown to the nearest half kilogram, like plates.
  const roundedCapacity = format.number(Math.round(p.capacity * 2) / 2);

  return (
    <article
      className={cx(styles.card, complete && styles.complete)}
      aria-labelledby={`exercise-${item.key}`}
    >
      <div className={styles.top}>
        <ExercisePhoto exercise={exercise} />
        <div className={styles.body}>
          <span className={styles.position}>
            {t('session.card.position', { index, kind: text.kind(exercise) })}
          </span>
          <h2 id={`exercise-${item.key}`} className={styles.name}>
            {text.name(exercise)}
          </h2>
          <Muted small>{text.muscles(exercise)}</Muted>
          {swap}

          <p className={styles.dose}>
            <span className={styles.sets}>{text.dose(item)}</span>
            {p.type === 'weighted' && (
              <span className={styles.load}>{text.load(exercise, p.weight)}</span>
            )}
          </p>
          {hints.length > 0 && <Muted small>{hints.join(', ')}</Muted>}
          {photoNote && <Muted small>{photoNote}</Muted>}
          {p.type === 'weighted' && (implement === 'bb' || implement === 'ez') && (
            <PlateStack total={p.weight} bar={barConfig[implement].bar} />
          )}

          <p className={styles.meta}>
            <span>{t('session.card.rest', { time: formatClock(item.rest) })}</span>
            <span>{t('session.card.reserve', { count: session.rir })}</span>
            {p.type === 'weighted' ? (
              <button
                type="button"
                className={styles.link}
                aria-expanded={explaining}
                aria-controls={explainerId}
                onClick={() => setExplaining((open) => !open)}
              >
                {t(pair ? 'session.card.e1rmPerHand' : 'session.card.e1rm', {
                  weight: roundedCapacity,
                })}{' '}
                <span className={styles.help} aria-label={t('session.card.e1rmHelp')}>
                  ?
                </span>
              </button>
            ) : (
              <span>
                {t(p.type === 'timed' ? 'session.card.limitSeconds' : 'session.card.limitReps', {
                  value: Math.round(p.capacity),
                })}
              </span>
            )}
            {p.edited && (
              <span className={styles.edited}>
                {t(
                  override?.weight != null || override?.reps != null
                    ? 'session.card.edited'
                    : 'session.card.rated',
                )}
              </span>
            )}
          </p>

          {p.type === 'weighted' && explaining && (
            <Banner tone="info" className={styles.small}>
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
          {p.note && <Banner className={styles.small}>{t(`notes.${p.note}`)}</Banner>}
        </div>
      </div>

      <PrescriptionEditor exercise={exercise} item={item} sessionId={session.id} />
      {children}
      <TechniqueDetails exercise={exercise} item={item} />
    </article>
  );
}

/** The "another exercise" button with the number of options. */
export function RandomSwapButton({ options, onClick }: { options: number; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <Button size="sm" disabled={options === 0} onClick={onClick}>
        <Icon name="shuffle" />
        {options > 0
          ? `${t('session.swap.random')} · ${t('session.swap.options', { count: options })}`
          : t('session.swap.none')}
      </Button>
    </div>
  );
}

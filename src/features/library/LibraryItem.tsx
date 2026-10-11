import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Disclosure } from '@/components/Disclosure';
import { type Exercise, exercisePhotoUrl, type MuscleId } from '@/data';
import { exerciseSessions, hasEquipment, type IsoDate, type LoadedPlan } from '@/engine';
import { ExercisePhoto } from '@/features/exercise/ExercisePhoto';
import { ExerciseViewer } from '@/features/exercise/ExerciseViewer';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { useFormat } from '@/i18n/useFormat';
import { actions, isFinished, useAppStore } from '@/store';

import type { Density } from './filterLibrary';
import styles from './LibraryItem.module.css';

type Props = {
  exercise: Exercise;
  density: Density;
  inPlan: boolean;
  /** The muscle the list is filtered by, to mark exercises that only assist it. */
  muscle?: MuscleId | undefined;
  plan: LoadedPlan;
  today: IsoDate;
  /** Heading level of a detailed card, one below the heading of the list. */
  level?: 2 | 3;
};

/** One exercise of the library, in the chosen density. */
export function LibraryItem({ exercise, density, inPlan, muscle, plan, today, level = 2 }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const text = useExerciseText();
  const [viewing, setViewing] = useState(false);
  const equipment = useAppStore((store) => store.state.equipment);
  const excluded = useAppStore((store) => !!store.state.excluded[exercise.id]);
  const flags = useAppStore((store) => store.state);

  const name = text.name(exercise);
  const available = hasEquipment(exercise, equipment);
  const noGear = exercise.equipment.some((alternative) => alternative.length === 0);
  const gear = text.equipment(exercise);

  const tags = (
    <>
      {inPlan && <Chip tone="accent">{t('library.tags.inPlan')}</Chip>}
      {excluded && <Chip>{t('library.tags.excluded')}</Chip>}
      {muscle && !exercise.primary.includes(muscle) && <Chip>{t('library.tags.assists')}</Chip>}
      {noGear ? (
        <Chip tone="good">{t('library.tags.noGear')}</Chip>
      ) : (
        <Chip className={styles.gear}>{available ? gear : t('library.tags.needs', { gear })}</Chip>
      )}
    </>
  );
  const viewer = viewing && (
    <ExerciseViewer exercise={exercise} onClose={() => setViewing(false)} />
  );

  if (density !== 'cards') {
    return (
      <>
        <button
          type="button"
          className={density === 'grid' ? styles.tile : styles.row}
          aria-label={t('library.open', { name })}
          onClick={() => setViewing(true)}
        >
          <img
            className={styles.image}
            src={exercisePhotoUrl(exercise.id, 0)}
            alt=""
            loading="lazy"
          />
          <span className={styles.text}>
            <span className={styles.name}>{name}</span>
            <span className={styles.muscles}>{text.muscles(exercise)}</span>
            <span className={styles.tags}>{tags}</span>
          </span>
        </button>
        {viewer}
      </>
    );
  }

  const upcoming = exerciseSessions(plan.sessions, exercise.id).find(
    ({ session }) => session.date >= today && !isFinished(flags, session.id),
  );
  const capacity = plan.capacity[exercise.id];
  const steps = text.instructions(exercise);
  const weighted = exercise.type === 'weighted';
  const Heading = level === 2 ? 'h2' : 'h3';

  return (
    <article className={styles.card} aria-labelledby={`library-${exercise.id}`}>
      <ExercisePhoto exercise={exercise} />
      <div className={styles.body}>
        <div>
          <Heading id={`library-${exercise.id}`} className={styles.title}>
            {name}
          </Heading>
          {format.locale !== 'en' && (
            <p className={styles.muscles} lang="en">
              {exercise.name.en}
            </p>
          )}
        </div>
        <p className={styles.tags}>{tags}</p>
        <dl className={styles.facts}>
          <dt>{t('library.detail.primary')}</dt>
          <dd>{format.capitalize(text.primaryMuscles(exercise))}</dd>
          {exercise.secondary.length > 0 && (
            <>
              <dt>{t('library.detail.secondary')}</dt>
              <dd>
                {format.capitalize(
                  exercise.secondary.map((id) => t(`muscles.${id}.name`)).join(', '),
                )}
              </dd>
            </>
          )}
          <dt>{t('library.detail.equipment')}</dt>
          <dd>{format.capitalize(gear)}</dd>
          <dt>{t('library.detail.type')}</dt>
          <dd>
            {[
              t(exercise.compound ? 'library.detail.compound' : 'library.detail.isolation'),
              t(`library.detail.${exercise.type}`),
              exercise.unilateral ? t('exercise.perSide') : null,
            ]
              .filter(Boolean)
              .join(', ')}
          </dd>
          <dt>{t('library.detail.difficulty')}</dt>
          <dd>{t(`difficulty.${exercise.level}`)}</dd>
          {upcoming && (
            <>
              <dt>{t('library.detail.next')}</dt>
              <dd>
                {format.date(upcoming.session.date)}: <strong>{text.dose(upcoming.item)}</strong>
                {upcoming.item.prescription.type === 'weighted' &&
                  ` · ${text.load(exercise, upcoming.item.prescription.weight)}`}
              </dd>
            </>
          )}
          {capacity && (
            <>
              <dt>
                {t(weighted ? 'library.detail.capacityWeighted' : 'library.detail.capacityOther')}
              </dt>
              <dd>
                {weighted
                  ? t('units.kg', { value: format.number(Math.round(capacity.value * 2) / 2) })
                  : exercise.type === 'timed'
                    ? t('units.seconds', { value: Math.round(capacity.value) })
                    : t('units.reps', { count: Math.round(capacity.value) })}
              </dd>
            </>
          )}
        </dl>
        <div>
          <Button
            size="sm"
            variant={excluded ? 'default' : 'ghost'}
            onClick={() =>
              excluded ? actions.restoreExercise(exercise.id) : actions.excludeExercise(exercise.id)
            }
          >
            {t(excluded ? 'library.detail.restore' : 'library.detail.exclude')}
          </Button>
        </div>
      </div>
      <Disclosure summary={t('library.detail.steps', { count: steps.items.length })}>
        <ol className={styles.steps} lang={steps.lang}>
          {steps.items.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </Disclosure>
    </article>
  );
}

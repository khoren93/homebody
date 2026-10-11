import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/Icon';
import { Num } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Segmented } from '@/components/Segmented';
import type { Exercise, MuscleId } from '@/data';
import { hasEquipment } from '@/engine';
import { useExerciseText } from '@/features/exercise/useExerciseText';
import { i18n } from '@/i18n';
import { useFormat } from '@/i18n/useFormat';
import { cx } from '@/lib/cx';
import { readPref, writePref } from '@/lib/storage';
import { useToday } from '@/lib/useToday';
import { CATALOG, planExerciseIds, useAppStore, usePlan } from '@/store';

import styles from './ExerciseBrowser.module.css';
import {
  AVAILABILITY,
  type Availability,
  DENSITIES,
  type Density,
  filterLibrary,
} from './filterLibrary';
import { LibraryItem } from './LibraryItem';

const DENSITY_ICONS: Record<Density, IconName> = {
  compact: 'list',
  grid: 'library',
  cards: 'cards',
};
const DENSITY_PREF = 'libraryDensity';

function savedDensity(): Density {
  const saved = readPref(DENSITY_PREF);
  return DENSITIES.find((density) => density === saved) ?? 'grid';
}

/** Everything searchable about an exercise, in both languages. */
function searchText(exercise: Exercise): string {
  const parts: string[] = [exercise.name.en, exercise.name.ru];
  for (const names of Object.values(exercise.implementNames ?? {})) parts.push(names.en, names.ru);
  for (const locale of ['en', 'ru'] as const) {
    const t = i18n.getFixedT(locale);
    for (const muscle of [...exercise.primary, ...exercise.secondary]) {
      parts.push(t(`muscles.${muscle}.name`));
    }
    for (const id of new Set(exercise.equipment.flat())) parts.push(t(`equipment.${id}.inline`));
    if (exercise.equipment.some((alternative) => alternative.length === 0)) {
      parts.push(t('equipment.none'));
    }
  }
  return parts.join(' ').toLocaleLowerCase();
}

type Props = {
  title: string;
  /** Only exercises that train this muscle, as a primary or secondary mover. */
  muscle?: MuscleId | undefined;
  /** Id of the header, so a screen can scroll to the list. */
  id?: string;
};

/**
 * The exercise catalog with its search, filters and density switch. It renders
 * the blocks of a screen side by side, so it sits directly inside a `Page`.
 */
export function ExerciseBrowser({ title, muscle, id }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const text = useExerciseText();
  const today = useToday();
  const { plan } = usePlan();
  const equipment = useAppStore((store) => store.state.equipment);
  const [query, setQuery] = useState('');
  const [availability, setAvailability] = useState<Availability>('all');
  const [density, setDensity] = useState<Density>(savedDensity);

  const inPlan = useMemo(() => new Set(planExerciseIds(plan)), [plan]);
  const index = useMemo(
    () => new Map(CATALOG.list.map((exercise) => [exercise.id, searchText(exercise)])),
    [],
  );
  const results = filterLibrary(
    CATALOG.list,
    { query, availability, muscle },
    {
      isAvailable: (exercise) => hasEquipment(exercise, equipment),
      inPlan,
      nameOf: text.name,
      searchTextOf: (exercise) => index.get(exercise.id) ?? '',
      locale: format.locale,
    },
  );

  const chooseDensity = (next: Density) => {
    setDensity(next);
    writePref(DENSITY_PREF, next);
  };

  return (
    <>
      <header id={id} className={styles.head}>
        <h2>{title}</h2>
        <Num className={styles.count} role="status">
          {t('library.count', { count: results.length })}
        </Num>
      </header>

      <label className={styles.search}>
        <Icon name="search" />
        <input
          className={styles.input}
          type="search"
          autoComplete="off"
          placeholder={t('library.search')}
          aria-label={t('library.searchLabel')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className={styles.controls}>
        <Segmented
          className={styles.filters}
          legend={t('library.filter.label')}
          value={availability}
          onChange={setAvailability}
          options={AVAILABILITY.map((value) => ({ value, label: t(`library.filter.${value}`) }))}
        />
        <div className={styles.density} role="group" aria-label={t('library.density.label')}>
          {DENSITIES.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.densityButton}
              aria-pressed={value === density}
              aria-label={t(`library.density.${value}`)}
              onClick={() => chooseDensity(value)}
            >
              <Icon name={DENSITY_ICONS[value]} />
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <Panel>
          <p>{t('library.empty')}</p>
        </Panel>
      ) : (
        <ul className={cx(styles.results, styles[density])} aria-label={title}>
          {results.map((exercise) => (
            <li key={exercise.id}>
              <LibraryItem
                exercise={exercise}
                density={density}
                inPlan={inPlan.has(exercise.id)}
                muscle={muscle}
                plan={plan}
                today={today}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

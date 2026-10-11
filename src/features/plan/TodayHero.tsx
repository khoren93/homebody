import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Eyebrow } from '@/components/Layout';
import { Stat, StatGrid } from '@/components/Stat';
import { type EquipmentId, exercisePhotoUrl } from '@/data';
import type { IsoDate, LoadedSession } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { routeHref } from '@/lib/router';
import { useElementWidth } from '@/lib/useElementWidth';
import { CATALOG, sessionProgress, useAppStore } from '@/store';

import styles from './TodayHero.module.css';
import { useSessionLabels } from './useSessionLabels';

/**
 * Photo tiles shrink on a narrow row, down to this side in pixels, with this
 * gap between them: as in the styles.
 */
const TILE_MIN = 44;
const TILE_GAP = 8;
/** How many tiles are shown until the width of the row is known. */
const DEFAULT_TILES = 5;

/**
 * How many exercise photos fit a row of the given width. Every photo is shown
 * when there is room; otherwise the last tile that fits becomes the "+N" tile.
 */
function visiblePhotos(count: number, width: number): number {
  const tiles = width > 0 ? Math.floor((width + TILE_GAP) / (TILE_MIN + TILE_GAP)) : DEFAULT_TILES;
  return count <= tiles ? count : Math.max(1, tiles - 1);
}

/** The next workout: what it is, how long it takes, and the one button that starts it. */
export function TodayHero({ session, today }: { session: LoadedSession; today: IsoDate }) {
  const { t } = useTranslation();
  const format = useFormat();
  const labels = useSessionLabels();
  const equipment = useAppStore((store) => store.state.equipment);
  const started = useAppStore((store) => sessionProgress(session, store.setLogs).done > 0);
  const thumbs = useRef<HTMLUListElement>(null);
  const thumbsWidth = useElementWidth(thumbs);

  const exercises = session.items.flatMap((item) => CATALOG.byId.get(item.exerciseId) ?? []);
  const totalSets = session.items.reduce((sum, item) => sum + item.sets, 0);
  const photos = visiblePhotos(exercises.length, thumbsWidth);

  // The gear this session actually needs, from the alternative the user owns.
  const gear = new Set<EquipmentId>();
  for (const exercise of exercises) {
    const owned = exercise.equipment.find((items) => items.every((id) => equipment[id]));
    owned?.forEach((id) => gear.add(id));
  }
  const gearText = [...gear].map((id) => t(`equipment.${id}.inline`)).join(', ');

  const when = session.date === today ? t('plan.hero.today') : format.date(session.date);
  const eyebrow = [
    when,
    t('plan.hero.week', { week: session.week + 1 }),
    labels.phase(session),
  ].join(' · ');

  return (
    <section className={styles.hero} aria-labelledby="next-session-title">
      <div className={styles.top}>
        <Eyebrow accent>{eyebrow}</Eyebrow>
        {!session.deload && (
          <Chip kind="data" className={styles.rir}>
            {t('plan.hero.rirChip', { rir: session.rir })}
          </Chip>
        )}
      </div>
      <div>
        <h1 id="next-session-title" className={styles.title}>
          {labels.name(session)}
        </h1>
        <p className={styles.focus}>
          {[labels.focus(session), gearText].filter(Boolean).join(' · ')}
        </p>
      </div>
      <ul
        ref={thumbs}
        className={styles.thumbs}
        aria-label={t('units.exercises', { count: exercises.length })}
      >
        {exercises.slice(0, photos).map((exercise) => (
          <li key={exercise.id}>
            <img
              className={styles.thumb}
              src={exercisePhotoUrl(exercise.id, 0)}
              alt={format.exercise(exercise, equipment)}
              loading="lazy"
            />
          </li>
        ))}
        {exercises.length > photos && (
          <li className={styles.more}>
            {t('plan.hero.more', { count: exercises.length - photos })}
          </li>
        )}
      </ul>
      <StatGrid columns={3} look="wells">
        <Stat
          value={exercises.length}
          label={t('plan.hero.exercises', { count: exercises.length })}
        />
        <Stat value={totalSets} label={t('plan.hero.workingSets', { count: totalSets })} />
        <Stat
          value={t('plan.hero.minutes', { minutes: session.minutes })}
          label={t('plan.hero.withRest')}
        />
      </StatGrid>
      <ButtonLink
        variant="primary"
        block
        href={routeHref({ name: 'session', sessionId: session.id })}
      >
        <Icon name="play" />
        {t(started ? 'plan.hero.resume' : 'plan.hero.start')}
      </ButtonLink>
    </section>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BarList } from '@/components/BarList';
import { Eyebrow, Muted, Num, Page } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Section } from '@/components/Section';
import { Segmented } from '@/components/Segmented';
import { MUSCLE_IDS, type MuscleId } from '@/data';
import { addDays, GOALS, muscleLoad, volumeTier } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { MUSCLE_MODES, type MuscleMode, navigate } from '@/lib/router';
import { useToday } from '@/lib/useToday';
import { CATALOG, useAppStore, usePlan } from '@/store';

import { BodyFigure } from './BodyFigure';
import { ExerciseBrowser } from './ExerciseBrowser';
import styles from './ExercisesScreen.module.css';
import { HeatLegend } from './HeatLegend';
import { MuscleChips } from './MuscleChips';
import { MuscleDetail } from './MuscleDetail';

const PERIODS = [7, 30, 0] as const;
type Period = (typeof PERIODS)[number];
const EXERCISES_ID = 'exercise-list';

type Props = { mode?: MuscleMode | undefined; muscle?: MuscleId | undefined };

/**
 * The exercise catalog behind a body map: the map and the chips pick a muscle,
 * and the load modes heat the map by what was done or what is planned.
 */
export function ExercisesScreen({ mode = 'overview', muscle }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const today = useToday();
  const { volume } = usePlan();
  const history = useAppStore((store) => store.history);
  const goal = useAppStore((store) => store.state.profile.goal);
  const [period, setPeriod] = useState<Period>(7);

  const week = muscleLoad(history, CATALOG, { today, days: 7 });
  const month = muscleLoad(history, CATALOG, { today, days: 30 });
  const window =
    period === 7 ? week : period === 30 ? month : muscleLoad(history, CATALOG, { today, days: 0 });

  const heated = mode !== 'overview';
  const perWeek = mode === 'plan' ? volume : window.perWeek;
  const setsOf = (id: MuscleId) => perWeek[id] ?? 0;
  const tierOf = (id: MuscleId) => volumeTier(id, setsOf(id), goal);
  // The selected muscle is always rated, in the overview by the last seven days.
  const detailTier =
    muscle && (heated ? tierOf(muscle) : volumeTier(muscle, week.perWeek[muscle] ?? 0, goal));

  const go = (next: { mode?: MuscleMode; muscle?: MuscleId | undefined }) => {
    const nextMode = next.mode ?? mode;
    const nextMuscle = 'muscle' in next ? next.muscle : muscle;
    navigate(
      {
        name: 'exercises',
        ...(nextMode !== 'overview' && { mode: nextMode }),
        ...(nextMuscle && { muscle: nextMuscle }),
      },
      { replace: true },
    );
  };
  const select = (id: MuscleId) => go({ muscle: id === muscle ? undefined : id });

  const zoneLabel = (id: MuscleId) => {
    const name = format.capitalize(t(`muscles.${id}.name`));
    return heated ? t('map.zone', { muscle: name, tier: t(`map.tiers.${tierOf(id)}`) }) : name;
  };

  const sessionsInWindow = new Set(
    history
      .filter((entry) => period === 0 || entry.date > addDays(today, -period))
      .filter((entry) => entry.date <= today)
      .map((entry) => entry.sessionId),
  ).size;
  const [min, max] = GOALS[goal].weeklySets;
  const scaleMax = Math.max(max * 1.2, ...MUSCLE_IDS.map(setsOf));
  const ranked = [...MUSCLE_IDS].sort((a, b) => setsOf(b) - setsOf(a));

  return (
    <Page>
      <header className={styles.head}>
        <h1>{t('nav.exercises')}</h1>
        {heated && (
          <Num className={styles.meta}>
            {mode === 'plan'
              ? t('map.regularWeek')
              : t('map.workouts', { count: sessionsInWindow })}
          </Num>
        )}
      </header>

      <Segmented
        look="tabs"
        legend={t('map.mode.label')}
        value={mode}
        onChange={(next) => go({ mode: next })}
        options={MUSCLE_MODES.map((value) => ({ value, label: t(`map.mode.${value}`) }))}
      />
      {mode === 'done' && (
        <Segmented
          legend={t('map.period.label')}
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((days) => ({ value: days, label: t(`map.period.${days}`) }))}
        />
      )}
      <Muted small>{t(`map.intro.${mode}`)}</Muted>

      <Panel>
        <div className={styles.figures}>
          {(['front', 'back'] as const).map((side) => (
            <figure key={side} className={styles.view}>
              <BodyFigure
                side={side}
                label={t(`map.${side}Label`)}
                {...(heated && { tierOf })}
                selected={muscle}
                onSelect={select}
                zoneLabel={zoneLabel}
              />
              <Eyebrow as="figcaption">{t(`map.${side}`)}</Eyebrow>
            </figure>
          ))}
        </div>
        {heated && <HeatLegend current={detailTier} />}
      </Panel>
      <MuscleChips selected={muscle} onSelect={select} />

      {muscle && (
        <MuscleDetail
          muscle={muscle}
          goal={goal}
          today={today}
          tier={detailTier}
          sets7={week.total[muscle] ?? 0}
          sets30={month.total[muscle] ?? 0}
          planned={volume[muscle] ?? 0}
          lastTrained={week.last[muscle]}
          // In the load modes the ranking sits between the sheet and the exercises.
          onBrowse={
            heated ? () => document.getElementById(EXERCISES_ID)?.scrollIntoView() : undefined
          }
          onClose={() => go({ muscle: undefined })}
        />
      )}

      {heated && (
        <Section
          title={t(mode === 'plan' ? 'map.ranked.plan' : `map.ranked.done${period}`)}
          description={[
            t('map.norm', { goal: t(`goal.${goal}`).toLocaleLowerCase(format.locale), min, max }),
            mode === 'done' && Object.keys(window.total).length === 0 ? t('map.noHistory') : null,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <BarList
            max={scaleMax}
            onSelect={(id) => select(id as MuscleId)}
            rows={ranked.map((id) => ({
              id,
              label: format.capitalize(t(`muscles.${id}.name`)),
              value: setsOf(id),
              valueText: format.number(setsOf(id), 1),
              tier: tierOf(id),
              selected: id === muscle,
            }))}
          />
        </Section>
      )}

      <ExerciseBrowser
        id={EXERCISES_ID}
        muscle={muscle}
        title={
          muscle
            ? format.capitalize(t('map.exercises.muscle', { muscle: t(`muscles.${muscle}.name`) }))
            : t('map.exercises.all')
        }
      />
    </Page>
  );
}

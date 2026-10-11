import { useTranslation } from 'react-i18next';

import { Field } from '@/components/Field';
import { Grid } from '@/components/Grid';
import { NumberInput } from '@/components/NumberInput';
import { Section } from '@/components/Section';
import { Segmented } from '@/components/Segmented';
import type { Goal, Level, Sex } from '@/engine';
import { useToday } from '@/lib/useToday';
import { actions, latestBodyWeight, useAppStore } from '@/store';

const SEXES: readonly Sex[] = ['male', 'female'];
const LEVELS: readonly Level[] = ['beginner', 'intermediate', 'advanced'];
const GOALS: readonly Goal[] = ['hypertrophy', 'strength', 'endurance'];

export function ProfilePanel() {
  const { t } = useTranslation();
  const today = useToday();
  const profile = useAppStore((store) => store.state.profile);
  const weight = useAppStore((store) => latestBodyWeight(store.state.bodyWeights)?.kg ?? null);

  return (
    <Section title={t('settings.profile.title')}>
      <Grid>
        <Field label={t('settings.profile.age')}>
          {(control) => (
            <NumberInput
              {...control}
              integer
              min={14}
              max={90}
              value={profile.age}
              onCommit={(age) => actions.setProfile({ age })}
            />
          )}
        </Field>
        <Field label={t('settings.profile.height')}>
          {(control) => (
            <NumberInput
              {...control}
              min={120}
              max={230}
              value={profile.heightCm}
              onCommit={(heightCm) => actions.setProfile({ heightCm })}
            />
          )}
        </Field>
        <Field label={t('settings.profile.weight')}>
          {(control) => (
            <NumberInput
              {...control}
              min={25}
              max={300}
              value={weight}
              onCommit={(kg) => actions.setBodyWeight(kg, today)}
            />
          )}
        </Field>
      </Grid>
      <Segmented
        legend={t('settings.profile.sex')}
        showLegend
        value={profile.sex}
        onChange={(sex) => actions.setProfile({ sex })}
        options={SEXES.map((value) => ({ value, label: t(`sex.${value}`) }))}
      />
      <Segmented
        legend={t('settings.profile.level')}
        showLegend
        value={profile.level}
        onChange={(level) => actions.setProfile({ level })}
        options={LEVELS.map((value) => ({
          value,
          label: t(`level.${value}.name`),
          hint: t(`level.${value}.hint`),
        }))}
      />
      <Segmented
        legend={t('settings.profile.goal')}
        showLegend
        value={profile.goal}
        onChange={(goal) => actions.setProfile({ goal })}
        options={GOALS.map((value) => ({ value, label: t(`goal.${value}`) }))}
      />
    </Section>
  );
}

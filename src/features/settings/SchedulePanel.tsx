import { useTranslation } from 'react-i18next';

import { CheckChip } from '@/components/CheckChip';
import { Field, Input } from '@/components/Field';
import { Fieldset } from '@/components/Fieldset';
import { Grid } from '@/components/Grid';
import { Section } from '@/components/Section';
import { Segmented } from '@/components/Segmented';
import { isIsoDate } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { actions, PLAN_WEEKS, SESSION_MINUTES, useAppStore } from '@/store';

export function SchedulePanel() {
  const { t } = useTranslation();
  const format = useFormat();
  const schedule = useAppStore((store) => store.state.schedule);
  const weekdays = format.weekdays();

  return (
    <Section title={t('settings.schedule.title')}>
      <Fieldset
        legend={`${t('settings.schedule.days')} · ${t('settings.schedule.perWeek', { count: schedule.days.length })}`}
      >
        <Grid kind="week">
          {weekdays.map((name, day) => (
            <CheckChip
              key={name}
              checked={schedule.days.includes(day)}
              onChange={() => actions.toggleTrainingDay(day)}
            >
              {name}
            </CheckChip>
          ))}
        </Grid>
      </Fieldset>
      <Field
        label={
          <>
            {t('settings.schedule.minutes')}:{' '}
            <output>{t('units.minutes', { value: schedule.minutes })}</output>
          </>
        }
      >
        {(control) => (
          <Input
            {...control}
            type="range"
            min={SESSION_MINUTES.min}
            max={SESSION_MINUTES.max}
            step={SESSION_MINUTES.step}
            value={schedule.minutes}
            onChange={(event) => actions.setSessionMinutes(Number(event.target.value))}
          />
        )}
      </Field>
      <Grid>
        <Field label={t('settings.schedule.start')}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={schedule.start}
              onChange={(event) => {
                if (isIsoDate(event.target.value))
                  actions.setPlanShape({ start: event.target.value });
              }}
            />
          )}
        </Field>
      </Grid>
      <Segmented
        legend={t('settings.schedule.length')}
        showLegend
        value={schedule.weeks}
        onChange={(weeks) => actions.setPlanShape({ weeks })}
        options={PLAN_WEEKS.map((weeks) => ({
          value: weeks,
          label: t('units.weeks', { count: weeks }),
        }))}
      />
      <Segmented
        legend={t('settings.schedule.deload')}
        showLegend
        value={schedule.deload}
        onChange={(deload) => actions.setPlanShape({ deload })}
        options={[
          { value: true, label: t('settings.schedule.deloadOn') },
          { value: false, label: t('settings.schedule.deloadOff') },
        ]}
      />
    </Section>
  );
}

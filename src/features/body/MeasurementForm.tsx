import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Grid } from '@/components/Grid';
import { Muted } from '@/components/Layout';
import { Section } from '@/components/Section';
import { isIsoDate } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { parseNumber } from '@/lib/parseNumber';
import { useToday } from '@/lib/useToday';
import { actions, GIRTHS, latestBodyWeight, useAppStore } from '@/store';

const FIELDS = ['weight', ...GIRTHS] as const;
type FieldName = (typeof FIELDS)[number];

/** Logs weight and girths for a date. Empty fields are left as they are. */
export function MeasurementForm({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const today = useToday();
  const female = useAppStore((store) => store.state.profile.sex === 'female');
  const lastWeight = useAppStore((store) => latestBodyWeight(store.state.bodyWeights)?.kg);
  const lastGirths = useAppStore((store) =>
    [...store.state.measurements].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1),
  );
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Partial<Record<FieldName, string>>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const number = (name: FieldName) => parseNumber(values[name] ?? '') ?? undefined;
    actions.logMeasurement(isIsoDate(date) ? date : today, {
      kg: number('weight'),
      ...Object.fromEntries(GIRTHS.map((girth) => [girth, number(girth)])),
    });
    setValues({});
    onSaved();
  };

  // The last logged values are shown as placeholders, as a reminder of what was measured.
  const placeholder = (name: FieldName) => {
    const value = name === 'weight' ? lastWeight : lastGirths?.[name];
    return value === undefined ? undefined : format.number(value);
  };

  return (
    <Section title={t('body.form.title')}>
      <form onSubmit={submit}>
        <Grid>
          <Field label={t('body.form.date')}>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </Field>
          {FIELDS.map((name) => (
            <Field key={name} label={t(`body.form.${name}`)}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={placeholder(name)}
                  value={values[name] ?? ''}
                  onChange={(e) => setValues((current) => ({ ...current, [name]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </Grid>
        <Button type="submit" variant="primary" block>
          {t('body.form.save')}
        </Button>
      </form>
      <Muted small>{t(female ? 'body.form.hintFemale' : 'body.form.hint')}</Muted>
    </Section>
  );
}

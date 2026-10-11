import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { TsChart } from '@/components/chart/TsChart';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Eyebrow, Muted, Page } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Section } from '@/components/Section';
import { Segmented } from '@/components/Segmented';
import { Stat, StatGrid } from '@/components/Stat';
import { bmi, bmiCategory, diffDays, navyBodyFat } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { actions, type BodyMetric, GIRTHS, metricSeries, useAppStore } from '@/store';

import styles from './BodyScreen.module.css';
import { MeasurementForm } from './MeasurementForm';

const METRICS: readonly BodyMetric[] = ['kg', 'bf', ...GIRTHS];

export function BodyScreen() {
  const { t } = useTranslation();
  const format = useFormat();
  const state = useAppStore((store) => store.state);
  const [logging, setLogging] = useState(false);
  const [chosen, setChosen] = useState<BodyMetric>('kg');

  const seriesOf = (metric: BodyMetric) => metricSeries(state, metric);
  const available = METRICS.filter((metric) => metric === 'kg' || seriesOf(metric).length > 0);
  const metric = available.includes(chosen) ? chosen : 'kg';
  const series = seriesOf(metric);
  const first = series[0];
  const last = series.at(-1);

  const unit = (m: BodyMetric, value: string) =>
    m === 'kg'
      ? t('units.kg', { value })
      : m === 'bf'
        ? t('units.percent', { value })
        : t('units.cm', { value });
  const change = (m: BodyMetric): string | undefined => {
    const points = seriesOf(m);
    const [from, to] = [points[0], points.at(-1)];
    if (!from || !to || points.length < 2) return undefined;
    return unit(m, format.signed(Math.round((to[1] - from[1]) * 10) / 10));
  };

  const weights = seriesOf('kg');
  const weight = weights.at(-1)?.[1];
  const index = weight === undefined ? null : bmi(weight, state.profile.heightCm);
  const dates = [
    ...new Set([...state.bodyWeights, ...state.measurements].map((entry) => entry.date)),
  ].sort((a, b) => (a < b ? 1 : -1));

  return (
    <Page>
      <header className={styles.head}>
        <h1>{t('nav.body')}</h1>
        <Button
          size="sm"
          variant={logging ? 'default' : 'primary'}
          aria-expanded={logging}
          onClick={() => setLogging((open) => !open)}
        >
          {!logging && <Icon name="plus" />}
          {t(logging ? 'body.closeForm' : 'body.log')}
        </Button>
      </header>

      {logging && <MeasurementForm onSaved={() => setLogging(false)} />}

      <Panel aria-label={t(`body.metric.${metric}`)}>
        <div className={styles.figureRow}>
          <div>
            <Eyebrow>
              {t(`body.metric.${metric}`)}
              {last && ` · ${format.date(last[0], 'dayMonth')}`}
            </Eyebrow>
            {last ? (
              <p className={styles.figure}>
                <span>{format.number(last[1], 1)}</span>
                <span className={styles.unit}>
                  {t(`body.unit.${metric === 'kg' || metric === 'bf' ? metric : 'cm'}`)}
                </span>
              </p>
            ) : (
              <Muted>{t('body.noWeight')}</Muted>
            )}
          </div>
          {first && last && series.length > 1 && (
            <Chip kind="data">
              {t('body.since', {
                change: change(metric),
                days: t('units.days', { count: diffDays(first[0], last[0]) }),
              })}
            </Chip>
          )}
        </div>
        {series.length > 1 ? (
          <TsChart
            size="sm"
            tone="good"
            area
            label={t('body.chartLabel', { metric: t(`body.metric.${metric}`) })}
            series={[{ points: series, kind: 'solid' }]}
          />
        ) : (
          <Muted small>{t('body.needTwo')}</Muted>
        )}
        {available.length > 1 && (
          <Segmented
            legend={t('body.metric.label')}
            value={metric}
            onChange={setChosen}
            options={available.map((value) => ({ value, label: t(`body.metric.${value}`) }))}
          />
        )}
      </Panel>

      <StatGrid columns={2}>
        {seriesOf('bf').length > 0 && (
          <Stat
            eyebrow={t('body.metric.bf')}
            value={unit('bf', format.number(seriesOf('bf').at(-1)?.[1] ?? 0, 1))}
            change={[change('bf'), t('body.navy')].filter(Boolean).join(' · ')}
          />
        )}
        {GIRTHS.filter((girth) => seriesOf(girth).length > 0).map((girth) => (
          <Stat
            key={girth}
            eyebrow={t(`body.metric.${girth}`)}
            value={unit(girth, format.number(seriesOf(girth).at(-1)?.[1] ?? 0, 1))}
            change={change(girth)}
          />
        ))}
        <Stat
          eyebrow={t('body.bmi')}
          value={index === null ? '—' : format.number(index, 1)}
          change={[
            index === null ? null : t(`body.bmiCategory.${bmiCategory(index)}`),
            t('units.cm', { value: format.number(state.profile.heightCm) }),
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      </StatGrid>

      <Section title={t('body.journal.title')}>
        {dates.length === 0 ? (
          <Muted>{t('body.journal.empty')}</Muted>
        ) : (
          <ul className={styles.journal}>
            {dates.map((date) => {
              const kg = state.bodyWeights.find((entry) => entry.date === date)?.kg;
              const girths = state.measurements.find((entry) => entry.date === date);
              const fat = girths && navyBodyFat(state.profile.sex, state.profile.heightCm, girths);
              const parts = [
                ...GIRTHS.flatMap((girth) => {
                  const value = girths?.[girth];
                  return value ? [`${t(`body.metric.${girth}`)} ${format.number(value)}`] : [];
                }),
                ...(fat != null ? [t('body.journal.fat', { value: format.number(fat) })] : []),
              ];
              return (
                <li key={date} className={styles.entry}>
                  <div className={styles.entryText}>
                    <Muted small as="span">
                      {format.date(date, 'long')}
                    </Muted>
                    <span>
                      {kg !== undefined && (
                        <strong>{t('units.kg', { value: format.number(kg) })}</strong>
                      )}
                      {kg !== undefined && parts.length > 0 && ' · '}
                      {parts.join(' · ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.delete}
                    aria-label={t('body.journal.delete', { date: format.date(date, 'long') })}
                    onClick={() => actions.deleteMeasurement(date)}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Muted small>{t('body.intro')}</Muted>
    </Page>
  );
}

import { useRef } from 'react';

import type { IsoDate } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { cx } from '@/lib/cx';
import { useElementWidth } from '@/lib/useElementWidth';

import { type ChartBox, chartScale, linePath } from './scale';
import styles from './TsChart.module.css';

export type ChartSeries = {
  points: readonly (readonly [IsoDate, number])[];
  /** `solid` is what happened, `dashed` what the plan expects. */
  kind: 'solid' | 'dashed';
};

type Props = {
  series: readonly ChartSeries[];
  /** Describes the chart for assistive technology. */
  label: string;
  /** Color of the solid series: accent for strength, good for body metrics. */
  tone?: 'accent' | 'good';
  /** Shades the area under the solid series. */
  area?: boolean;
  /** A date to mark on the time axis, usually today. */
  marker?: { date: IsoDate; label: string };
  size?: 'md' | 'sm';
};

const BOXES: Record<'md' | 'sm', ChartBox> = {
  md: { width: 330, height: 150, left: 30, right: 8, top: 10, bottom: 24 },
  sm: { width: 350, height: 96, left: 30, right: 8, top: 8, bottom: 20 },
};

/**
 * The boxes are drawn for a phone. A wider container may enlarge the chart up
 * to this factor; beyond that the chart gains width instead of growing taller.
 */
const MAX_ZOOM = 1.5;

const time = (date: IsoDate) => Date.parse(`${date}T00:00:00Z`);

/**
 * A small time-series chart: solid line for what happened, dashed line for
 * the plan. Hand-written SVG, sized by its container.
 */
export function TsChart(props: Props) {
  return props.series.some((s) => s.points.length > 0) ? <Chart {...props} /> : null;
}

function Chart({ series, label, tone = 'accent', area = false, marker, size = 'md' }: Props) {
  const format = useFormat();
  const svg = useRef<SVGSVGElement>(null);
  const width = useElementWidth(svg);
  const all = series.flatMap((s) => s.points);

  const base = BOXES[size];
  const box = { ...base, width: Math.max(base.width, Math.round(width / MAX_ZOOM)) };
  const scale = chartScale(
    all.map(([date]) => time(date)),
    all.map(([, value]) => value),
    box,
  );
  const dates = all.map(([date]) => date).sort();
  const first = dates[0];
  const last = dates.at(-1);
  const baseline = box.height - box.bottom;

  return (
    <svg
      ref={svg}
      className={cx(styles.chart, styles[tone])}
      viewBox={`0 0 ${box.width} ${box.height}`}
      role="img"
      aria-label={label}
    >
      <g className={styles.grid}>
        {scale.ticks.map((tick) => (
          <line key={tick.value} x1={box.left} x2={box.width - box.right} y1={tick.y} y2={tick.y} />
        ))}
      </g>
      <g className={styles.axis} textAnchor="end">
        {scale.ticks.map((tick) => (
          <text key={tick.value} x={box.left - 6} y={tick.y + 3}>
            {format.number(tick.value, 1)}
          </text>
        ))}
      </g>

      {series.map((s, index) => {
        if (s.points.length === 0) return null;
        const points = s.points.map(([date, value]) => scale.point(time(date), value));
        const path = linePath(points);
        const start = points[0];
        const end = points.at(-1);
        return (
          <g key={index} className={styles[s.kind]}>
            {area && s.kind === 'solid' && start && end && points.length > 1 && (
              <path
                className={styles.area}
                d={`${path} L${end.x.toFixed(1)} ${baseline} L${start.x.toFixed(1)} ${baseline} Z`}
              />
            )}
            <path className={styles.line} d={path} />
            {points.map((p, i) => {
              const isLast = s.kind === 'solid' && i === points.length - 1;
              return (
                <circle
                  key={i}
                  className={isLast ? styles.current : styles.dot}
                  cx={p.x.toFixed(1)}
                  cy={p.y.toFixed(1)}
                  r={isLast ? 5.5 : 3}
                />
              );
            })}
          </g>
        );
      })}

      <g className={styles.axis}>
        {first && (
          <text x={box.left} y={box.height - 6}>
            {format.date(first, 'dayMonth')}
          </text>
        )}
        {last && last !== first && (
          <text x={box.width - box.right} y={box.height - 6} textAnchor="end">
            {format.date(last, 'dayMonth')}
          </text>
        )}
        {marker && first && last && marker.date > first && marker.date < last && (
          <text
            className={styles.marker}
            x={scale.point(time(marker.date), scale.min).x}
            y={box.height - 6}
            textAnchor="middle"
          >
            {marker.label}
          </text>
        )}
      </g>
    </svg>
  );
}

/** A tiny line without axes, for list rows. */
export function Sparkline({ values }: { values: readonly number[] }) {
  if (values.length < 2)
    return <svg className={styles.spark} viewBox="0 0 64 24" aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, i) => ({
    x: 2 + (i / (values.length - 1)) * 60,
    y: 21 - ((value - min) / span) * 18,
  }));
  return (
    <svg className={styles.spark} viewBox="0 0 64 24" aria-hidden="true">
      <path d={linePath(points)} />
    </svg>
  );
}

/** Explains the solid and dashed lines. */
export function ChartLegend({
  solid,
  dashed,
  tone = 'accent',
}: {
  solid: string;
  dashed: string;
  tone?: 'accent' | 'good';
}) {
  return (
    <p className={cx(styles.legend, styles[tone])}>
      <span className={styles.key}>
        <span className={styles.solidKey} aria-hidden="true" />
        {solid}
      </span>
      <span className={styles.key}>
        <span className={styles.dashedKey} aria-hidden="true" />
        {dashed}
      </span>
    </p>
  );
}

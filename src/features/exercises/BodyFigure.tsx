import type { MuscleId } from '@/data';
import type { VolumeTier } from '@/engine';
import { cx } from '@/lib/cx';

import styles from './BodyFigure.module.css';
import {
  BODY_VIEWBOX,
  type BodyShape,
  type BodySide,
  DETAIL_LINES,
  HEAD,
  musclesOf,
  SILHOUETTE,
  ZONES,
} from './bodyMap';

type Props = {
  side: BodySide;
  /** Names the figure for assistive technology. */
  label: string;
  /** Heat tier per muscle; omit to draw the plain overview. */
  tierOf?: (muscle: MuscleId) => VolumeTier;
  selected?: MuscleId | undefined;
  onSelect: (muscle: MuscleId) => void;
  /** Accessible name of a muscle zone. */
  zoneLabel: (muscle: MuscleId) => string;
};

const MIRROR = 'translate(200 0) scale(-1 1)';

function Shape({ shape, className }: { shape: BodyShape; className?: string | undefined }) {
  return (
    <>
      <path className={className} d={shape.d} />
      {shape.mirrored && <path className={className} d={shape.d} transform={MIRROR} />}
    </>
  );
}

/**
 * One view of the body with a clickable zone per muscle. Zones are buttons:
 * they can be reached with Tab and activated with Enter or Space.
 */
export function BodyFigure({ side, label, tierOf, selected, onSelect, zoneLabel }: Props) {
  return (
    <svg className={styles.figure} viewBox={BODY_VIEWBOX} role="group" aria-label={label}>
      <g className={styles.body}>
        <ellipse {...HEAD} />
        {SILHOUETTE.map((shape) => (
          <Shape key={shape.d} shape={shape} />
        ))}
      </g>

      {musclesOf(side).map((muscle) => {
        const tier = tierOf?.(muscle);
        const isSelected = muscle === selected;
        return (
          <g
            key={muscle}
            className={cx(
              styles.zone,
              tier !== undefined && styles[`tier${tier}`],
              tier === undefined && styles.plain,
              isSelected && styles.selected,
            )}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={zoneLabel(muscle)}
            onClick={() => onSelect(muscle)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onSelect(muscle);
            }}
          >
            {ZONES[side]
              .filter((zone) => zone.muscle === muscle)
              .map((zone) => (
                <Shape key={zone.d} shape={zone} />
              ))}
          </g>
        );
      })}

      <g className={styles.lines}>
        {DETAIL_LINES[side].map((line) => (
          <Shape key={line.d} shape={line} />
        ))}
      </g>
    </svg>
  );
}

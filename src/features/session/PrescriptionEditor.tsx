import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Field, Select } from '@/components/Field';
import { Muted } from '@/components/Layout';
import { NumberInput } from '@/components/NumberInput';
import type { Exercise } from '@/data';
import type { IsoDate, LoadedItem } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { actions } from '@/store';

import styles from './PrescriptionEditor.module.css';

type Props = { exercise: Exercise; item: LoadedItem; sessionId: IsoDate };

/** Lets the user replace the calculated weight and reps with what they actually do. */
export function PrescriptionEditor({ exercise, item, sessionId }: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const p = item.prescription;
  const amount = p.type === 'timed' ? p.seconds : p.reps;

  const options =
    p.type === 'weighted'
      ? p.options.some((weight) => Math.abs(weight - p.weight) < 1e-6)
        ? p.options
        : [...p.options, p.weight].sort((a, b) => a - b)
      : [];

  return (
    <div className={styles.editor}>
      {p.type === 'weighted' && (
        <Field
          className={styles.field}
          label={t(
            exercise.loadMode === 'pair' ? 'session.edit.weightPerHand' : 'session.edit.weight',
          )}
        >
          {(control) => (
            <Select
              {...control}
              value={p.weight}
              onChange={(event) =>
                actions.editPrescription(exercise.id, sessionId, {
                  weight: Number(event.target.value),
                  reps: p.reps,
                })
              }
            >
              {options.map((weight) => (
                <option key={weight} value={weight}>
                  {format.number(weight)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Field
        className={styles.field}
        label={t(p.type === 'timed' ? 'session.edit.seconds' : 'session.edit.reps')}
      >
        {(control) => (
          <NumberInput
            {...control}
            integer
            min={1}
            max={300}
            value={amount}
            onCommit={(reps) =>
              actions.editPrescription(
                exercise.id,
                sessionId,
                p.type === 'weighted' ? { weight: p.weight, reps } : { reps },
              )
            }
          />
        )}
      </Field>
      {p.edited && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => actions.restoreCalculation(exercise.id, sessionId)}
        >
          {t('session.edit.restore')}
        </Button>
      )}
      <Muted small className={styles.hint}>
        {t('session.edit.hint')}
      </Muted>
    </div>
  );
}

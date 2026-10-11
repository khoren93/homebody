import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Row } from '@/components/Layout';
import { Section } from '@/components/Section';
import { actions, LOAD_SCALE, useAppStore } from '@/store';

const NUDGES = [-0.1, -0.05, 0.05] as const;

export function LoadScalePanel() {
  const { t } = useTranslation();
  const scale = useAppStore((store) => store.state.loadScale);
  const percent = Math.round(scale * 100);
  const percentText = (value: number) => t('units.percent', { value });

  return (
    <Section title={t('settings.scale.title')} description={t('settings.scale.about')}>
      <Field
        label={
          <>
            {t('settings.scale.label')}: <output>{percentText(percent)}</output>
          </>
        }
      >
        {(control) => (
          <Input
            {...control}
            type="range"
            min={LOAD_SCALE.min * 100}
            max={LOAD_SCALE.max * 100}
            step={LOAD_SCALE.step * 100}
            value={percent}
            onChange={(event) => actions.setLoadScale(Number(event.target.value) / 100)}
          />
        )}
      </Field>
      <Row role="group" aria-label={t('settings.scale.quick')}>
        {NUDGES.map((delta) => (
          <Button key={delta} size="sm" onClick={() => actions.nudgeLoadScale(delta)}>
            {delta > 0 ? '+' : '−'}
            {percentText(Math.abs(Math.round(delta * 100)))}
          </Button>
        ))}
        <Button size="sm" aria-pressed={percent === 100} onClick={() => actions.setLoadScale(1)}>
          {t('settings.scale.reset')}
        </Button>
      </Row>
    </Section>
  );
}

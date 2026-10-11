import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { CheckChip } from '@/components/CheckChip';
import { Field, Input } from '@/components/Field';
import { Grid } from '@/components/Grid';
import { Muted, Row, Stack } from '@/components/Layout';
import { NumberInput } from '@/components/NumberInput';
import { Section } from '@/components/Section';
import { EQUIPMENT_IDS, type EquipmentId } from '@/data';
import { type BarConfig, parseWeightList } from '@/engine';
import { formatNumber } from '@/i18n/format';
import { useFormat } from '@/i18n/useFormat';
import { useDraft } from '@/lib/useDraft';
import { actions, CATALOG, derivePlan, diffPlanExercises, useAppStore } from '@/store';

/** What changed in the plan after the last equipment toggle. */
type Change = { id: EquipmentId; owned: boolean; added: string[]; removed: string[] };

/** How many exercise names are spelled out before "and N more". */
const NAMES_SHOWN = 4;

function WeightListField({ kind }: { kind: 'db' | 'kb' }) {
  const { t } = useTranslation();
  const { locale } = useFormat();
  const weights = useAppStore((store) => store.state.equipmentConfig[kind]);
  // A decimal comma would be ambiguous next to a list comma, so such locales use semicolons.
  const separator = formatNumber(0.5, locale).includes(',') ? '; ' : ', ';
  const text = weights.map((weight) => formatNumber(weight, locale)).join(separator);
  const draft = useDraft(text, (typed) =>
    actions.setEquipmentConfig({ [kind]: parseWeightList(typed) }),
  );

  return (
    <Field label={t(`settings.equipment.${kind}List`)} hint={t('settings.equipment.listHint')}>
      {(control) => <Input {...control} type="text" autoComplete="off" {...draft} />}
    </Field>
  );
}

function BarFields({ kind }: { kind: 'bb' | 'ez' }) {
  const { t } = useTranslation();
  const config = useAppStore((store) => store.state.equipmentConfig[kind]);
  const set = (changes: Partial<BarConfig>) =>
    actions.setEquipmentConfig({ [kind]: { ...config, ...changes } });

  return (
    <Stack gap={2} role="group" aria-label={t(`equipment.${kind}.name`)}>
      <Muted small as="span">
        {t(`equipment.${kind}.name`)}
      </Muted>
      <Grid>
        <Field label={t('settings.equipment.bar')}>
          {(control) => (
            <NumberInput
              {...control}
              min={0}
              max={50}
              value={config.bar}
              onCommit={(bar) => set({ bar })}
            />
          )}
        </Field>
        <Field label={t('settings.equipment.step')}>
          {(control) => (
            <NumberInput
              {...control}
              min={0.5}
              max={50}
              value={config.step}
              onCommit={(step) => set({ step })}
            />
          )}
        </Field>
        <Field label={t('settings.equipment.max')}>
          {(control) => (
            <NumberInput
              {...control}
              min={0}
              max={500}
              value={config.max}
              onCommit={(max) => set({ max })}
            />
          )}
        </Field>
      </Grid>
    </Stack>
  );
}

function ChangeSummary({ change }: { change: Change }) {
  const { t } = useTranslation();
  const format = useFormat();
  const equipment = useAppStore((store) => store.state.equipment);

  const names = (ids: string[]) => {
    const shown = ids.slice(0, NAMES_SHOWN).map((id) => {
      const exercise = CATALOG.byId.get(id);
      return t('common.quote', { text: exercise ? format.exercise(exercise, equipment) : id });
    });
    if (ids.length > NAMES_SHOWN)
      shown.push(t('common.andMore', { count: ids.length - NAMES_SHOWN }));
    return shown.join(', ');
  };

  const item = t(`equipment.${change.id}.inline`);
  const parts = [
    t(change.owned ? 'settings.equipment.added' : 'settings.equipment.removed', { item }),
  ];
  if (change.added.length > 0 || change.removed.length > 0) {
    parts.push(t('settings.equipment.rebuilt'));
    if (change.added.length > 0) {
      parts.push(t('settings.equipment.newExercises', { list: names(change.added) }));
    }
    if (change.removed.length > 0) {
      parts.push(t('settings.equipment.goneExercises', { list: names(change.removed) }));
    }
    parts.push(t('settings.equipment.recalculated'));
  } else {
    parts.push(
      t(change.owned ? 'settings.equipment.unchangedAdded' : 'settings.equipment.unchanged'),
    );
  }

  return (
    <Banner role="status" tone="info">
      {parts.join(' ')}
    </Banner>
  );
}

export function EquipmentPanel() {
  const { t } = useTranslation();
  const equipment = useAppStore((store) => store.state.equipment);
  const [change, setChange] = useState<Change | null>(null);

  const toggle = (id: EquipmentId) => {
    const before = derivePlan(useAppStore.getState().state).plan;
    actions.toggleEquipment(id);
    const state = useAppStore.getState().state;
    setChange({
      id,
      owned: !!state.equipment[id],
      ...diffPlanExercises(before, derivePlan(state).plan),
    });
  };

  return (
    <Section title={t('settings.equipment.title')} description={t('settings.equipment.about')}>
      <Row role="group" aria-label={t('settings.equipment.list')}>
        {EQUIPMENT_IDS.map((id) => (
          <CheckChip key={id} marker checked={!!equipment[id]} onChange={() => toggle(id)}>
            {t(`equipment.${id}.name`)}
          </CheckChip>
        ))}
      </Row>
      {change && <ChangeSummary change={change} />}
      {equipment.db && <WeightListField kind="db" />}
      {equipment.kb && <WeightListField kind="kb" />}
      {equipment.bb && <BarFields kind="bb" />}
      {equipment.ez && <BarFields kind="ez" />}
    </Section>
  );
}

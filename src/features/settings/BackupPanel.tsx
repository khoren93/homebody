import { type ChangeEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Muted, Row } from '@/components/Layout';
import { Section } from '@/components/Section';
import { toIsoDate } from '@/engine';
import { useFormat } from '@/i18n/useFormat';
import { downloadText } from '@/lib/download';
import { useToday } from '@/lib/useToday';
import {
  BackupError,
  backupFilename,
  createBackup,
  parseBackup,
  type ParsedBackup,
  restoreBackup,
} from '@/store';

import styles from './BackupPanel.module.css';

type Message = { tone: 'ok' | 'error'; text: string };

/** Saves everything to one file and restores it, with a preview before anything is replaced. */
export function BackupPanel() {
  const { t } = useTranslation();
  const format = useFormat();
  const today = useToday();
  const fileId = useId();
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const exportBackup = async () => {
    try {
      const backup = await createBackup();
      downloadText(backupFilename(today), JSON.stringify(backup));
      setMessage({ tone: 'ok', text: t('backup.exported') });
    } catch {
      setMessage({ tone: 'error', text: t('backup.exportFailed') });
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    try {
      setPending(parseBackup(await file.text(), today));
    } catch (error) {
      setPending(null);
      const reason = error instanceof BackupError ? error.reason : 'invalid';
      setMessage({ tone: 'error', text: t(`backup.${reason}`) });
    }
  };

  const restore = async () => {
    if (!pending) return;
    try {
      await restoreBackup(pending);
      setMessage({ tone: 'ok', text: t('backup.restored') });
    } catch {
      setMessage({ tone: 'error', text: t('backup.restoreFailed') });
    }
    setPending(null);
  };

  const exportedOn = (iso: string | null) => {
    const date = iso ? new Date(iso) : null;
    return date && !Number.isNaN(date.getTime())
      ? format.date(toIsoDate(date), 'long')
      : t('backup.previewUnknownDate');
  };

  return (
    <Section title={t('backup.title')} description={t('backup.about')}>
      <Row>
        <Button onClick={() => void exportBackup()}>{t('backup.export')}</Button>
        <label className={styles.file} htmlFor={fileId}>
          {t('backup.import')}
          <input
            id={fileId}
            className={styles.fileInput}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void onFile(event)}
          />
        </label>
      </Row>

      {message && (
        <Banner
          role={message.tone === 'error' ? 'alert' : 'status'}
          tone={message.tone === 'error' ? 'danger' : 'info'}
        >
          {message.text}
        </Banner>
      )}

      {pending && (
        <Banner
          role="alert"
          actions={
            <>
              <Button size="sm" variant="danger" onClick={() => void restore()}>
                {t('backup.confirm')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                {t('common.cancel')}
              </Button>
            </>
          }
        >
          <strong>{t('backup.previewTitle', { date: exportedOn(pending.exportedAt) })}</strong>{' '}
          {t('backup.previewBody', {
            sessions: t('backup.sessions', { count: pending.summary.sessions }),
            measurements: t('backup.measurements', { count: pending.summary.measurements }),
            photos: t('backup.photos', { count: pending.summary.photos }),
          })}
          {pending.legacy && <Muted small>{t('backup.legacy')}</Muted>}
        </Banner>
      )}
    </Section>
  );
}

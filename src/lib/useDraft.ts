import { type ChangeEvent, type KeyboardEvent, useState } from 'react';

/**
 * Lets an input be edited freely and commits the text only when the user
 * leaves the field or presses Enter. While it is being edited the field shows
 * the draft; otherwise it shows `value`, so an invalid draft that the caller
 * refuses to commit simply snaps back.
 */
export function useDraft(value: string, onCommit: (text: string) => void) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };

  return {
    value: draft ?? value,
    onChange: (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    onBlur: commit,
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') commit();
      if (event.key === 'Escape') setDraft(null);
    },
  };
}

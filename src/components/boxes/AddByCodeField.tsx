"use client";

import { StaffSearch } from '@/components/staff';
import { type FormEvent, useRef, useState } from 'react';

export type AddByCodeResult = { ok: true; message: string } | { ok: false; message: string };

type Props = {
  /** Adds the copy with this label code; never rejects. */
  onSubmit: (code: string) => Promise<AddByCodeResult>;
  /** Called once the queue of typed codes is empty (to refresh the screen). */
  onIdle?: () => void;
  disabled?: boolean;
};

/** Label code + Enter adds that copy to the box. Codes typed while an add is
 *  running wait in a serial queue, so none is lost or sent twice. No autofocus
 *  on mount (no keyboard popping up when the box opens); the focus comes back
 *  after every add. */
export default function AddByCodeField({ onSubmit, onIdle, disabled = false }: Props) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<AddByCodeResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef(0);
  // Latest callbacks, read when each queued code runs (not when it was typed).
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const run = async (code: string) => {
    let outcome: AddByCodeResult;
    try {
      outcome = await onSubmitRef.current(code);
    } catch (err) {
      outcome = { ok: false, message: err instanceof Error ? err.message : 'No se pudo agregar el juego.' };
    }
    setResult(outcome);
    // Only clear what was sent: the volunteer may already be typing the next code.
    if (outcome.ok) setValue((current) => (current.trim() === code ? '' : current));
    inputRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = value.trim();
    if (!code || disabled) return;
    pendingRef.current += 1;
    queueRef.current = queueRef.current.then(async () => {
      await run(code);
      pendingRef.current -= 1;
      if (pendingRef.current === 0) onIdleRef.current?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <StaffSearch
        ref={inputRef}
        type="text"
        inputMode="numeric"
        enterKeyHint="send"
        autoComplete="off"
        aria-label="Código de la etiqueta"
        placeholder="Código de la etiqueta y Enter"
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
      />
      {result && (
        <p
          role={result.ok ? 'status' : 'alert'}
          className={result.ok ? 'mt-2 text-body text-want-ink' : 'mt-2 text-body text-danger'}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}

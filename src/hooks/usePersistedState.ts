import { useCallback, useEffect, useRef, useState } from 'react';

export type Codec<T> = { parse: (raw: string) => T; stringify: (v: T) => string };

export const jsonCodec = <T,>(): Codec<T> => ({ parse: JSON.parse, stringify: JSON.stringify });

export const numberSetCodec: Codec<Set<number>> = {
  parse: (raw) => new Set<number>(JSON.parse(raw)),
  stringify: (v) => JSON.stringify([...v]),
};

export const PRINT_FORM_PREFIX = 'printForm:v1:';

export function hasPersisted(...keys: string[]): boolean {
  try {
    return keys.some((k) => window.sessionStorage.getItem(PRINT_FORM_PREFIX + k) !== null);
  } catch {
    return false;
  }
}

/** useState backed by sessionStorage (restored after mount; written only by the setter). */
export function usePersistedState<T>(
  key: string,
  initial: T,
  codec: Codec<T> = jsonCodec<T>(),
): [T, (next: T | ((prev: T) => T)) => void] {
  const storageKey = PRINT_FORM_PREFIX + key;
  const [value, setValue] = useState<T>(initial);
  const ref = useRef<T>(initial);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw === null) return;
      const restored = codec.parse(raw);
      ref.current = restored;
      setValue(restored);
    } catch {
      /* corrupt or unavailable storage: keep the initial value */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(ref.current) : next;
      ref.current = v;
      setValue(v);
      try {
        window.sessionStorage.setItem(storageKey, codec.stringify(v));
      } catch {
        /* storage full or blocked */
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey],
  );

  return [value, set];
}

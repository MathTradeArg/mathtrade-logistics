import { act, renderHook } from '@testing-library/react';
import {
  PRINT_FORM_PREFIX,
  hasPersisted,
  numberSetCodec,
  usePersistedState,
} from '../usePersistedState';

describe('usePersistedState', () => {
  afterEach(() => sessionStorage.clear());

  it('keeps a value after the hook unmounts and mounts again', () => {
    const first = renderHook(() => usePersistedState<string>('senderName', ''));
    act(() => first.result.current[1]('Ana'));
    expect(first.result.current[0]).toBe('Ana');
    first.unmount();

    const second = renderHook(() => usePersistedState<string>('senderName', ''));
    expect(second.result.current[0]).toBe('Ana');
  });

  it('restores a Set with numberSetCodec', () => {
    const first = renderHook(() =>
      usePersistedState<Set<number>>('dests', new Set(), numberSetCodec),
    );
    act(() => first.result.current[1](new Set([3, 7])));
    first.unmount();

    const second = renderHook(() =>
      usePersistedState<Set<number>>('dests', new Set(), numberSetCodec),
    );
    expect(second.result.current[0]).toBeInstanceOf(Set);
    expect([...second.result.current[0]].sort()).toEqual([3, 7]);
  });

  it('falls back to the initial value when stored JSON is corrupt', () => {
    sessionStorage.setItem(`${PRINT_FORM_PREFIX}copies`, '{not json');
    const { result } = renderHook(() => usePersistedState<number>('copies', 1));
    expect(result.current[0]).toBe(1);
  });

  it('passes the current value to a functional setter', () => {
    const { result } = renderHook(() => usePersistedState<number>('copies', 1));
    act(() => {
      result.current[1]((p) => p + 1);
      result.current[1]((p) => p + 1);
    });
    expect(result.current[0]).toBe(3);
    expect(sessionStorage.getItem(`${PRINT_FORM_PREFIX}copies`)).toBe('3');
  });

  it('hasPersisted is false until the setter is called', () => {
    const { result } = renderHook(() => usePersistedState<string>('senderCity', ''));
    expect(hasPersisted('senderCity')).toBe(false);
    act(() => result.current[1](''));
    expect(hasPersisted('senderCity')).toBe(true);
    expect(hasPersisted('other', 'senderCity')).toBe(true);
  });
});

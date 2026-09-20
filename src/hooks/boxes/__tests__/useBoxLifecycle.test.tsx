import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { BoxApiError } from '@/hooks/boxes/boxApi';
import { useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
import { act, renderHook } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

const openBox = {
  id: 10,
  number: null,
  closed_at: null,
  origin: 1,
  destiny: 4,
  origin_name: 'AMBA',
  destination_name: 'Córdoba',
  math_items: [],
};

describe('useBoxLifecycle', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    window.localStorage.setItem('authToken', 'test-token');
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: () => 'key-1' },
    });
  });


  it('opens a box with destination_id and an idempotency key, not a full item list', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(openBox));
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    await act(async () => {
      await result.current.openBox(4);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('logistics/boxes/open/');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({ destination_id: 4 });
    expect(JSON.parse(String(options?.body)).math_items).toBeUndefined();
    expect((options?.headers as Record<string, string>)['Idempotency-Key']).toBe('key-1');
  });

  it('adds an item with trade_id only, without resending the box list', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      ...openBox,
      math_items: [{ id: 77, title: 'Catan', assigned_trade_code: 101 }],
    }));
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    await act(async () => {
      await result.current.addItem(10, 77);
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(String(fetchMock.mock.calls[0][0])).toContain('logistics/boxes/10/items/');
    expect(JSON.parse(String(options?.body))).toEqual({ trade_id: 77 });
    expect(Object.keys(JSON.parse(String(options?.body)))).toEqual(['trade_id']);
  });

  it('ignores a second tap while a request is in flight', async () => {
    fetchMock.mockResponse(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return JSON.stringify(openBox);
    });
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    let first!: Promise<unknown>;
    let second!: unknown;
    await act(async () => {
      first = result.current.openBox(4);
      second = await result.current.openBox(4);
      await first;
    });

    expect(second).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces a 409 without retrying a different payload', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ detail: 'Trade is already in another box.' }), { status: 409 });
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    await act(async () => {
      await expect(result.current.addItem(10, 77)).rejects.toBeInstanceOf(BoxApiError);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ trade_id: 77 });
  });

  it('reopens a box without sending an idempotency key', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      ...openBox,
      number: 16,
      closed_at: null,
    }));
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    await act(async () => {
      await result.current.reopenBox(10);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('logistics/boxes/10/reopen/');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>)['Idempotency-Key']).toBeUndefined();
  });

  it('reuses the same close idempotency key until the request succeeds', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ detail: 'network' }), { status: 500 });
    fetchMock.mockResponseOnce(JSON.stringify({ ...openBox, number: 3, closed_at: '2026-09-19T12:00:00Z' }));
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    await act(async () => {
      await expect(result.current.closeBox(10)).rejects.toBeInstanceOf(BoxApiError);
    });

    await act(async () => {
      await result.current.closeBox(10);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstKey = (fetchMock.mock.calls[0][1]?.headers as Record<string, string>)['Idempotency-Key'];
    const secondKey = (fetchMock.mock.calls[1][1]?.headers as Record<string, string>)['Idempotency-Key'];
    expect(firstKey).toBe('key-1');
    expect(secondKey).toBe('key-1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('logistics/boxes/10/close/');
  });
});

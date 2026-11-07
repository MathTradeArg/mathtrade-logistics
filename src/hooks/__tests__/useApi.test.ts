import { act, renderHook } from '@testing-library/react';
import { useApi } from '../useApi';

const NETWORK_MESSAGE = 'No hay conexión o el servidor tardó demasiado. Probá de nuevo.';

const hangUntilAborted = (_url: string, init?: RequestInit) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError')),
    );
  });

const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => data });

describe('useApi network layer', () => {
  const fetchMock = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    localStorage.setItem('authToken', 'tok');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('a hung POST warns after 15 s with a Spanish message and lets the user retry', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    const { result } = renderHook(() => useApi('x/', { method: 'POST' }));
    await act(async () => {
      result.current.execute({}).catch(() => undefined);
      await jest.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.error).toBe(NETWORK_MESSAGE);
    expect(result.current.isLoading).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset().mockResolvedValue(ok({ a: 1 }));
    await act(async () => {
      await expect(result.current.execute({})).resolves.toEqual({ a: 1 });
    });
    expect(result.current.error).toBeNull();
  });

  it('a hung GET warns once its automatic retries also time out', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    const { result } = renderHook(() => useApi('x/'));
    let caught: unknown;
    await act(async () => {
      result.current.execute().catch((e) => {
        caught = e;
      });
      // 3 attempts x 15 s + 500 ms + 1000 ms between them
      await jest.advanceTimersByTimeAsync(46_500);
    });
    expect(result.current.error).toBe(NETWORK_MESSAGE);
    expect((caught as { status?: number }).status).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('a GET is retried automatically after a network error', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok({ a: 1 }));
    const { result } = renderHook(() => useApi('x/'));
    let outcome: unknown;
    await act(async () => {
      const p = result.current.execute().then(
        (value) => ({ value }),
        (reason) => ({ reason }),
      );
      await jest.advanceTimersByTimeAsync(5_000);
      outcome = await p;
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(outcome).toEqual({ value: { a: 1 } });
  });

  it('a GET is retried automatically after a 503 from the gateway', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable', json: async () => ({}) })
      .mockResolvedValueOnce(ok({ a: 1 }));
    const { result } = renderHook(() => useApi('x/'));
    await act(async () => {
      const p = result.current.execute().catch(() => undefined);
      await jest.advanceTimersByTimeAsync(5_000);
      await p;
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ a: 1 });
  });

  it('a POST is never retried automatically after a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useApi('x/', { method: 'POST' }));
    await act(async () => {
      const p = result.current.execute({}).catch(() => undefined);
      await jest.advanceTimersByTimeAsync(5_000);
      await p;
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a PATCH is never retried automatically after a 503', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable', json: async () => ({}) });
    const { result } = renderHook(() => useApi('x/', { method: 'PATCH' }));
    await act(async () => {
      const p = result.current.execute({}).catch(() => undefined);
      await jest.advanceTimersByTimeAsync(5_000);
      await p;
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a network failure shows the Spanish connection message, not the browser text', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useApi('x/', { method: 'POST' }));
    await act(async () => {
      await result.current.execute({}).catch(() => undefined);
    });
    expect(result.current.error).toBe(NETWORK_MESSAGE);
  });

  it('the backend detail is shown over the generic message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad',
      json: async () => ({ message: 'generic', detail: 'specific' }),
    });
    const { result } = renderHook(() => useApi('x/'));
    await act(async () => {
      await result.current.execute().catch(() => undefined);
    });
    expect(result.current.error).toBe('specific');
  });

  it('a non-JSON error body falls back to a Spanish message with the status', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    const { result } = renderHook(() => useApi('x/'));
    let caught: unknown;
    await act(async () => {
      await result.current.execute().catch((e) => {
        caught = e;
      });
    });
    expect(result.current.error).toBe('El servidor respondió con un error (500).');
    expect((caught as { status?: number }).status).toBe(500);
  });
});

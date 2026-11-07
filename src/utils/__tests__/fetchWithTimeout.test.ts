import {
  apiErrorMessage,
  fetchWithTimeout,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
} from '../fetchWithTimeout';

const hangUntilAborted = (_url: unknown, init?: RequestInit) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError')),
    );
  });

const response = (status: number) => ({ ok: status < 400, status, json: async () => ({}) });

describe('fetchWithTimeout', () => {
  const fetchMock = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('a hung connection is aborted after timeoutMs and reported as a Spanish network error', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    let caught: unknown;
    const done = fetchWithTimeout('x/', {}, { timeoutMs: 1000 }).catch((e) => {
      caught = e;
    });
    await jest.advanceTimersByTimeAsync(999);
    expect(caught).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    await done;
    expect(caught).toBeInstanceOf(NetworkError);
    expect((caught as NetworkError).message).toBe(NETWORK_ERROR_MESSAGE);
    expect((caught as NetworkError).status).toBe(0);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('defaults to a 15 s timeout', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    let caught: unknown;
    const done = fetchWithTimeout('x/').catch((e) => {
      caught = e;
    });
    await jest.advanceTimersByTimeAsync(14_999);
    expect(caught).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    await done;
    expect(caught).toBeInstanceOf(NetworkError);
  });

  it('with retries: 0 a network failure is never retried', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchWithTimeout('x/', { method: 'POST' })).rejects.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a network failure up to `retries` times', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(response(200));
    const p = fetchWithTimeout('x/', {}, { retries: 2 });
    await jest.advanceTimersByTimeAsync(5_000);
    await expect(p).resolves.toMatchObject({ status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([502, 503, 504])('retries a %i gateway error when retries > 0', async (status) => {
    fetchMock.mockResolvedValueOnce(response(status)).mockResolvedValueOnce(response(200));
    const p = fetchWithTimeout('x/', {}, { retries: 2 });
    await jest.advanceTimersByTimeAsync(5_000);
    await expect(p).resolves.toMatchObject({ status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns the last gateway error response once retries run out', async () => {
    fetchMock.mockResolvedValue(response(503));
    const p = fetchWithTimeout('x/', {}, { retries: 2 });
    await jest.advanceTimersByTimeAsync(5_000);
    await expect(p).resolves.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([400, 404, 500])('does not retry a %i response', async (status) => {
    fetchMock.mockResolvedValue(response(status));
    const p = fetchWithTimeout('x/', {}, { retries: 2 });
    await jest.advanceTimersByTimeAsync(5_000);
    await expect(p).resolves.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns the Response untouched and forwards the request init', async () => {
    const res = response(201);
    fetchMock.mockResolvedValue(res);
    await expect(
      fetchWithTimeout('x/', { method: 'PATCH', headers: { A: 'b' }, body: '{}' }),
    ).resolves.toBe(res);
    expect(fetchMock).toHaveBeenCalledWith(
      'x/',
      expect.objectContaining({ method: 'PATCH', headers: { A: 'b' }, body: '{}' }),
    );
  });
});

describe('apiErrorMessage', () => {
  it('prefers detail over message', () => {
    expect(apiErrorMessage({ message: 'generic', detail: 'specific' }, 'fb')).toBe('specific');
  });

  it('falls back to message, then to the fallback', () => {
    expect(apiErrorMessage({ message: 'generic' }, 'fb')).toBe('generic');
    expect(apiErrorMessage({ detail: '' }, 'fb')).toBe('fb');
    expect(apiErrorMessage(null, 'fb')).toBe('fb');
    expect(apiErrorMessage({ detail: ['x'] }, 'fb')).toBe('fb');
  });
});

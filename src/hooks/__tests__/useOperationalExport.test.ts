import { act, renderHook } from '@testing-library/react';
import { downloadBlob } from '@/utils/file';
import { NETWORK_ERROR_MESSAGE } from '@/utils/fetchWithTimeout';
import { useOperationalExport } from '../useOperationalExport';

jest.mock('@/utils/file', () => ({ downloadBlob: jest.fn() }));

const mockDownloadBlob = downloadBlob as jest.Mock;
const API = 'http://api.test/';
const URL_EXPORT = `${API}logistics/export/operational/`;

const hangUntilAborted = (_url: string, init?: RequestInit) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError')),
    );
  });

const xlsx = (bytes = 'PK-fake-xlsx') => ({
  ok: true,
  status: 200,
  blob: async () => new Blob([bytes]),
  json: async () => { throw new Error('not json'); },
});

const failure = (status: number, body: unknown = null) => ({
  ok: false,
  status,
  blob: async () => new Blob([]),
  json: async () => body,
});

describe('useOperationalExport: an admin downloads the event sheet on demand', () => {
  const fetchMock = global.fetch as jest.Mock;
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeEach(() => {
    jest.useFakeTimers();
    // Local time: the file name uses the browser's clock.
    jest.setSystemTime(new Date(2026, 10, 8, 9, 5, 30));
    fetchMock.mockReset();
    mockDownloadBlob.mockReset();
    process.env.NEXT_PUBLIC_MT_API_HOST = API;
    localStorage.setItem('authToken', 'tok');
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.NEXT_PUBLIC_MT_API_HOST = originalHost;
    localStorage.clear();
  });

  it('downloads the file with the auth token as planilla_evento_AAAA-MM-DD_HHMM.xlsx', async () => {
    fetchMock.mockResolvedValue(xlsx());
    const { result } = renderHook(() => useOperationalExport());

    await act(async () => {
      await result.current.download();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL_EXPORT);
    expect((init as RequestInit).headers).toEqual({ Authorization: 'token tok' });
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
    expect(mockDownloadBlob.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(mockDownloadBlob.mock.calls[0][1]).toBe('planilla_evento_2026-11-08_0905.xlsx');
    expect(result.current.error).toBeNull();
    expect(result.current.lastDownloadedAt).toEqual(new Date(2026, 10, 8, 9, 5, 30));
  });

  it('never retries automatically: a 503 is one request and an error the admin sees', async () => {
    fetchMock.mockResolvedValue(failure(503));
    const { result } = renderHook(() => useOperationalExport());

    await act(async () => {
      await result.current.download();
      await jest.advanceTimersByTimeAsync(5_000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockDownloadBlob).not.toHaveBeenCalled();
    expect(result.current.error).toBe('El servidor no pudo armar la planilla. Probá de nuevo en un minuto.');
  });

  it('is loading during the request and a second click while loading starts no second download', async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    fetchMock.mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));
    const { result } = renderHook(() => useOperationalExport());

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.download();
    });
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      await result.current.download();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(xlsx());
      await first;
    });
    expect(result.current.isLoading).toBe(false);
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
  });

  it('gives up after 45 s without a response (one attempt) with the network message', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    const { result } = renderHook(() => useOperationalExport());

    await act(async () => {
      result.current.download();
      await jest.advanceTimersByTimeAsync(44_999);
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(NETWORK_ERROR_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['403 (not an admin)', () => failure(403, { detail: 'You do not have permission to perform this action.' }),
      'Solo un administrador puede descargar la planilla.'],
    ['500', () => failure(500), 'El servidor no pudo armar la planilla. Probá de nuevo en un minuto.'],
    ['504', () => failure(504), 'El servidor no pudo armar la planilla. Probá de nuevo en un minuto.'],
    ['an empty file', () => xlsx(''), 'La planilla vino vacía. Probá de nuevo.'],
  ])('tells the admin in Spanish what went wrong: %s', async (_case, response, message) => {
    fetchMock.mockResolvedValue(response());
    const { result } = renderHook(() => useOperationalExport());
    await act(async () => {
      await result.current.download();
    });
    expect(result.current.error).toBe(message);
    expect(result.current.isLoading).toBe(false);
    expect(mockDownloadBlob).not.toHaveBeenCalled();
    expect(result.current.lastDownloadedAt).toBeNull();
  });

  it('tells the admin when there is no connection', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useOperationalExport());
    await act(async () => {
      await result.current.download();
    });
    expect(result.current.error).toBe(NETWORK_ERROR_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not call the API without a session token', async () => {
    localStorage.removeItem('authToken');
    const { result } = renderHook(() => useOperationalExport());
    await act(async () => {
      await result.current.download();
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe('No se encontró el token de autenticación.');
  });

  it('the admin can retry after an error, and a successful retry clears it', async () => {
    fetchMock.mockResolvedValueOnce(failure(503)).mockResolvedValueOnce(xlsx());
    const { result } = renderHook(() => useOperationalExport());
    await act(async () => {
      await result.current.download();
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.download();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
  });
});

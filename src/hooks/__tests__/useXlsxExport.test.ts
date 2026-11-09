import { act, renderHook } from '@testing-library/react';
import { downloadBlob } from '@/utils/file';
import { useOperationalExport } from '../useOperationalExport';
import { EVENT_SHEETS, useXlsxExport, xlsxFileName } from '../useXlsxExport';

jest.mock('@/utils/file', () => ({ downloadBlob: jest.fn() }));

const mockDownloadBlob = downloadBlob as jest.Mock;
const API = 'http://api.test/';

const xlsx = () => ({ ok: true, status: 200, blob: async () => new Blob(['PK']), json: async () => null });
const failure = (status: number, body: unknown = null) => ({
  ok: false, status, blob: async () => new Blob([]), json: async () => body,
});

describe('useXlsxExport: each event sheet has its own endpoint and file name prefix', () => {
  const fetchMock = global.fetch as jest.Mock;
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeEach(() => {
    jest.useFakeTimers();
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

  it('builds the file name with the given prefix', () => {
    expect(xlsxFileName('juegos_que_salen', new Date(2026, 10, 8, 9, 5))).toBe('juegos_que_salen_2026-11-08_0905.xlsx');
  });

  it.each([
    ['incomingBoxes', 'incoming-boxes', 'cajas_entrantes'],
    ['outgoingGames', 'outgoing-games', 'juegos_que_salen'],
    ['toReceive', 'to-receive', 'juegos_a_recibir'],
    ['toDeliver', 'to-deliver', 'juegos_a_entregar'],
  ] as const)('%s downloads logistics/export/%s/ as %s_<date>.xlsx', async (key, path, prefix) => {
    fetchMock.mockResolvedValue(xlsx());
    const sheet = EVENT_SHEETS[key];
    const { result } = renderHook(() => useXlsxExport(sheet.endpoint, sheet.filePrefix));
    await act(async () => {
      await result.current.download();
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}logistics/export/${path}/`);
    expect((init as RequestInit).headers).toEqual({ Authorization: 'token tok' });
    expect(mockDownloadBlob.mock.calls[0][1]).toBe(`${prefix}_2026-11-08_0905.xlsx`);
    expect(result.current.error).toBeNull();
    expect(result.current.lastDownloadedAt).toEqual(new Date(2026, 10, 8, 9, 5, 30));
  });

  it.each([
    ['403', () => failure(403), 'Solo un organizador puede descargar la planilla.'],
    ['404', () => failure(404, { detail: 'No active edition.' }), 'No hay una edición activa.'],
    ['500', () => failure(500), 'El servidor no pudo armar la planilla. Probá de nuevo en un minuto.'],
  ])('shows a clear message for %s', async (_c, response, message) => {
    fetchMock.mockResolvedValue(response());
    const { result } = renderHook(() => useXlsxExport('to-receive', 'juegos_a_recibir'));
    await act(async () => {
      await result.current.download();
    });
    expect(result.current.error).toBe(message);
    expect(mockDownloadBlob).not.toHaveBeenCalled();
  });

  it('two buttons keep independent loading, error and last download state', async () => {
    let resolveFirst: (v: unknown) => void = () => undefined;
    fetchMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(failure(403));
    const a = renderHook(() => useXlsxExport('incoming-boxes', 'cajas_entrantes'));
    const b = renderHook(() => useXlsxExport('to-deliver', 'juegos_a_entregar'));

    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = a.result.current.download(); });
    await act(async () => { await b.result.current.download(); });

    expect(a.result.current.isLoading).toBe(true);
    expect(a.result.current.error).toBeNull();
    expect(b.result.current.isLoading).toBe(false);
    expect(b.result.current.error).toBe('Solo un organizador puede descargar la planilla.');

    await act(async () => { resolveFirst(xlsx()); await pending; });
    expect(a.result.current.error).toBeNull();
    expect(a.result.current.lastDownloadedAt).not.toBeNull();
    expect(b.result.current.lastDownloadedAt).toBeNull();
  });

  it('the three-sheet export keeps its endpoint and file name', async () => {
    fetchMock.mockResolvedValue(xlsx());
    const { result } = renderHook(() => useOperationalExport());
    await act(async () => {
      await result.current.download();
    });
    expect(fetchMock.mock.calls[0][0]).toBe(`${API}logistics/export/operational/`);
    expect(mockDownloadBlob.mock.calls[0][1]).toBe('planilla_evento_2026-11-08_0905.xlsx');
  });
});

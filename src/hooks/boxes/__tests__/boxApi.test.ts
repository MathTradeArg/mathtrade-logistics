import { BoxApiError, boxFetch, listItems, listSeparateFromHub } from '../boxApi';

const NETWORK_MESSAGE = 'No hay conexión o el servidor tardó demasiado. Probá de nuevo.';
const WRITE_MESSAGE = 'No sabemos si se guardó. Consultá el estado antes de repetir.';

describe('listItems', () => {
  const fetchMock = global.fetch as jest.Mock;
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
  });
  const urlOf = () => fetchMock.mock.calls[0][0] as string;

  it('sends include_send_as=1 only when asked', async () => {
    await listItems({ origin: 7, includeSendAs: true });
    expect(urlOf()).toContain('logistics/items/?origin=7&include_send_as=1');
  });

  it('leaves the query unchanged without the option', async () => {
    await listItems({ origin: 7 });
    expect(urlOf()).toMatch(/logistics\/items\/\?origin=7$/);
    fetchMock.mockClear();
    await listItems({ origin: 7, includeSendAs: false });
    expect(urlOf()).not.toContain('include_send_as');
  });
});

describe('listSeparateFromHub', () => {
  const fetchMock = global.fetch as jest.Mock;
  beforeEach(() => {
    fetchMock.mockReset();
  });
  const reply = (rows: unknown) =>
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => rows });

  it('reads the ids flagged separate_from_hub from the directory', async () => {
    reply([
      { location_id: 33, separate_from_hub: true },
      { location_id: 17, separate_from_hub: true },
      { location_id: 21, separate_from_hub: false },
    ]);
    const ids = await listSeparateFromHub({ fresh: true });
    expect(fetchMock.mock.calls[0][0]).toContain('logistics/directory/');
    expect(Array.from(ids).sort()).toEqual([17, 33]);
  });

  it('is empty with an older backend (no field) or when the directory fails', async () => {
    reply([{ location_id: 33 }, { location_id: 17 }]);
    expect((await listSeparateFromHub({ fresh: true })).size).toBe(0);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden', json: async () => ({}) });
    expect((await listSeparateFromHub({ fresh: true })).size).toBe(0);
  });

  it('asks the directory once and reuses the answer', async () => {
    reply([{ location_id: 33, separate_from_hub: true }]);
    await listSeparateFromHub({ fresh: true });
    const again = await listSeparateFromHub();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(again.has(33)).toBe(true);
  });
});

describe('boxFetch', () => {
  const fetchMock = global.fetch as jest.Mock;
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const settle = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);

  it('boxFetch reads detail for error message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad',
      json: async () => ({ message: 'generic', detail: 'specific' }),
    });
    const err = await settle(boxFetch('logistics/boxes/1/close/', { method: 'POST' }));
    expect(err).toBeInstanceOf(BoxApiError);
    expect((err as BoxApiError).message).toBe('specific');
    expect((err as BoxApiError).status).toBe(400);
  });

  it('boxFetch turns a network failure into the Spanish message with status 0 and never retries a POST', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await settle(boxFetch('logistics/boxes/1/close/', { method: 'POST', body: {} }));
    expect(err).toBeInstanceOf(BoxApiError);
    expect((err as BoxApiError).message).toBe(WRITE_MESSAGE);
    expect((err as BoxApiError).status).toBe(0);
    expect((err as BoxApiError).body).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('boxFetch retries a GET twice on a network failure before giving up', async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const p = settle(boxFetch('logistics/boxes/'));
    await jest.advanceTimersByTimeAsync(5_000);
    const err = await p;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((err as BoxApiError).status).toBe(0);
    expect((err as BoxApiError).message).toBe(NETWORK_MESSAGE);
  });
});

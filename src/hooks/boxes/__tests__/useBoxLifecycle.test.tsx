import { ActionStatusProvider, useActionStatus } from '@/contexts/ActionStatusContext';
import { BoxApiError } from '@/hooks/boxes/boxApi';
import { boxErrorMessage, useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
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


  it('opens a box with destination_id, origin_id and an idempotency key, not a full item list', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(openBox));
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    await act(async () => {
      await result.current.openBox(4, 1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('logistics/boxes/open/');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({ destination_id: 4, origin_id: 1 });
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
      first = result.current.openBox(4, 1);
      second = await result.current.openBox(4, 1);
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

  it('reopen 409 shows the Spanish message', async () => {
    // Rule: a closed box can be reopened only while it is not in a shipment;
    // the backend's 409 reaches the volunteer in Spanish.
    const detail = 'Cannot reopen a box that is already in a shipment.';
    fetchMock.mockResponseOnce(JSON.stringify({ detail }), { status: 409 });
    const { result } = renderHook(
      () => ({ lifecycle: useBoxLifecycle(), status: useActionStatus() }),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.lifecycle.reopenBox(10)).rejects.toBeInstanceOf(BoxApiError);
    });

    expect(result.current.status.actionError).toBe('Esa caja ya está en un envío y no se puede reabrir.');
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

  it('returns added game titles instead of deleting when the box is no longer empty', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      ...openBox,
      math_items: [
        { id: 1, title: 'Catan', assigned_trade_code: 101 },
        { id: 2, title: 'Azul', assigned_trade_code: 202 },
      ],
    }));
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    let outcome: Awaited<ReturnType<typeof result.current.deleteBox>> | undefined;
    await act(async () => {
      outcome = await result.current.deleteBox(10);
    });

    expect(outcome).toEqual({ status: 'has_items', titles: ['Catan', 'Azul'] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('logistics/boxes/10/');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });

  it('keeps the box if a concurrent add wins the delete race', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(openBox));
    fetchMock.mockResponseOnce(
      JSON.stringify({
        detail: 'Cannot delete a box that has items.',
        titles: ['Root'],
      }),
      { status: 409 },
    );
    const { result } = renderHook(() => useBoxLifecycle(), { wrapper });

    let outcome: Awaited<ReturnType<typeof result.current.deleteBox>> | undefined;
    await act(async () => {
      outcome = await result.current.deleteBox(10);
    });

    expect(outcome).toEqual({ status: 'has_items', titles: ['Root'] });
    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
  });
});

// Rule: in a batch the games that can go in are added; at the end the screen
// knows how many went in and which did not, with the reason in Spanish.
describe('useBoxLifecycle.addItems: a batch adds what it can and reports each game that failed', () => {
  const boxWith = (ids: number[]) => ({
    ...openBox,
    math_items: ids.map((id) => ({ id, title: `Game ${id}`, assigned_trade_code: 100 + id })),
  });
  const postCount = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').length;
  const render = () => renderHook(
    () => ({ lifecycle: useBoxLifecycle(), status: useActionStatus() }),
    { wrapper },
  );

  beforeEach(() => {
    fetchMock.resetMocks();
    window.localStorage.setItem('authToken', 'test-token');
  });

  it('a game already in another box does not stop the rest of the batch', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([1])));
    fetchMock.mockResponseOnce(JSON.stringify({ detail: 'Trade is already in another box.' }), { status: 409 });
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([1, 3])));
    const { result } = render();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.lifecycle.addItems(10, [1, 2, 3]);
    });

    expect(postCount()).toBe(3);
    expect(outcome).toEqual({
      box: boxWith([1, 3]),
      added: [1, 3],
      failed: [{ tradeId: 2, reason: 'Ese juego ya está en otra caja.' }],
    });
    expect(result.current.status.actionError).toBe('Se agregaron 2 de 3 juegos.');
  });

  it('a network failure stops the batch and marks the rest as not tried', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([1])));
    fetchMock.mockRejectOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([1, 3])));
    const { result } = render();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.lifecycle.addItems(10, [1, 2, 3]);
    });

    expect(postCount()).toBe(2);
    expect(outcome).toEqual({
      box: boxWith([1]),
      added: [1],
      failed: [
        { tradeId: 2, reason: 'No hay conexión o el servidor tardó demasiado. Probá de nuevo.' },
        { tradeId: 3, reason: 'No se intentó: sin conexión.' },
      ],
    });
    expect(result.current.status.actionError).toBe('Se agregaron 1 de 3 juegos.');
  });

  it.each([401, 403])('a %p (session or permission) stops the batch too', async (status) => {
    fetchMock.mockResponseOnce(JSON.stringify({ detail: 'You do not have permission to perform this action.' }), { status });
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([2])));
    const { result } = render();

    let outcome: { failed: { tradeId: number; reason: string }[] } | null = null;
    await act(async () => {
      outcome = await result.current.lifecycle.addItems(10, [1, 2]);
    });

    expect(postCount()).toBe(1);
    expect(outcome!.failed).toEqual([
      { tradeId: 1, reason: 'No tenés permiso para hacer esto.' },
      { tradeId: 2, reason: 'No se intentó: sin permiso.' },
    ]);
    expect(result.current.status.actionError).toBe('No se pudo agregar ningún juego.');
  });

  it('a whole batch that goes in says how many were added', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([1])));
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([1, 2])));
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([1, 2, 3])));
    const { result } = render();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.lifecycle.addItems(10, [1, 2, 3]);
    });

    expect(outcome).toEqual({ box: boxWith([1, 2, 3]), added: [1, 2, 3], failed: [] });
    expect(result.current.status.actionSuccess).toBe('3 juegos agregados a la caja.');
    expect(result.current.status.actionError).toBeNull();
  });

  it('a single game says it in singular', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(boxWith([1])));
    const { result } = render();

    await act(async () => {
      await result.current.lifecycle.addItems(10, [1]);
    });

    expect(result.current.status.actionSuccess).toBe('1 juego agregado a la caja.');
  });
});

// Rule: every reason the server gives for refusing a box change reaches the
// volunteer in Spanish.
describe('boxErrorMessage: server box errors in Spanish', () => {
  it.each([
    ['Trade not found.', 'Ese juego no existe.'],
    ['Trade is not in this box.', 'Ese juego ya no está en esta caja.'],
    ['Cannot remove items from a closed box.', 'La caja está cerrada: reabrila para sacar juegos.'],
    ['Cannot move items unless both boxes are open.', 'Las dos cajas tienen que estar abiertas.'],
    ['Boxes have different destinations.', 'Las cajas tienen distinto destino.'],
    ['Cannot close an empty box.', 'No se puede cerrar una caja vacía.'],
    ['Destination box not found.', 'No se encontró la caja de destino.'],
    ['Only event staff can reopen a box that is already in a shipment.', 'Solo el staff del evento puede reabrir una caja que ya está en un envío.'],
    ['Cannot delete a closed box.', 'No se puede borrar una caja cerrada.'],
    ['Not found.', 'No se encontró la caja.'],
    ['You do not have permission to perform this action.', 'No tenés permiso para hacer esto.'],
    ['Invalid token.', 'Tu sesión expiró. Volvé a iniciar sesión.'],
    ['Authentication credentials were not provided.', 'Tu sesión expiró. Volvé a iniciar sesión.'],
  ])('%p -> %p', (detail, spanish) => {
    expect(boxErrorMessage(new BoxApiError(detail, 409, { detail }))).toBe(spanish);
  });
});

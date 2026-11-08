import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { Trade, User } from '@/types';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { usePathname, useSearchParams } from 'next/navigation';
import DeliverPage from '../page';

// Uses the real useApi (no jest.mock('@/hooks/useApi')) so the whole path
// page -> useApi -> fetchWithTimeout -> fetch is exercised.
fetchMock.enableMocks();
jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));
jest.mock('@/components/qr/QrScanner', () => {
  return jest.fn(({ onScan, disabled, disabledMessage }) => (
    <div data-testid="qr-scanner">
      {disabled && <p>{disabledMessage}</p>}
      <button disabled={disabled} onClick={() => onScan('user-qr-code')}>
        Simulate Scan
      </button>
    </div>
  ));
});
jest.mock('@/components/trades/GameList', () => {
  return jest.fn(({ trades, onUpdateItems, onFinish, deliveredByUserId }) => (
    <div data-testid="game-list">
      <p>Trades: {trades.length}</p>
      <button onClick={() => onUpdateItems(trades.map((t: { result: { assigned_trade_code: number } }) => t.result.assigned_trade_code), deliveredByUserId)}>
        Update All Items
      </button>
      <button onClick={onFinish}>Finish</button>
    </div>
  ));
});
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message || 'Loading...'}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

const mockUser: User = { id: 123, first_name: 'Test', last_name: 'User' };
const mockTrades: Trade[] = [
  {
    result: { assigned_trade_code: 101, status_display: 'Pending' },
    math_item_exchanged: { title: 'Juego A' },
    member_to: { id: 123, username: 'testuser' },
  } as unknown as Trade,
];
const mockTradesResponse = { games: mockTrades, user: mockUser };

type Reply = { status: number; body: unknown };
const json = ({ status, body }: Reply) => ({ status, body: JSON.stringify(body) });

/** Routes fetchMock by endpoint; `patchReplies` are consumed in order. */
function routeApi({ scan, patchReplies }: { scan: Reply; patchReplies?: Reply[] }) {
  const patches = [...(patchReplies ?? [])];
  fetchMock.mockResponse(async (req) => {
    if (req.url.includes('/games/deliver/')) return json(scan);
    if (req.url.includes('games/bulk-update-status/')) return json(patches.shift() ?? { status: 200, body: {} });
    if (req.url.includes('users/update-status/')) return json({ status: 200, body: {} });
    return json({ status: 404, body: { detail: 'unexpected url' } });
  });
}

const bulkCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('games/bulk-update-status/'));

describe('DeliverPage: a network or server error must not lock the screen', () => {
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = 'http://api.test/'; });
  afterAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = originalHost; });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/deliver');
  });

  afterEach(() => { jest.useRealTimers(); });

  it('deliver keeps list after PATCH failure and allows retry', async () => {
    routeApi({
      scan: { status: 200, body: mockTradesResponse },
      patchReplies: [
        { status: 500, body: { detail: 'Falló el servidor' } },
        { status: 200, body: { success: true } },
      ],
    });
    render(<DeliverPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByTestId('game-list')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Update All Items' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Falló el servidor');
    expect(screen.getByTestId('game-list')).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(bulkCalls()).toHaveLength(2);
    expect(JSON.parse(String(bulkCalls()[1][1]?.body))).toEqual({
      status: 6, assigned_trade_codes: [101], user_uuid: 'user-qr-code',
    });
    expect(screen.getByTestId('game-list')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(screen.getByTestId('qr-scanner')).toBeInTheDocument());
  });

  it('deliver shows backend detail message', async () => {
    jest.useFakeTimers();
    routeApi({ scan: { status: 404, body: { detail: 'Usuario no encontrado' } } });
    render(<DeliverPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByText('Usuario no encontrado')).toBeInTheDocument());

    act(() => { jest.advanceTimersByTime(3000); });
    await waitFor(() => expect(screen.getByTestId('qr-scanner')).toBeInTheDocument());
    expect(screen.queryByText('Usuario no encontrado')).not.toBeInTheDocument();
  });
});

describe('DeliverPage: backend rejections (409 / 400) show their message and keep the screen usable', () => {
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = 'http://api.test/'; });
  afterAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = originalHost; });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/deliver');
  });

  // the scan itself PATCHes users/update-status/ with 'receiving'; only 'completed' means delivered
  const markedCompleted = () => fetchMock.mock.calls.some(
    ([url, init]) => String(url).includes('users/update-status/') && String(init?.body).includes('completed'),
  );

  const deliverAll = async () => {
    render(<DeliverPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByTestId('game-list')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Update All Items' }));
    return screen.findByRole('alert');
  };

  it('does not send change_by_id and sends the scanned user_uuid', async () => {
    routeApi({ scan: { status: 200, body: mockTradesResponse } });
    render(<DeliverPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByTestId('game-list')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Update All Items' }));
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    const body = JSON.parse(String(bulkCalls()[0][1]?.body));
    expect(body).toEqual({ status: 6, assigned_trade_codes: [101], user_uuid: 'user-qr-code' });
    expect(body).not.toHaveProperty('change_by_id');
  });

  it('wrong_receiver 409 shows the detail and how many games are not the user\'s, without marking delivered', async () => {
    routeApi({
      scan: { status: 200, body: mockTradesResponse },
      patchReplies: [{
        status: 409,
        body: { detail: 'Algunos juegos no son de este usuario. No se actualizó ninguno.', code: 'wrong_receiver', assigned_trade_codes: [101] },
      }],
    });
    const alert = await deliverAll();
    expect(alert).toHaveTextContent('Algunos juegos no son de este usuario. No se actualizó ninguno.');
    expect(alert).toHaveTextContent('1 juego no es de este usuario');
    expect(markedCompleted()).toBe(false);
    expect(screen.getByTestId('game-list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update All Items' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled();
  });

  it('not_arrived 409 shows the detail, does not mark completed and allows retry', async () => {
    routeApi({
      scan: { status: 200, body: mockTradesResponse },
      patchReplies: [
        { status: 409, body: { detail: 'Algunos juegos todavía no llegaron al evento. No se actualizó ninguno.', code: 'not_arrived', assigned_trade_codes: [101] } },
        { status: 200, body: {} },
      ],
    });
    const alert = await deliverAll();
    expect(alert).toHaveTextContent('Algunos juegos todavía no llegaron al evento. No se actualizó ninguno.');
    expect(alert).not.toHaveTextContent('no es de este usuario');
    expect(markedCompleted()).toBe(false);
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(bulkCalls()).toHaveLength(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('400 shows a generic clear message', async () => {
    routeApi({
      scan: { status: 200, body: mockTradesResponse },
      patchReplies: [{ status: 400, body: { user_uuid: ['Must be a valid UUID.'] } }],
    });
    const alert = await deliverAll();
    expect(alert).toHaveTextContent('No se pudo validar la entrega');
    expect(screen.getByTestId('game-list')).toBeInTheDocument();
  });
});

describe('DeliverPage: a participant with nothing to pick up sees a message, not a blank screen', () => {
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = 'http://api.test/'; });
  afterAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = originalHost; });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/deliver');
  });

  afterEach(() => { jest.useRealTimers(); });

  it('deliver shows "No hay juegos para retirar" when games is empty', async () => {
    routeApi({ scan: { status: 200, body: { games: [], user: mockUser } } });
    render(<DeliverPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));

    expect(await screen.findByText('No hay juegos para retirar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escanear otro' }));
    await waitFor(() => expect(screen.getByTestId('qr-scanner')).toBeInTheDocument());
  });
});

describe('DeliverPage: "Reintentar" sends bulk-update-status exactly once more', () => {
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = 'http://api.test/'; });
  afterAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = originalHost; });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/deliver');
  });

  async function failFirstPatch() {
    render(<DeliverPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByTestId('game-list')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Update All Items' }));
    return screen.findByRole('alert');
  }

  it('a 503 and one click on "Reintentar" make 2 PATCH in total (no automatic resend)', async () => {
    routeApi({
      scan: { status: 200, body: mockTradesResponse },
      patchReplies: [
        { status: 503, body: { detail: 'Servicio no disponible' } },
        { status: 200, body: { success: true } },
      ],
    });
    const alert = await failFirstPatch();
    expect(alert).toHaveTextContent('Servicio no disponible');
    expect(bulkCalls()).toHaveLength(1);

    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('users/update-status/'))).toBe(true));
    expect(bulkCalls()).toHaveLength(2);
  });

  it('a double click on "Reintentar" while the PATCH hangs still makes 2 PATCH in total', async () => {
    let release: (reply: { status: number; body: string }) => void = () => undefined;
    let patchCount = 0;
    fetchMock.mockResponse(async (req) => {
      if (req.url.includes('/games/deliver/')) return json({ status: 200, body: mockTradesResponse });
      if (req.url.includes('games/bulk-update-status/')) {
        patchCount += 1;
        if (patchCount === 1) return json({ status: 503, body: { detail: 'Servicio no disponible' } });
        return new Promise((resolve) => { release = resolve; });
      }
      if (req.url.includes('users/update-status/')) return json({ status: 200, body: {} });
      return json({ status: 404, body: { detail: 'unexpected url' } });
    });
    const alert = await failFirstPatch();
    const retry = within(alert).getByRole('button', { name: 'Reintentar' });

    fireEvent.click(retry);
    fireEvent.click(retry);
    await waitFor(() => expect(bulkCalls()).toHaveLength(2));

    await act(async () => { release(json({ status: 200, body: { success: true } })); });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('users/update-status/'))).toBe(true));
    expect(bulkCalls()).toHaveLength(2);
  });
});

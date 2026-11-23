import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { Trade, User } from '@/types';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { usePathname, useSearchParams } from 'next/navigation';
import ReceivePage from '../page';

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
  return jest.fn(({ trades, onUpdateItems, onFinish, deliveredByUserId, isUpdating }) => (
    <div data-testid="game-list">
      <p>Trades: {trades.length}</p>
      <button onClick={() => onUpdateItems(trades.map((t: { result: { assigned_trade_code: number } }) => t.result.assigned_trade_code), deliveredByUserId)}>
        Update All Items
      </button>
      {/* GameList disables "Escanear otro QR" with isUpdating; the mock mirrors it. */}
      <button onClick={onFinish} disabled={!!isUpdating}>Finish</button>
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
    if (req.url.includes('/games/receive/')) return json(scan);
    if (req.url.includes('games/bulk-update-status/')) return json(patches.shift() ?? { status: 200, body: {} });
    if (req.url.includes('users/update-status/')) return json({ status: 200, body: {} });
    return json({ status: 404, body: { detail: 'unexpected url' } });
  });
}

// jsdom has no scrollIntoView; the page scrolls the error banner into view.
// A plain function records `this` in mock.instances (the scrolled element).
const scrollSpy = jest.fn(function (this: Element) { return undefined; });
Element.prototype.scrollIntoView = scrollSpy;

const bulkCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('games/bulk-update-status/'));

const renderPage = () => render(<ActionStatusProvider><ReceivePage /></ActionStatusProvider>);

describe('ReceivePage: a failed PATCH stays in view and actions are blocked while saving', () => {
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = 'http://api.test/'; });
  afterAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = originalHost; });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/receive');
  });

  it('un PATCH que falla lleva el error a la vista', async () => {
    routeApi({
      scan: { status: 200, body: mockTradesResponse },
      patchReplies: [{ status: 500, body: { detail: 'Falló el servidor' } }],
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByTestId('game-list')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Update All Items' }));
    const alert = await screen.findByRole('alert');

    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    const scrolled = scrollSpy.mock.instances as unknown as Element[];
    expect(scrolled.some((el) => el.contains(alert))).toBe(true);
  });

  it('mientras el PATCH está colgado, "Escanear otro" está deshabilitado', async () => {
    let release: (reply: { status: number; body: string }) => void = () => undefined;
    fetchMock.mockResponse(async (req) => {
      if (req.url.includes('/games/receive/')) return json({ status: 200, body: mockTradesResponse });
      if (req.url.includes('games/bulk-update-status/')) return new Promise((resolve) => { release = resolve; });
      if (req.url.includes('users/update-status/')) return json({ status: 200, body: {} });
      return json({ status: 404, body: { detail: 'unexpected url' } });
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByTestId('game-list')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Update All Items' }));
    await waitFor(() => expect(bulkCalls()).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled();

    await act(async () => { release(json({ status: 503, body: { detail: 'Servicio no disponible' } })); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible');
    expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled();
  });
});

describe('ReceivePage: a network or server error must not lock the screen', () => {
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = 'http://api.test/'; });
  afterAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = originalHost; });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/receive');
  });

  afterEach(() => { jest.useRealTimers(); });

  it('receive keeps scanner and list after PATCH failure and allows retry', async () => {
    routeApi({
      scan: { status: 200, body: mockTradesResponse },
      patchReplies: [
        { status: 500, body: { detail: 'Falló el servidor' } },
        { status: 200, body: { success: true } },
      ],
    });
    renderPage();

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
      status: 5, assigned_trade_codes: [101],
    });
    expect(screen.getByTestId('game-list')).toBeInTheDocument();

    // "Finish" stays blocked until the retried PATCH settles.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(screen.getByTestId('qr-scanner')).toBeInTheDocument());
  });

  it('receive shows backend detail message', async () => {
    jest.useFakeTimers();
    routeApi({ scan: { status: 404, body: { detail: 'Usuario no encontrado' } } });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByText('Usuario no encontrado')).toBeInTheDocument());

    act(() => { jest.advanceTimersByTime(3000); });
    await waitFor(() => expect(screen.getByTestId('qr-scanner')).toBeInTheDocument());
    expect(screen.queryByText('Usuario no encontrado')).not.toBeInTheDocument();
  });
});

describe('ReceivePage: the scan never sends force (the backend keeps it from lowering the user status)', () => {
  const originalHost = process.env.NEXT_PUBLIC_MT_API_HOST;

  beforeAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = 'http://api.test/'; });
  afterAll(() => { process.env.NEXT_PUBLIC_MT_API_HOST = originalHost; });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/receive');
  });

  it('marca present sin force', async () => {
    routeApi({ scan: { status: 200, body: mockTradesResponse } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => expect(screen.getByTestId('game-list')).toBeInTheDocument());

    const statusBodies = () => fetchMock.mock.calls
      .filter(([url]) => String(url).includes('users/update-status/'))
      .map(([, init]) => JSON.parse(String(init?.body)));
    await waitFor(() => expect(statusBodies()).toHaveLength(1));
    expect(statusBodies()[0]).toEqual({ user_id: 123, status: 'present' });
  });
});

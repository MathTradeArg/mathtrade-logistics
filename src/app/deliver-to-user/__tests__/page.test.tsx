import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { Trade } from '@/types';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { usePathname, useSearchParams } from 'next/navigation';
import DeliverToUserPageContent from '../page';

fetchMock.enableMocks();

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('@/components/QrScanner', () => {
  return jest.fn(({ onScan, disabled, disabledMessage }) => (
    <div data-testid="qr-scanner">
      {disabled && <p>{disabledMessage}</p>}
      <button disabled={disabled} onClick={() => onScan('user-qr-code')}>
        Simulate Scan
      </button>
    </div>
  ));
});

jest.mock('@/components/GameList', () => {
  return jest.fn(({ trades, onUpdateItems, onFinish, deliveredByUserId }) => (
    <div data-testid="game-list">
      <p>Trades: {trades.length}</p>
      <button onClick={() => onUpdateItems([trades[0].result.assigned_trade_code], deliveredByUserId)}>
        Update First Item
      </button>
      <button onClick={onFinish}>Finish</button>
    </div>
  ));
});

jest.mock('@/components/AppHeader', () => {
  return jest.fn(() => <header data-testid="app-header">App Header</header>);
});

jest.mock('@/components/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message || 'Loading...'}</div>
}));


const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

const mockTrades: Trade[] = [
  {
    result: { assigned_trade_code: 101, status_display: 'In Event' },
    math_item_exchanged: { title: 'Juego A' },
  } as unknown as Trade,
];

describe('DeliverToUserPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userId: '1',
      isLoading: false,
    });
    mockUseEventPhase.mockReturnValue({
      eventPhase: 2,
      isLoadingEventPhase: false,
    });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/deliver-to-user');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: null, userId: null, isLoading: true });
    render(<DeliverToUserPageContent />);
    expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Validando sesión...');
  });

  it('shows QR scanner when authenticated and ready', () => {
    render(<DeliverToUserPageContent />);
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    expect(screen.queryByTestId('game-list')).not.toBeInTheDocument();
  });

  it('disables QR scanner if event phase is not "Entrega"', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    render(<DeliverToUserPageContent />);
    expect(screen.getByRole('button', { name: 'Simulate Scan' })).toBeDisabled();
    expect(screen.getByText('La entrega de juegos está deshabilitada en la fase actual del evento.')).toBeInTheDocument();
  });

  it('fetches trades and displays GameList on successful scan', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockTrades));
    render(<DeliverToUserPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('logistics/user/user-qr-code/games/deliver/'),
      expect.any(Object)
    );
    expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
    expect(screen.getByText('Trades: 1')).toBeInTheDocument();
  });

  it('shows an error message on failed fetch and resets after timeout', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ message: 'User not found' }), { status: 404 });
    render(<DeliverToUserPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();

    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    });
    expect(screen.queryByText('User not found')).not.toBeInTheDocument();
  });

  it('triggers scan automatically if qr parameter is in URL', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockTrades));
    mockUseSearchParams.mockReturnValue(new URLSearchParams('?qr=url-qr-code'));

    render(<DeliverToUserPageContent />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('logistics/user/url-qr-code/games/deliver/'),
        expect.any(Object)
      );
    });
  });

  it('handles item update from GameList and updates UI', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockTrades));
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }));


    render(<DeliverToUserPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update First Item' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('logistics/games/bulk-update-status/'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 6,
            assigned_trade_codes: [101],
            change_by_id: 1,
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('game-list')).toBeInTheDocument();
  });

  it('resets to scanner view when GameList onFinish is called', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockTrades));
    render(<DeliverToUserPageContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() => {
      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('game-list')).not.toBeInTheDocument();
  });
});
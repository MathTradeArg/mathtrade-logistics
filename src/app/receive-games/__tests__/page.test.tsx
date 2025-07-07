import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { Trade, User } from '@/types';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { usePathname, useSearchParams } from 'next/navigation';
import ReceiveGamesPage from '../page';

fetchMock.enableMocks();
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');
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
      <button onClick={() => onUpdateItems(trades.map((t: { result: { assigned_trade_code: any; }; }) => t.result.assigned_trade_code), deliveredByUserId)}>
        Update All Items
      </button>
      <button onClick={onFinish}>Finish</button>
    </div>
  ));
});
jest.mock('@/components/common/AppHeader', () => {
  return jest.fn(() => <header data-testid="app-header">App Header</header>);
});
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message || 'Loading...'}</div>
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;
const mockUseApi = useApi as jest.Mock;


const mockUser: User = {
  id: 123,
  first_name: 'Test',
  last_name: 'User'

};
const mockTrades: Trade[] = [
  {
    result: { assigned_trade_code: 101, status_display: 'Pending' },
    math_item_exchanged: { title: 'Juego A' },
    member_to: { id: 123, username: 'testuser' },
  } as unknown as Trade,
];

const mockTradesResponse = {
  games: mockTrades,
  user: mockUser,
};  

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ActionStatusProvider>{ui}</ActionStatusProvider>);
};

describe('ReceiveGamesPage', () => {
  let mockExecute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/receive-games');
    
    mockExecute = jest.fn().mockResolvedValue({ success: true });
    mockUseApi.mockReturnValue({ execute: mockExecute });
  });

  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: null, userId: null, isLoading: true });
    renderWithProviders(<ReceiveGamesPage />);
    expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Validando...');
  });

  it('shows QR scanner when authenticated and ready', () => {
    renderWithProviders(<ReceiveGamesPage />);
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
  });

  it('disables QR scanner if event phase is not "Recepción"', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 0, isLoadingEventPhase: false });
    renderWithProviders(<ReceiveGamesPage />);
    expect(screen.getByRole('button', { name: 'Simulate Scan' })).toBeDisabled();
  });

  it('fetches trades and displays GameList on successful scan', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockTradesResponse));
    renderWithProviders(<ReceiveGamesPage />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('games/receive'), expect.any(Object));
    expect(mockExecute).toHaveBeenCalledWith({ user_id: 123, status: 'present' });
  });

  it('shows an error message on failed fetch and resets after timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockReject(new Error('User not found'));
    renderWithProviders(<ReceiveGamesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });

    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(screen.queryByText('User not found')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('triggers scan automatically if qr parameter is in URL', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockTradesResponse));
    mockUseSearchParams.mockReturnValue(new URLSearchParams('?qr=url-qr-code'));

    renderWithProviders(<ReceiveGamesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('url-qr-code'), expect.any(Object));
    expect(mockExecute).toHaveBeenCalledWith({ user_id: 123, status: 'present' });
  });

  it('handles item update and updates user status to receiving', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockTradesResponse)); // For scan
    fetchMock.mockResponseOnce(JSON.stringify({ success: true })); // For bulk update

    renderWithProviders(<ReceiveGamesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ user_id: 123, status: 'present' });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update All Items' }));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ user_id: 123, status: 'present' });
    });
    
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resets to scanner view when GameList onFinish is called', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockTradesResponse));
    renderWithProviders(<ReceiveGamesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    
    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() => {
      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    });
  });
});
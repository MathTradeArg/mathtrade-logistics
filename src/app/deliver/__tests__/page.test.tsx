import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { Trade, User } from '@/types';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { usePathname, useSearchParams } from 'next/navigation';
import DeliverPage from '../page';

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
  return jest.fn(({trades, onUpdateItems, onFinish, deliveredByUserId }) => (
    <div data-testid="game-list">
      <p>Trades: {trades.length}</p>
      <button onClick={() => onUpdateItems([trades[0].result.assigned_trade_code], deliveredByUserId)}>
        Update First Item
      </button>
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

const mockMixedTrades: Trade[] = [
  mockTrades[0],
  {
    result: { assigned_trade_code: 102, status_display: 'Pending' },
    math_item_exchanged: { title: 'Juego B' },
    member_to: { id: 123, username: 'testuser' },
  } as unknown as Trade,
];

const mockTradesResponse = {
  games: mockTrades,
  user: mockUser,
}; 

describe('DeliverPage', () => {
  let mockExecute: jest.Mock;
  let mockFetchGames: jest.Mock;
  let mockBulkUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    
    localStorage.setItem('authToken', 'fake-token');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: '1', isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/deliver');
    
    mockExecute = jest.fn().mockResolvedValue({ success: true });
    mockFetchGames = jest.fn().mockResolvedValue(mockTradesResponse);
    mockBulkUpdate = jest.fn().mockResolvedValue({ success: true });
    const executes: Record<string, jest.Mock> = {
      'logistics/user/': mockFetchGames,
      'logistics/games/bulk-update-status/': mockBulkUpdate,
      'logistics/users/update-status/': mockExecute,
    };
    mockUseApi.mockImplementation((endpoint: string) => ({ execute: executes[endpoint] }));
  });

  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: null, userId: null, isLoading: true });
    render(<DeliverPage />);
    expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Validando sesión...');
  });

  it('shows QR scanner when authenticated and ready', () => {
    render(<DeliverPage />);
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar socio por nombre')).toBeInTheDocument();
  });

  it('disables QR scanner if event phase is not "Entrega"', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    render(<DeliverPage />);
    expect(screen.getByRole('button', { name: 'Simulate Scan' })).toBeDisabled();
  });

  it('fetches trades and displays GameList on successful scan', async () => {
    render(<DeliverPage />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    expect(mockFetchGames).toHaveBeenCalledWith(undefined, 'user-qr-code/games/deliver/');
    expect(mockExecute).toHaveBeenCalledWith({ user_id: 123, status: 'receiving' });
  });

  it('loads games when a member is selected from name search', async () => {
    fetchMock.mockResponseOnce(JSON.stringify([
      { uuid: 'member-uuid-1', first_name: 'Ana', last_name: 'Perez' },
    ]));

    render(<DeliverPage />);
    fireEvent.change(screen.getByLabelText('Buscar socio por nombre'), { target: { value: 'Ana' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ana Perez/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ana Perez/ }));

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });
    expect(mockFetchGames).toHaveBeenCalledWith(undefined, 'member-uuid-1/games/deliver/');
  });

  it('shows an error message on failed fetch and resets after timeout', async () => {
    jest.useFakeTimers();
    mockFetchGames.mockRejectedValue(new Error('User not found'));
    render(<DeliverPage />);

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
    mockUseSearchParams.mockReturnValue(new URLSearchParams('?qr=url-qr-code'));

    render(<DeliverPage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    expect(mockFetchGames).toHaveBeenCalledWith(undefined, 'url-qr-code/games/deliver/');
    expect(mockExecute).toHaveBeenCalledWith({ user_id: 123, status: 'receiving' });
  });

  it('marks user completed after PATCH when every trade in the list is now delivered', async () => {

    render(<DeliverPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ user_id: 123, status: 'receiving' });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update All Items' }));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ user_id: 123, status: 'completed' });
    });
    expect(mockBulkUpdate).toHaveBeenCalledWith({ status: 6, assigned_trade_codes: [101], change_by_id: 1 });
  });

  it('does not mark completed when some trades remain undelivered', async () => {
    mockFetchGames.mockResolvedValue({ games: mockMixedTrades, user: mockUser });

    render(<DeliverPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }));
    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update First Item' }));

    await waitFor(() => {
      expect(mockBulkUpdate).toHaveBeenCalledWith({ status: 6, assigned_trade_codes: [101], change_by_id: 1 });
    });

    expect(mockExecute).not.toHaveBeenCalledWith({ user_id: 123, status: 'completed' });
  });

  it('resets to scanner view when GameList onFinish is called', async () => {
    render(<DeliverPage />);
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

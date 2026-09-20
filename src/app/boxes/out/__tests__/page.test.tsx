import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { render, screen, waitFor } from '@testing-library/react';
import BoxesOutPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  usePathname: jest.fn(() => '/boxes/out'),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockListBoxes = boxApi.listBoxes as jest.Mock;
const mockListItems = boxApi.listItems as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

describe('BoxesOutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockListItems.mockResolvedValue([
      {
        id: 1,
        title: 'Catan',
        assigned_trade_code: 101,
        status: 5,
        location: 8,
        location_name: 'Córdoba',
      },
      {
        id: 2,
        title: 'Azul',
        assigned_trade_code: 202,
        status: 5,
        location: 8,
        location_name: 'Córdoba',
      },
    ]);
    mockListBoxes.mockResolvedValue([
      {
        id: 21,
        number: null,
        closed_at: null,
        origin: 1,
        destiny: 8,
        origin_name: 'AMBA',
        destination_name: 'Córdoba',
        math_items: [{ id: 2, title: 'Azul', assigned_trade_code: 202, status: 5 }],
      },
    ]);
  });

  it('lists packing destinations without AMBA and without flattened box numbers', async () => {
    render(<BoxesOutPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Córdoba')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Córdoba/ })).toHaveAttribute('href', '/boxes/out/8');
    expect(screen.getByText(/1 listos · 1 en cajas abiertas · 0 cerradas/)).toBeInTheDocument();
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
    expect(screen.queryByText('AMBA')).not.toBeInTheDocument();
  });
});

import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BoxesInPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  usePathname: jest.fn(() => '/boxes/in'),
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

describe('BoxesInPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockListBoxes.mockResolvedValue([
      {
        id: 11,
        number: 3,
        origin: 8,
        origin_name: 'Córdoba',
        destiny: 1,
        destination_name: 'AMBA',
        closed_at: '2026-09-01T10:00:00Z',
        math_items: [{ id: 1, title: 'Catan', assigned_trade_code: 101, status: 4 }],
      },
      {
        id: 12,
        number: 3,
        origin: 9,
        origin_name: 'Rosario',
        destiny: 1,
        destination_name: 'AMBA',
        closed_at: '2026-09-01T10:00:00Z',
        math_items: [{ id: 2, title: 'Azul', assigned_trade_code: 202, status: 4 }],
      },
    ]);
    mockListItems.mockResolvedValue([]);
  });

  it('lists origins and never a flat list of box numbers', async () => {
    render(<BoxesInPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Córdoba')).toBeInTheDocument();
      expect(screen.getByText('Rosario')).toBeInTheDocument();
    });

    expect(screen.queryByText('#3')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Córdoba/ })).toHaveAttribute('href', '/boxes/in/8');
    expect(screen.getByRole('link', { name: /Rosario/ })).toHaveAttribute('href', '/boxes/in/9');
    expect(screen.getByRole('link', { name: /Sueltos/ })).toHaveAttribute('href', '/boxes/in/loose');
  });
});

describe('a screen whose event phase failed to load does not show an endless spinner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
  });

  it('renders no "Cargando..." when the phase is unknown because its request failed', async () => {
    mockUseEventPhase.mockReturnValue({
      eventPhase: null,
      isLoadingEventPhase: false,
      errorEventPhase: 'No se pudo cargar la fase del evento.',
    });
    render(<BoxesInPage />, { wrapper });
    expect(screen.queryByText('Cargando...')).toBeNull();
  });

  it('guard: still shows the spinner while the phase is unknown and nothing failed', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: null, isLoadingEventPhase: false, errorEventPhase: null });
    render(<BoxesInPage />, { wrapper });
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });
});

describe('a network error in a list can be retried without leaving the screen', () => {
  const offline = 'No hay conexión o el servidor tardó demasiado. Probá de nuevo.';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false, errorEventPhase: null });
    mockListItems.mockResolvedValue([]);
  });

  it('shows the error with "Reintentar", and retrying loads the origins', async () => {
    mockListBoxes
      .mockRejectedValueOnce(new Error(offline))
      .mockResolvedValue([
        {
          id: 11,
          number: 3,
          origin: 8,
          origin_name: 'Córdoba',
          destiny: 1,
          destination_name: 'AMBA',
          closed_at: '2026-09-01T10:00:00Z',
          math_items: [{ id: 1, title: 'Catan', assigned_trade_code: 101, status: 4 }],
        },
      ]);
    render(<BoxesInPage />, { wrapper });

    expect(await screen.findByRole('alert')).toHaveTextContent(offline);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Córdoba')).toBeInTheDocument();
    expect(mockListBoxes).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

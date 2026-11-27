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

  it('lists the hub boxes explicitly and the items without AMBA', async () => {
    render(<BoxesOutPage />, { wrapper });
    await screen.findByText('Córdoba');
    expect(mockListBoxes).toHaveBeenCalledWith({ origin: 1 });
    expect(mockListItems).toHaveBeenCalledWith({ excludeAmba: 1 });
  });

  it('has no Excel buttons', async () => {
    render(<BoxesOutPage />, { wrapper });
    await screen.findByText('Córdoba');
    expect(screen.queryByRole('button', { name: /Excel/ })).not.toBeInTheDocument();
  });
});

describe('BoxesOutPage in the delivery phase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false, errorEventPhase: null });
    mockListItems.mockResolvedValue([
      {
        id: 1,
        title: 'Catan',
        assigned_trade_code: 101,
        status: 5,
        location: 8,
        location_name: 'Córdoba',
      },
    ]);
    mockListBoxes.mockResolvedValue([]);
  });

  it('lists destinations in phase 2 and does not block the screen', async () => {
    render(<BoxesOutPage />, { wrapper });
    expect(await screen.findByRole('link', { name: /Córdoba/ })).toHaveAttribute('href', '/boxes/out/8');
    expect(screen.queryByText('El evento no empezó')).not.toBeInTheDocument();
  });
});

describe('Santa Fe group from AMBA', () => {
  const mockListSeparateFromHub = boxApi.listSeparateFromHub as jest.Mock;
  const city = (id: number, title: string, location: number, name: string) => ({
    id, title, assigned_trade_code: id, status: 5, location, location_name: name,
    ...(location === 33 ? {} : { send_to: 33, send_to_name: 'Santa Fe' }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([
      city(1, 'Catan', 33, 'Santa Fe'),
      city(2, 'Azul', 17, 'Esperanza'),
      city(3, 'Root', 13, 'Paraná'),
      city(4, 'Brass', 9, 'Rafaela'),
    ]);
  });

  it('lists Santa Fe, Esperanza, Paraná and Rafaela as four destinations of their own', async () => {
    mockListSeparateFromHub.mockResolvedValue(new Set([33, 17, 13, 9]));
    render(<BoxesOutPage />, { wrapper });

    expect(await screen.findByRole('link', { name: /Esperanza/ })).toHaveAttribute('href', '/boxes/out/17');
    expect(screen.getByRole('link', { name: /Paraná/ })).toHaveAttribute('href', '/boxes/out/13');
    expect(screen.getByRole('link', { name: /Rafaela/ })).toHaveAttribute('href', '/boxes/out/9');
    expect(screen.getByRole('link', { name: /Santa Fe/ })).toHaveAttribute('href', '/boxes/out/33');
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.getAllByText(/1 listos · 0 en cajas abiertas · 0 cerradas/)).toHaveLength(4);
    expect(screen.queryByText(/vía/i)).not.toBeInTheDocument();
  });

  it('keeps them under Santa Fe with an older backend (no separate_from_hub)', async () => {
    mockListSeparateFromHub.mockResolvedValue(new Set());
    render(<BoxesOutPage />, { wrapper });

    expect(await screen.findByRole('link', { name: /Santa Fe/ })).toHaveAttribute('href', '/boxes/out/33');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText(/4 listos/)).toBeInTheDocument();
  });
});

describe('a screen whose event phase failed to load does not show an endless spinner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
  });

  it('renders no "Cargando..." when the phase is unknown because its request failed', () => {
    mockUseEventPhase.mockReturnValue({
      eventPhase: null,
      isLoadingEventPhase: false,
      errorEventPhase: 'No se pudo cargar la fase del evento.',
    });
    render(<BoxesOutPage />, { wrapper });
    expect(screen.queryByText('Cargando...')).toBeNull();
  });

  it('guard: still shows the spinner while the phase is unknown and nothing failed', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: null, isLoadingEventPhase: false, errorEventPhase: null });
    render(<BoxesOutPage />, { wrapper });
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });
});

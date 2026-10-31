import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import CityBoxesPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockListBoxes = boxApi.listBoxes as jest.Mock;
const mockListItems = boxApi.listItems as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

describe('CityBoxesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isLoading: false,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    // The event hasn't started: city screens work anyway.
    mockUseEventPhase.mockReturnValue({ eventPhase: 0, isLoadingEventPhase: false });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([
      // status 2: not scanned at the event, still packable from a city.
      { id: 1, title: 'Catan', assigned_trade_code: 101, status: 2, location: 1, location_name: 'AMBA' },
      { id: 2, title: 'Azul', assigned_trade_code: 102, status: 2, location: 8, location_name: 'Córdoba' },
      { id: 3, title: 'Root', assigned_trade_code: 103, status: 2, location: 7, location_name: 'Mendoza' },
    ]);
  });

  it('lists the city origin, keeps AMBA and drops the local destination', async () => {
    render(<CityBoxesPage />, { wrapper });

    expect(await screen.findByRole('link', { name: /AMBA/ })).toHaveAttribute('href', '/city/boxes/1');
    expect(screen.getByRole('link', { name: /Córdoba/ })).toHaveAttribute('href', '/city/boxes/8');
    expect(screen.queryByRole('link', { name: /Mendoza/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/1 listos/)).toHaveLength(2);
    expect(mockListBoxes).toHaveBeenCalledWith({ origin: 7 });
    expect(mockListItems).toHaveBeenCalledWith({ origin: 7 });
    expect(screen.queryByText('El evento no empezó')).not.toBeInTheDocument();
  });

  it('marks the destinations that travel through AMBA', async () => {
    mockListItems.mockResolvedValue([
      { id: 1, title: 'Catan', assigned_trade_code: 101, status: 2, location: 1, location_name: 'AMBA', via_meeting: true },
      { id: 2, title: 'Azul', assigned_trade_code: 102, status: 2, location: 12, location_name: 'Catamarca', via_meeting: true },
      { id: 3, title: 'Root', assigned_trade_code: 103, status: 2, location: 9, location_name: 'Rosario', via_meeting: false },
    ]);
    render(<CityBoxesPage />, { wrapper });

    const hub = await screen.findByRole('region', { name: 'Van a AMBA' });
    const direct = screen.getByRole('region', { name: 'Directo a otra ciudad' });
    expect(within(hub).getAllByRole('link').map((link) => link.getAttribute('href')))
      .toEqual(['/city/boxes/1', '/city/boxes/12']);
    expect(within(hub).getByText('Catamarca · Vía AMBA')).toBeInTheDocument();
    expect(within(direct).getByText('Rosario')).toBeInTheDocument();
    expect(within(direct).queryByText(/AMBA/)).not.toBeInTheDocument();
  });

  it('says so when the user has no city', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, cityAccess: null });
    render(<CityBoxesPage />, { wrapper });
    expect(screen.getByText('No tenés una ciudad asignada.')).toBeInTheDocument();
    expect(mockListBoxes).not.toHaveBeenCalled();
  });
});

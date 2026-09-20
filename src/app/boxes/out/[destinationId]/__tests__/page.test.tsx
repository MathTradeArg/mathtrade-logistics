import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BoxesOutDestinationPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ destinationId: '8' }),
  useRouter: jest.fn(() => ({ push: mockPush, replace: jest.fn(), back: jest.fn() })),
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
const mockOpenBox = boxApi.openBox as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

const anaBox = {
  id: 396,
  number: null,
  closed_at: null,
  origin: 1,
  destiny: 8,
  origin_name: 'AMBA',
  destination_name: 'Córdoba',
  created_by_username: 'ana',
  created_by_first_name: 'Ana',
  created_by_last_name: 'Palermo',
  math_items: [
    { id: 1, title: 'Catan', assigned_trade_code: 101, status: 5 },
    { id: 2, title: 'Azul', assigned_trade_code: 202, status: 5 },
  ],
};

const luisBox = {
  id: 399,
  number: null,
  closed_at: null,
  origin: 1,
  destiny: 8,
  origin_name: 'AMBA',
  destination_name: 'Córdoba',
  created_by_username: 'luis',
  created_by_first_name: 'Luis',
  created_by_last_name: 'Ramos',
  math_items: [{ id: 3, title: 'Root', assigned_trade_code: 303, status: 5 }],
};

const createdBox = {
  id: 410,
  number: null,
  closed_at: null,
  origin: 1,
  destiny: 8,
  origin_name: 'AMBA',
  destination_name: 'Córdoba',
  created_by_username: 'vol',
  created_by_first_name: 'Vol',
  created_by_last_name: null,
  math_items: [],
};

describe('BoxesOutDestinationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockListItems.mockResolvedValue([]);
    mockOpenBox.mockResolvedValue(createdBox);
    window.localStorage.setItem('authToken', 'test-token');
  });

  it('identifies open boxes by contents and who opened them', async () => {
    mockListBoxes.mockResolvedValue([anaBox, luisBox]);

    render(<BoxesOutDestinationPage />, { wrapper });

    expect(await screen.findByRole('link', { name: /Caja de Ana Palermo/ })).toHaveAttribute(
      'href',
      '/boxes/out/8/396',
    );
    expect(screen.getByText('Catan, Azul')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Caja de Luis Ramos/ })).toHaveAttribute(
      'href',
      '/boxes/out/8/399',
    );
    expect(screen.getByText('Root')).toBeInTheDocument();
  });

  it('opens a box immediately when none are already open', async () => {
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([
      { id: 1, title: 'Catan', assigned_trade_code: 101, status: 5, location: 8, location_name: 'Córdoba' },
    ]);

    render(<BoxesOutDestinationPage />, { wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva caja' }));

    await waitFor(() => {
      expect(mockOpenBox).toHaveBeenCalledWith(8, expect.any(String));
    });
    expect(screen.queryByText(/ya hay una caja abierta/i)).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/boxes/out/8/410');
  });

  it('asks before opening another box and reloads if the volunteer says no', async () => {
    let payload: unknown[] = [anaBox];
    mockListBoxes.mockImplementation(async () => payload);

    render(<BoxesOutDestinationPage />, { wrapper });

    expect(await screen.findByRole('link', { name: /Caja de Ana Palermo/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva caja' }));

    expect(await screen.findByText('Ya hay una caja abierta siendo armada para Córdoba')).toBeInTheDocument();
    expect(screen.getByText('¿Estás segure de que querés abrir otra?')).toBeInTheDocument();
    expect(mockOpenBox).not.toHaveBeenCalled();

    payload = [anaBox, luisBox];
    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(await screen.findByRole('link', { name: /Caja de Luis Ramos/ })).toBeInTheDocument();
    expect(screen.queryByText(/ya hay una caja abierta/i)).not.toBeInTheDocument();
    expect(mockOpenBox).not.toHaveBeenCalled();
  });

  it('creates another open box when the volunteer confirms', async () => {
    mockListBoxes.mockResolvedValue([anaBox]);

    render(<BoxesOutDestinationPage />, { wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva caja' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sí, abrir otra' }));

    await waitFor(() => {
      expect(mockOpenBox).toHaveBeenCalledWith(8, expect.any(String));
    });
    expect(mockPush).toHaveBeenCalledWith('/boxes/out/8/410');
  });
});

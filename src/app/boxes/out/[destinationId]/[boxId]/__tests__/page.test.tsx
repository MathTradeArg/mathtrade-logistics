import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useBoxLifecycle } from '@/hooks/boxes/useBoxLifecycle';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OutgoingBoxPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/hooks/boxes/useBoxLifecycle');
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ destinationId: '2', boxId: '399' }),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() })),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseBoxLifecycle = useBoxLifecycle as jest.Mock;
const mockGetBox = boxApi.getBox as jest.Mock;
const mockListBoxes = boxApi.listBoxes as jest.Mock;
const mockListItems = boxApi.listItems as jest.Mock;
const mockDeleteBox = jest.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

const emptyBox = {
  id: 399,
  number: null,
  closed_at: null,
  origin: 1,
  destiny: 2,
  origin_name: 'AMBA',
  destination_name: 'Mendoza',
  created_by_username: 'admin',
  created_by_first_name: 'Admin',
  created_by_last_name: 'Demo',
  math_items: [],
};

const filledBox = {
  ...emptyBox,
  math_items: [
    { id: 11, title: 'Catan', assigned_trade_code: 101, status: 5 },
    { id: 12, title: 'Azul', assigned_trade_code: 202, status: 5 },
  ],
};

describe('OutgoingBoxPage delete empty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUseBoxLifecycle.mockReturnValue({
      inFlight: false,
      addItems: jest.fn(),
      removeItem: jest.fn(),
      moveItem: jest.fn(),
      closeBox: jest.fn(),
      deleteBox: mockDeleteBox,
    });
    mockGetBox.mockResolvedValue(emptyBox);
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
  });

  it('lists the hub open boxes of the destination', async () => {
    render(<OutgoingBoxPage />, { wrapper });
    await screen.findByRole('button', { name: 'Borrar caja vacía' });
    expect(mockListBoxes).toHaveBeenCalledWith({ destination: 2, origin: 1, status: 'open' });
  });

  it('warns with added games and refreshes the box after OK', async () => {
    mockDeleteBox.mockResolvedValue({ status: 'has_items', titles: ['Catan', 'Azul'] });

    render(<OutgoingBoxPage />, { wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Borrar caja vacía' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));

    expect(
      await screen.findByText('Ya se agregaron los siguientes juegos: Catan, Azul'),
    ).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();

    mockGetBox.mockResolvedValue(filledBox);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => {
      expect(screen.getByText(/Catan/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Azul/)).toBeInTheDocument();
    expect(screen.queryByText(/Ya se agregaron los siguientes juegos/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar caja vacía' })).not.toBeInTheDocument();
    expect(mockGetBox).toHaveBeenCalledTimes(2);
  });

  it('filters available games by search query when adding to a box', async () => {
    mockListItems.mockResolvedValue([
      { id: 21, title: 'Terraforming Mars', assigned_trade_code: 301, status: 5, location: 2, receptor_first_name: 'Ana' },
      { id: 22, title: 'Wingspan', assigned_trade_code: 302, status: 5, location: 2, receptor_first_name: 'Beto' },
    ]);

    render(<OutgoingBoxPage />, { wrapper });

    const addBtn = await screen.findByRole('button', { name: 'Agregar juegos' });
    fireEvent.click(addBtn);

    expect(await screen.findByText(/Terraforming Mars/)).toBeInTheDocument();
    expect(screen.getByText(/Wingspan/)).toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox', { name: 'Buscar juego para agregar' });
    fireEvent.change(searchInput, { target: { value: '302' } });

    expect(screen.queryByText(/Terraforming Mars/)).not.toBeInTheDocument();
    expect(screen.getByText(/Wingspan/)).toBeInTheDocument();
  });
});

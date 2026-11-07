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
const mockReopenBox = jest.fn();

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
      reopenBox: mockReopenBox,
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

const closedBox = {
  ...emptyBox,
  number: 7,
  closed_at: '2026-11-06T10:00:00Z',
  math_items: [{ id: 11, title: 'Catan', assigned_trade_code: 101, status: 5 }],
};

describe('OutgoingBoxPage reopen: a closed box can be reopened only while it is not in a shipment', () => {
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
      reopenBox: mockReopenBox,
    });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
  });

  it('shows a reopen button for a closed box that is not in a shipment', async () => {
    mockGetBox.mockResolvedValue({ ...closedBox, tracking: null });
    render(<OutgoingBoxPage />, { wrapper });
    expect(await screen.findByRole('button', { name: 'Reabrir caja' })).toBeInTheDocument();
  });

  it('does not offer reopen once the box is in a shipment', async () => {
    mockGetBox.mockResolvedValue({ ...closedBox, tracking: 'ABC123' });
    render(<OutgoingBoxPage />, { wrapper });
    await screen.findByText(/Catan/);
    expect(screen.queryByRole('button', { name: 'Reabrir caja' })).not.toBeInTheDocument();
  });

  it('reopens after confirming and reloads the box', async () => {
    mockGetBox.mockResolvedValue({ ...closedBox, tracking: null });
    mockReopenBox.mockResolvedValue({ ...closedBox, closed_at: null });
    render(<OutgoingBoxPage />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Reabrir caja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    await waitFor(() => expect(mockReopenBox).toHaveBeenCalledWith(399));
    await waitFor(() => expect(mockGetBox).toHaveBeenCalledTimes(2));
  });
});

// Rule: at the hub the volunteer with the game in hand types its label code and
// Enter; that copy goes into the box without the list and the field stays ready.
describe('OutgoingBoxPage add by label code: Enter adds the copy and keeps the field ready for the next', () => {
  const terraforming = { id: 21, title: 'Terraforming Mars', assigned_trade_code: 301, status: 5, location: 2 };
  const wingspan = { id: 22, title: 'Wingspan', assigned_trade_code: 302, status: 5, location: 2 };

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
      reopenBox: mockReopenBox,
    });
    mockGetBox.mockResolvedValue(emptyBox);
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([terraforming, wingspan]);
  });

  it('typing the code of a ready copy and Enter adds it, reloads the box and keeps the focus', async () => {
    (boxApi.addItem as jest.Mock).mockResolvedValue({ ...emptyBox, math_items: [terraforming] });
    render(<OutgoingBoxPage />, { wrapper });

    const input = await screen.findByLabelText('Código de la etiqueta');
    expect(input).not.toHaveFocus();
    fireEvent.change(input, { target: { value: '00301' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => expect(boxApi.addItem).toHaveBeenCalledWith(399, 21));
    expect(await screen.findByRole('status')).toHaveTextContent('Agregado: 00301 · Terraforming Mars');
    await waitFor(() => expect(mockGetBox).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Código de la etiqueta')).toHaveValue('');
    expect(screen.getByLabelText('Código de la etiqueta')).toHaveFocus();
  });

  it('a copy already in another open box shows where it is without calling the API', async () => {
    mockListBoxes.mockResolvedValue([{ ...emptyBox, id: 400, number: 3, math_items: [wingspan] }]);
    render(<OutgoingBoxPage />, { wrapper });

    const input = await screen.findByLabelText('Código de la etiqueta');
    fireEvent.change(input, { target: { value: '302' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese juego ya está en la caja #3.');
    expect(boxApi.addItem).not.toHaveBeenCalled();
  });
});

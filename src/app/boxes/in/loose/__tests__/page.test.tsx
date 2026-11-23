import { useEventPhase } from '@/contexts/EventPhaseContext';
import { listItems, markItemsReceived } from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import LooseIncomingPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi', () => ({
  listItems: jest.fn(),
  markItemsReceived: jest.fn(),
}));
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockList = listItems as jest.Mock;
const mockMark = markItemsReceived as jest.Mock;

const items = [
  { id: 1, item_id: 88, title: 'Catan', assigned_trade_code: 501, status: 4, origin_location_name: 'Salta' },
  { id: 2, item_id: 89, title: 'Azul', assigned_trade_code: 502, status: 4, origin_location_name: 'Salta' },
];

// Rule: marking games En evento from Sueltos is irreversible for a volunteer
// (only an organizer can undo it), so it asks first and lists the games.
describe('LooseIncomingPage: Marcar En evento asks first', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: 9 });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockList.mockResolvedValue(items);
    mockMark.mockResolvedValue(undefined);
  });

  const searchAndSelectBoth = async () => {
    render(<LooseIncomingPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Buscar sueltos'), { target: { value: '50' } });
    fireEvent.click(await screen.findByRole('checkbox', { name: /Catan/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Azul/ }));
  };

  it('opens a confirmation with the count and the games, and does not mark yet', async () => {
    await searchAndSelectBoth();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar En evento (2)' }));

    expect(mockMark).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Vas a marcar 2 juegos como En evento');
    expect(dialog).toHaveTextContent('00501 · Catan');
    expect(dialog).toHaveTextContent('00502 · Azul');
    expect(dialog).toHaveTextContent('Si alguno no llegó físicamente, no lo marques: solo un organizador puede deshacerlo.');
  });

  it('confirming marks the selected games and reloads', async () => {
    await searchAndSelectBoth();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar En evento (2)' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar (2)' }));

    await waitFor(() => expect(mockMark).toHaveBeenCalledWith([501, 502], 9));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Cancelar does not mark and keeps the selection', async () => {
    await searchAndSelectBoth();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar En evento (2)' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockMark).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: /Catan/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Marcar En evento (2)' })).toBeEnabled();
  });

  it('if marking fails the dialog closes and the error shows on the screen', async () => {
    mockMark.mockRejectedValue(new Error('Sin conexión'));
    await searchAndSelectBoth();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar En evento (2)' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar (2)' }));

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// Rule (decision 9): Cajas can mark En evento a loose game that continues to
// another city. When nothing bound to AMBA matches, Sueltos also searches the
// games of the other cities, and says where each one continues.
describe('LooseIncomingPage: games that continue to other cities', () => {
  const rosario = {
    id: 30, item_id: 120, title: 'Brass', assigned_trade_code: 777, status: 4,
    origin_location_name: 'Salta', location: 12, location_name: 'Funes',
    send_to: 11, send_to_name: 'Rosario', receptor_first_name: 'Ana', receptor_last_name: 'Paz',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: 9 });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockMark.mockResolvedValue(undefined);
  });

  const mockLists = (amba: unknown[], others: unknown[] | Promise<unknown[]>) => {
    mockList.mockImplementation((params: { destination?: number; excludeAmba?: number }) =>
      params.excludeAmba ? Promise.resolve(others) : Promise.resolve(amba));
  };

  it('does not ask for the other cities on mount nor when something already matches', async () => {
    mockLists(items, [rosario]);
    render(<LooseIncomingPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Buscar sueltos'), { target: { value: 'Catan' } });
    expect(await screen.findByRole('checkbox', { name: /Catan/ })).toBeInTheDocument();

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith({ destination: 1 });
  });

  it('with no matches and 2+ characters, searches without the destination filter and shows where it continues', async () => {
    mockLists(items, [rosario, { ...rosario, id: 31, assigned_trade_code: 778, title: 'Llegado', status: 5 }]);
    render(<LooseIncomingPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Buscar sueltos'), { target: { value: '777' } });

    const row = await screen.findByRole('checkbox', { name: /Brass/ });
    expect(mockList).toHaveBeenCalledWith({ excludeAmba: 1, excludeDelivered: true });
    expect(row).toHaveTextContent('Sigue a Rosario');
    expect(screen.queryByText('No hay pendientes que coincidan.')).not.toBeInTheDocument();

    fireEvent.click(row);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar En evento (1)' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('00777 · Brass');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar (1)' }));
    await waitFor(() => expect(mockMark).toHaveBeenCalledWith([777], 9));
  });

  it('shows "Buscando en el resto de las ciudades..." while it loads', async () => {
    let resolveOthers: (value: unknown[]) => void = () => undefined;
    const pending = new Promise<unknown[]>((resolve) => { resolveOthers = resolve; });
    mockLists(items, pending);
    render(<LooseIncomingPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Buscar sueltos'), { target: { value: '777' } });

    expect(await screen.findByText('Buscando en el resto de las ciudades...')).toBeInTheDocument();
    resolveOthers([rosario]);
    expect(await screen.findByRole('checkbox', { name: /Brass/ })).toBeInTheDocument();
    expect(screen.queryByText('Buscando en el resto de las ciudades...')).not.toBeInTheDocument();
  });

  it('after marking, both lists are reloaded', async () => {
    mockLists(items, [rosario]);
    render(<LooseIncomingPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Buscar sueltos'), { target: { value: '777' } });
    fireEvent.click(await screen.findByRole('checkbox', { name: /Brass/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar En evento (1)' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar (1)' }));

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(4));
    const calls = mockList.mock.calls.map(([params]) => params);
    expect(calls.filter((p) => p.destination === 1)).toHaveLength(2);
    expect(calls.filter((p) => p.excludeAmba === 1)).toHaveLength(2);
  });

  it('a game of a locality that ships as AMBA (La Plata) says "Retira en mesa especial", not "Sigue a"', async () => {
    mockLists([{
      id: 40, item_id: 130, title: 'Root', assigned_trade_code: 900, status: 4,
      origin_location_name: 'Salta', location: 20, location_name: 'La Plata',
      send_to: 1, send_to_name: 'AMBA', receptor_first_name: 'Leo', receptor_last_name: 'Gil',
    }], []);
    render(<LooseIncomingPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Buscar sueltos'), { target: { value: 'Root' } });

    const row = await screen.findByRole('checkbox', { name: /Root/ });
    expect(row).toHaveTextContent('Retira en mesa especial');
    expect(row).toHaveTextContent('Retira en mesa especial · Leo Gil');
    expect(row).not.toHaveTextContent('Sigue a');
  });
});

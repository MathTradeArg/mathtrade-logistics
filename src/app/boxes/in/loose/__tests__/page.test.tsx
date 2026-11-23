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

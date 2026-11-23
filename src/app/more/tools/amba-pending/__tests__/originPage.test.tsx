import { useAuth } from '@/hooks/useAuth';
import { listAmbaPending, markItemsReceived } from '@/hooks/boxes/boxApi';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AmbaPendingOriginPage from '../[originId]/page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/boxes/boxApi', () => ({
  listAmbaPending: jest.fn(),
  markItemsReceived: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ originId: '10' }),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockList = listAmbaPending as jest.Mock;
const mockMark = markItemsReceived as jest.Mock;

const origin = {
  origin_id: 10,
  origin_name: 'Córdoba',
  trades: [
    {
      assigned_trade_code: 101,
      title: 'Catan',
      recipient_first_name: 'Ana',
      recipient_last_name: 'Paz',
      box: null,
    },
    {
      assigned_trade_code: 102,
      title: 'Azul',
      recipient_first_name: 'Beto',
      recipient_last_name: 'Gil',
      box: { number: 4, destination_name: 'Rosario' },
    },
  ],
  unopened_amba_boxes: [{ id: 1, number: 3, pending_count: 2 }],
  transit_boxes: [{ id: 2, number: 5, destination_name: 'Rosario', item_count: 7 }],
};

describe('AmbaPendingOriginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: 9 });
    mockList.mockResolvedValue([origin]);
    mockMark.mockResolvedValue(undefined);
  });

  it('shows unopened boxes first, then transit boxes, then the folded games list', async () => {
    const { container } = render(<AmbaPendingOriginPage />);

    const summary = await screen.findByText('Juegos no recibidos (2)');
    expect(summary.tagName).toBe('SUMMARY');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');

    const text = container.textContent || '';
    const unopened = text.indexOf('Cajas AMBA sin abrir');
    const transit = text.indexOf('Cajas de tránsito');
    const games = text.indexOf('Juegos no recibidos (2)');
    expect(unopened).toBeGreaterThanOrEqual(0);
    expect(unopened).toBeLessThan(transit);
    expect(transit).toBeLessThan(games);

    expect(screen.getByRole('link', { name: /#3/ })).toHaveAttribute('href', '/boxes/in/10/1');
    expect(screen.getByRole('link', { name: /#5 → Rosario/ })).toHaveAttribute('href', '/boxes/in/10/2');

    const rows = screen.getAllByRole('checkbox', { hidden: true });
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(details).toContainElement(row));
    expect(screen.getByText('Ana Paz · Sin caja')).toBeInTheDocument();
    expect(screen.getByText('Beto Gil · Caja #4 → Rosario')).toBeInTheDocument();
  });

  it('shows the empty text inside the folded block when there are no games', async () => {
    mockList.mockResolvedValue([{ ...origin, trades: [] }]);
    render(<AmbaPendingOriginPage />);

    const summary = await screen.findByText('Juegos no recibidos (0)');
    expect(summary.closest('details')).toContainElement(screen.getByText('No hay juegos pendientes a AMBA.'));
  });

  const selectBoth = async () => {
    render(<AmbaPendingOriginPage />);
    await screen.findByText('Juegos no recibidos (2)');
    const [first, second] = screen.getAllByRole('checkbox', { hidden: true });
    fireEvent.click(first);
    fireEvent.click(second);
    return { first, second };
  };

  it('marks the selected games as en evento from the bottom button, after confirming', async () => {
    render(<AmbaPendingOriginPage />);
    await screen.findByText('Juegos no recibidos (2)');

    expect(screen.queryByRole('button', { name: /en evento/ })).not.toBeInTheDocument();

    const [first, second] = screen.getAllByRole('checkbox', { hidden: true });
    fireEvent.click(first);
    fireEvent.click(second);
    expect(first).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Marcar 2 en evento' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar (2)' }));

    await waitFor(() => expect(mockMark).toHaveBeenCalledWith([101, 102], 9));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('button', { name: /en evento/ })).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Rule: any volunteer can mark games En evento from here, but only after a
  // confirmation that says how many and which games (only an organizer can undo it).
  it('the bottom button opens a confirmation with the count and the games, and does not mark yet', async () => {
    await selectBoth();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar 2 en evento' }));

    expect(mockMark).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Vas a marcar 2 juegos como En evento');
    expect(dialog).toHaveTextContent('00101 Catan');
    expect(dialog).toHaveTextContent('00102 Azul');
    expect(dialog).toHaveTextContent('Si alguno no llegó físicamente, no lo marques: solo un organizador puede deshacerlo.');
  });

  it('Cancelar does not mark and keeps the selection', async () => {
    const { first, second } = await selectBoth();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar 2 en evento' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockMark).not.toHaveBeenCalled();
    expect(first).toHaveAttribute('aria-checked', 'true');
    expect(second).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Marcar 2 en evento' })).toBeInTheDocument();
  });

  it('if marking fails the dialog closes and the error shows on the screen', async () => {
    mockMark.mockRejectedValue(new Error('Sin conexión'));
    await selectBoth();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar 2 en evento' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar (2)' }));

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

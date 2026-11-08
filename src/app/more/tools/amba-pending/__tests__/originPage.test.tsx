import { useAuth } from '@/hooks/useAuth';
import { listAmbaPending, markItemsReceived } from '@/hooks/boxes/boxApi';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('marks the selected games as en evento from the bottom button', async () => {
    render(<AmbaPendingOriginPage />);
    await screen.findByText('Juegos no recibidos (2)');

    expect(screen.queryByRole('button', { name: /en evento/ })).not.toBeInTheDocument();

    const [first, second] = screen.getAllByRole('checkbox', { hidden: true });
    fireEvent.click(first);
    fireEvent.click(second);
    expect(first).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Marcar 2 en evento' }));

    await waitFor(() => expect(mockMark).toHaveBeenCalledWith([101, 102], 9));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('button', { name: /en evento/ })).not.toBeInTheDocument());
  });
});

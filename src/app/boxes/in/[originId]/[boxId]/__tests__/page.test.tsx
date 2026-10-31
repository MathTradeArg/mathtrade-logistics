import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import IncomingBoxPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ originId: '8', boxId: '392' }),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockGetBox = boxApi.getBox as jest.Mock;
const mockListBoxes = boxApi.listBoxes as jest.Mock;
const mockListItems = boxApi.listItems as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

const ambaBox = {
  id: 392,
  number: 16,
  origin: 8,
  origin_name: 'Salta',
  destiny: 1,
  destination_name: 'AMBA',
  math_items: [
    { id: 1, item_id: 88, title: 'Catan', assigned_trade_code: 501, status: 4, reported_missing: true },
    { id: 2, item_id: 89, title: 'Earth', assigned_trade_code: 502, status: 4 },
  ],
};

describe('IncomingBoxPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockGetBox.mockResolvedValue(ambaBox);
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
  });

  it('shows reported-missing items as flagged but still selectable', async () => {
    render(<IncomingBoxPage />, { wrapper });

    const missingRow = await screen.findByRole('checkbox', { name: /Catan/ });
    expect(missingRow).toHaveTextContent('Faltante reportado');
    expect(missingRow).toBeEnabled();
    expect(missingRow).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(missingRow);
    expect(missingRow).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Marcar recibidos (1)' })).toBeEnabled();

    expect(screen.getByRole('checkbox', { name: /Earth/ })).not.toHaveTextContent('Faltante reportado');
  });

  it('links Reportar faltante to a preloaded report with box and game ids', async () => {
    render(<IncomingBoxPage />, { wrapper });

    const earth = await screen.findByRole('checkbox', { name: /Earth/ });
    fireEvent.click(earth);

    const link = screen.getByRole('link', { name: 'Reportar faltante' });
    expect(link).toHaveAttribute(
      'href',
      '/more/report?kind=missing&box=392&boxNumber=16&origin=Salta&item=89&code=502&title=Earth',
    );
  });

  it('preloads every selected game when reporting several missing items', async () => {
    render(<IncomingBoxPage />, { wrapper });

    fireEvent.click(await screen.findByRole('checkbox', { name: /Catan/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Earth/ }));

    const link = screen.getByRole('link', { name: 'Reportar faltante (2)' });
    const href = link.getAttribute('href') || '';
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('box')).toBe('392');
    expect(JSON.parse(params.get('items') || '[]')).toEqual([
      { item_id: 88, title: 'Catan', assigned_trade_code: 501 },
      { item_id: 89, title: 'Earth', assigned_trade_code: 502 },
    ]);
  });

  it('lets volunteers open a single-locality onward box and mark games received', async () => {
    mockGetBox.mockResolvedValue({
      id: 400,
      number: 16,
      origin: 8,
      origin_name: 'Salta',
      destiny: 3,
      destination_name: 'Córdoba',
      closed_at: '2026-09-01T10:00:00Z',
      math_items: [
        { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, location: 3, location_name: 'Córdoba' },
      ],
    });

    render(<IncomingBoxPage />, { wrapper });

    const row = await screen.findByRole('checkbox', { name: /Wingspan/ });
    expect(row).toHaveTextContent('Sigue a Córdoba');
    expect(screen.getByText(/Todos los juegos declarados van a Córdoba/i)).toBeInTheDocument();

    fireEvent.click(row);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar recibidos (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar (1)' }));

    await waitFor(() => {
      expect(boxApi.markItemsReceived).toHaveBeenCalledWith([20040], '1');
    });
  });

  it('flags mixed-locality onward boxes and lets volunteers receive their games to separate by destination', async () => {
    mockGetBox.mockResolvedValue({
      id: 401,
      number: 17,
      origin: 8,
      origin_name: 'Salta',
      destiny: 1,
      destination_name: 'AMBA',
      closed_at: '2026-09-01T10:00:00Z',
      math_items: [
        { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, via_meeting: true, location: 3, location_name: 'Córdoba' },
        { id: 10, item_id: 91, title: 'Azul', assigned_trade_code: 20041, status: 4, via_meeting: true, location: 4, location_name: 'Catamarca' },
      ],
    });

    render(<IncomingBoxPage />, { wrapper });

    expect(await screen.findByText(/Localidades mezcladas \(Catamarca, Córdoba\): hay que abrir esta caja/i)).toBeInTheDocument();
    const wingspan = screen.getByRole('checkbox', { name: /Wingspan/ });
    const azul = screen.getByRole('checkbox', { name: /Azul/ });
    expect(wingspan).toHaveTextContent('Sigue a Córdoba');
    expect(azul).toHaveTextContent('Sigue a Catamarca');

    fireEvent.click(wingspan);
    fireEvent.click(azul);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar recibidos (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar (2)' }));

    await waitFor(() => {
      expect(boxApi.markItemsReceived).toHaveBeenCalledWith([20040, 20041], '1');
    });
  });
});

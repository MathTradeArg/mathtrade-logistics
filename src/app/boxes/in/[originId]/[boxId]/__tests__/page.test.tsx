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
const mockReopenBox = boxApi.reopenBox as jest.Mock;

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

// Rule: a box in a shipment is reopened at the event only when it is a transit
// box (neither origin nor destination is AMBA); event staff rebuild it there.
describe('IncomingBoxPage rebuild of transit boxes', () => {
  const closedTransitBox = {
    id: 392,
    number: 16,
    origin: 8,
    origin_name: 'Salta',
    destiny: 3,
    destination_name: 'Córdoba',
    closed_at: '2026-09-01T10:00:00Z',
    tracking: 'VC-123',
    math_items: [
      { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, location: 3, location_name: 'Córdoba' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
  });

  it('a transit box in a shipment can be rebuilt: confirming reopens it and leaves it editable', async () => {
    mockGetBox
      .mockResolvedValueOnce(closedTransitBox)
      .mockResolvedValue({ ...closedTransitBox, closed_at: null });
    mockReopenBox.mockResolvedValue({ ...closedTransitBox, closed_at: null });

    render(<IncomingBoxPage />, { wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Rearmar caja' }));
    expect(
      screen.getByText(/Los juegos que siguen a otras ciudades no se marcan como recibidos/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rearmar' }));

    await waitFor(() => expect(mockReopenBox).toHaveBeenCalledWith(392));
    expect(await screen.findByRole('button', { name: 'Cerrar de nuevo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sacar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar juegos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar recibidos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar recibido' })).not.toBeInTheDocument();
  });

  it('in a rebuilt transit box only games that end in AMBA can be marked received; games going on to other cities cannot', async () => {
    mockGetBox.mockResolvedValue({
      ...closedTransitBox,
      closed_at: null,
      math_items: [
        { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, location: 3, location_name: 'Córdoba', lane_destination: 3 },
        { id: 11, item_id: 92, title: 'Brass', assigned_trade_code: 20042, status: 4, location: 1, location_name: 'AMBA', lane_destination: 1 },
      ],
    });

    render(<IncomingBoxPage />, { wrapper });

    expect(
      await screen.findByText(/Los juegos que siguen a otras ciudades no se marcan como recibidos/),
    ).toBeInTheDocument();
    const receiveButtons = screen.getAllByRole('button', { name: 'Marcar recibido' });
    expect(receiveButtons).toHaveLength(1);
    fireEvent.click(receiveButtons[0]);

    await waitFor(() => expect(boxApi.markItemsReceived).toHaveBeenCalledWith([20042], '1'));
  });

  it('does not offer rebuilding a box to AMBA that is in a shipment', async () => {
    mockGetBox.mockResolvedValue({ ...ambaBox, closed_at: '2026-09-01T10:00:00Z', tracking: 'VC-9' });

    render(<IncomingBoxPage />, { wrapper });

    await screen.findByRole('checkbox', { name: /Catan/ });
    expect(screen.queryByRole('button', { name: 'Rearmar caja' })).not.toBeInTheDocument();
  });

  it('does not offer rebuilding a mixed-locality box to AMBA (it is received, not rebuilt)', async () => {
    mockGetBox.mockResolvedValue({
      id: 401,
      number: 17,
      origin: 8,
      origin_name: 'Salta',
      destiny: 1,
      destination_name: 'AMBA',
      closed_at: '2026-09-01T10:00:00Z',
      tracking: 'VC-10',
      math_items: [
        { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, via_meeting: true, location: 3, location_name: 'Córdoba' },
        { id: 10, item_id: 91, title: 'Azul', assigned_trade_code: 20041, status: 4, via_meeting: true, location: 4, location_name: 'Catamarca' },
      ],
    });

    render(<IncomingBoxPage />, { wrapper });

    await screen.findByRole('checkbox', { name: /Wingspan/ });
    expect(screen.queryByRole('button', { name: 'Rearmar caja' })).not.toBeInTheDocument();
  });
});

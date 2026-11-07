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
      screen.getByText(/Marcá todos sus juegos como recibidos, también los que siguen a otras ciudades/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rearmar' }));

    await waitFor(() => expect(mockReopenBox).toHaveBeenCalledWith(392));
    expect(await screen.findByRole('button', { name: 'Cerrar de nuevo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sacar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar juegos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar recibidos/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar recibido' })).toBeInTheDocument();
  });

  it('does not offer rebuilding a box leaving AMBA that is in a shipment (it already left)', async () => {
    mockGetBox.mockResolvedValue({
      ...closedTransitBox,
      origin: 1,
      origin_name: 'AMBA',
    });

    render(<IncomingBoxPage />, { wrapper });

    await screen.findByRole('checkbox', { name: /Wingspan/ });
    expect(screen.queryByRole('button', { name: 'Rearmar caja' })).not.toBeInTheDocument();
  });
});

// Rule: event staff may also rebuild a box that arrived at the event (city ->
// AMBA) inside a shipment: reopen it, add, take out and move games, and close
// it again with the same number.
describe('IncomingBoxPage rebuild of boxes that arrived at AMBA', () => {
  const closedToAmba = {
    id: 392,
    number: 17,
    origin: 8,
    origin_name: 'Salta',
    destiny: 1,
    destination_name: 'AMBA',
    lane_destination: 1,
    closed_at: '2026-09-01T10:00:00Z',
    tracking: 'VC-10',
    math_items: [
      { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, via_meeting: true, location: 3, location_name: 'Córdoba', lane_destination: 3, origin_location: 8 },
      { id: 10, item_id: 91, title: 'Azul', assigned_trade_code: 20041, status: 4, via_meeting: true, location: 4, location_name: 'Catamarca', lane_destination: 4, origin_location: 8 },
    ],
  };
  const openSibling = {
    id: 402,
    number: 18,
    origin: 8,
    origin_name: 'Salta',
    destiny: 1,
    destination_name: 'AMBA',
    lane_destination: 1,
    closed_at: null,
    tracking: 'VC-10',
    math_items: [],
  };
  // Not boxed yet, from Salta, going on to Córdoba through AMBA.
  const looseViaAmba = {
    id: 12, item_id: 93, title: 'Heat', assigned_trade_code: 20043, status: 4,
    via_meeting: true, location: 3, location_name: 'Córdoba', lane_destination: 3, origin_location: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockListBoxes.mockResolvedValue([openSibling]);
    mockListItems.mockResolvedValue([looseViaAmba]);
  });

  it('a box to AMBA in a shipment shows Rearmar caja and, reopened, can be edited and closed again', async () => {
    const reopened = { ...closedToAmba, closed_at: null };
    mockGetBox.mockResolvedValueOnce(closedToAmba).mockResolvedValue(reopened);
    mockReopenBox.mockResolvedValue(reopened);
    mockListBoxes.mockResolvedValue([reopened, openSibling]);

    render(<IncomingBoxPage />, { wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Rearmar caja' }));
    expect(
      screen.getByText(/Marcá todos sus juegos como recibidos, también los que siguen a otras ciudades/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rearmar' }));

    await waitFor(() => expect(mockReopenBox).toHaveBeenCalledWith(392));
    expect(await screen.findByRole('button', { name: 'Cerrar de nuevo' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Sacar' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Marcar recibido' })).toHaveLength(2);
    expect(await screen.findAllByRole('button', { name: 'Mover a otra caja' })).toHaveLength(2);

    const add = screen.getByRole('button', { name: 'Agregar juegos' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Heat/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar (1)' }));
    await waitFor(() => expect(boxApi.addItem).toHaveBeenCalledWith(392, 12));
  });

  it('a box to AMBA that was never shipped keeps the receive flow (no rebuild)', async () => {
    mockGetBox.mockResolvedValue({ ...closedToAmba, closed_at: null, tracking: null, number: null });

    render(<IncomingBoxPage />, { wrapper });

    await screen.findByRole('checkbox', { name: /Wingspan/ });
    expect(screen.queryByRole('button', { name: 'Cerrar de nuevo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rearmar caja' })).not.toBeInTheDocument();
  });
});

// Rule: every game in a box that is opened at the event is marked "en evento",
// including the ones that go on to other cities.
describe('IncomingBoxPage: every game of an opened box is marked en evento, also those going on to other cities', () => {
  const reopenedTransitBox = {
    id: 392,
    number: 16,
    origin: 8,
    origin_name: 'Salta',
    destiny: 3,
    destination_name: 'Córdoba',
    closed_at: null,
    tracking: 'VC-123',
    math_items: [
      { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, location: 3, location_name: 'Córdoba', lane_destination: 3 },
      { id: 11, item_id: 92, title: 'Brass', assigned_trade_code: 20042, status: 4, location: 1, location_name: 'AMBA', lane_destination: 1 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
    mockGetBox.mockResolvedValue(reopenedTransitBox);
  });

  it('in a reopened transit box a game going on to another city can be marked received', async () => {
    render(<IncomingBoxPage />, { wrapper });

    await screen.findByRole('button', { name: 'Cerrar de nuevo' });
    const receiveButtons = screen.getAllByRole('button', { name: 'Marcar recibido' });
    expect(receiveButtons).toHaveLength(2);
    fireEvent.click(receiveButtons[0]);

    await waitFor(() => expect(boxApi.markItemsReceived).toHaveBeenCalledWith([20040], '1'));
  });

  it('does not tell volunteers that games going on to other cities are not marked', async () => {
    mockGetBox
      .mockResolvedValueOnce({ ...reopenedTransitBox, closed_at: '2026-09-01T10:00:00Z' })
      .mockResolvedValue(reopenedTransitBox);
    mockReopenBox.mockResolvedValue(reopenedTransitBox);

    render(<IncomingBoxPage />, { wrapper });

    fireEvent.click(await screen.findByRole('button', { name: 'Rearmar caja' }));
    expect(screen.queryByText(/no se marcan como recibidos/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rearmar' }));

    await screen.findByRole('button', { name: 'Cerrar de nuevo' });
    expect(screen.queryByText(/no se marcan como recibidos/)).not.toBeInTheDocument();
  });
});

// Rule: in a rebuilt box the volunteer also adds a copy by typing its label
// code and Enter; the title list keeps working.
describe('IncomingBoxPage rebuilt box: add by label code', () => {
  const reopenedToAmba = {
    id: 392,
    number: 17,
    origin: 8,
    origin_name: 'Salta',
    destiny: 1,
    destination_name: 'AMBA',
    lane_destination: 1,
    closed_at: null,
    tracking: 'VC-10',
    math_items: [
      { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, via_meeting: true, location: 3, lane_destination: 3, origin_location: 8 },
    ],
  };
  const otherBox = { ...reopenedToAmba, id: 402, number: 18, math_items: [] as unknown[] };
  const heat = {
    id: 12, item_id: 93, title: 'Heat', assigned_trade_code: 20043, status: 4,
    via_meeting: true, location: 3, lane_destination: 3, origin_location: 8,
  };
  const brass = {
    id: 13, item_id: 94, title: 'Brass', assigned_trade_code: 20044, status: 4,
    via_meeting: true, location: 3, lane_destination: 3, origin_location: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockGetBox.mockResolvedValue(reopenedToAmba);
    mockListBoxes.mockResolvedValue([reopenedToAmba, { ...otherBox, math_items: [brass] }]);
    mockListItems.mockResolvedValue([heat, brass]);
  });

  it('typing the code of a loose copy and Enter adds it, reloads and keeps the focus', async () => {
    (boxApi.addItem as jest.Mock).mockResolvedValue({ ...reopenedToAmba, math_items: [...reopenedToAmba.math_items, heat] });
    render(<IncomingBoxPage />, { wrapper });

    const input = await screen.findByLabelText('Código de la etiqueta');
    await waitFor(() => expect(mockListItems).toHaveBeenCalled());
    fireEvent.change(input, { target: { value: '#20043' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => expect(boxApi.addItem).toHaveBeenCalledWith(392, 12));
    expect(await screen.findByRole('status')).toHaveTextContent('Agregado: 20043 · Heat');
    await waitFor(() => expect(mockGetBox).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Código de la etiqueta')).toHaveValue('');
    expect(screen.getByLabelText('Código de la etiqueta')).toHaveFocus();
  });

  it('a copy already in another open box shows where it is without calling the API', async () => {
    render(<IncomingBoxPage />, { wrapper });

    const input = await screen.findByLabelText('Código de la etiqueta');
    await waitFor(() => expect(mockListItems).toHaveBeenCalled());
    fireEvent.change(input, { target: { value: '20044' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese juego ya está en la caja #18.');
    expect(boxApi.addItem).not.toHaveBeenCalled();
  });

  it('the title list of Agregar juegos still adds a copy', async () => {
    render(<IncomingBoxPage />, { wrapper });

    const add = await screen.findByRole('button', { name: 'Agregar juegos' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Heat/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar (1)' }));
    await waitFor(() => expect(boxApi.addItem).toHaveBeenCalledWith(392, 12));
  });
});

// Rule: in a rebuilt box a batch adds what it can; the screen then shows the
// real box and which games did not go in and why. Load failures are shown
// with a way to retry, never swallowed.
describe('IncomingBoxPage rebuilt box: batch add with a partial failure and visible load errors', () => {
  const reopened = {
    id: 392,
    number: 17,
    origin: 8,
    origin_name: 'Salta',
    destiny: 1,
    destination_name: 'AMBA',
    lane_destination: 1,
    closed_at: null,
    tracking: 'VC-10',
    math_items: [] as unknown[],
  };
  const loose = (id: number, code: number, title: string) => ({
    id, item_id: 90 + id, title, assigned_trade_code: code, status: 4,
    via_meeting: true, location: 3, lane_destination: 3, origin_location: 8,
  });
  const catan = loose(21, 101, 'Catan');
  const azul = loose(22, 102, 'Azul');
  const titulo = loose(23, 103, 'Titulo');
  // The automocked module keeps the class prototype, so instanceof works.
  const boxError = (message: string, status: number) =>
    Object.assign(Object.create(boxApi.BoxApiError.prototype), { message, status, body: { detail: message } });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockGetBox.mockResolvedValue(reopened);
    mockListBoxes.mockResolvedValue([reopened]);
    mockListItems.mockResolvedValue([catan, azul, titulo]);
  });

  it('shows which game failed and why, reloads the box and keeps only the failed one selected', async () => {
    mockGetBox.mockResolvedValueOnce(reopened).mockResolvedValue({ ...reopened, math_items: [catan, azul] });
    (boxApi.addItem as jest.Mock)
      .mockResolvedValueOnce({ ...reopened, math_items: [catan] })
      .mockRejectedValueOnce(boxError('Trade is already in another box.', 409))
      .mockResolvedValueOnce({ ...reopened, math_items: [catan, azul] });
    // Order of the POSTs follows the selection: Catan, Titulo, Azul.

    render(<IncomingBoxPage />, { wrapper });
    const add = await screen.findByRole('button', { name: 'Agregar juegos' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Catan/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Titulo/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Azul/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar (3)' }));

    expect(await screen.findByText('Se agregaron 2 juegos. No se pudieron agregar:')).toBeInTheDocument();
    expect(screen.getByText('00103 · Titulo: Ese juego ya está en otra caja.')).toBeInTheDocument();
    expect(boxApi.addItem).toHaveBeenCalledTimes(3);
    expect(mockGetBox).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(await screen.findByRole('button', { name: 'Agregar (1)' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Titulo/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('if the boxes and games of the destination fail to load, it says so with Reintentar', async () => {
    mockListBoxes
      .mockRejectedValueOnce(new Error('No hay conexión o el servidor tardó demasiado. Probá de nuevo.'))
      .mockResolvedValue([reopened]);

    render(<IncomingBoxPage />, { wrapper });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No hay conexión o el servidor tardó demasiado. Probá de nuevo.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(mockListBoxes).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('if reloading the box fails, the rebuilt box shows the error with Reintentar', async () => {
    mockGetBox
      .mockResolvedValueOnce(reopened)
      .mockRejectedValueOnce(new Error('No hay conexión o el servidor tardó demasiado. Probá de nuevo.'))
      .mockResolvedValue({ ...reopened, math_items: [catan] });
    (boxApi.addItem as jest.Mock).mockResolvedValue({ ...reopened, math_items: [catan] });

    render(<IncomingBoxPage />, { wrapper });
    const add = await screen.findByRole('button', { name: 'Agregar juegos' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Catan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar (1)' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No hay conexión o el servidor tardó demasiado. Probá de nuevo.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(mockGetBox).toHaveBeenCalledTimes(3));
    expect(await screen.findByText(/00101 · Catan/)).toBeInTheDocument();
  });
});

describe('a network error in a list can be retried without leaving the screen', () => {
  const offline = 'No hay conexión o el servidor tardó demasiado. Probá de nuevo.';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false, errorEventPhase: null });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
  });

  it('shows the error with "Reintentar", and retrying loads the box games', async () => {
    mockGetBox.mockRejectedValueOnce(new Error(offline)).mockResolvedValue(ambaBox);
    render(<IncomingBoxPage />, { wrapper });

    expect(await screen.findByRole('alert')).toHaveTextContent(offline);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('checkbox', { name: /Catan/ })).toBeInTheDocument();
    expect(mockGetBox).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a failed "Marcar recibidos" is not offered as a reload: no "Reintentar" for it', async () => {
    mockGetBox.mockResolvedValue(ambaBox);
    (boxApi.markItemsReceived as jest.Mock).mockRejectedValueOnce(new Error(offline));
    render(<IncomingBoxPage />, { wrapper });

    fireEvent.click(await screen.findByRole('checkbox', { name: /Earth/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar recibidos (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar (1)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(offline);
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });
});

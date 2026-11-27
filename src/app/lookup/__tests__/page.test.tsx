import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { DeliverTrade, GameBoxInfo, GameCurrentBox, GameDetail, GameSearchResult, ReceiveTrade, TradeResponse } from '@/types';
import { PROBLEMS } from '@/config/problems';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import LookupPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));
jest.mock('@/components/qr/QrScanner', () => ({
  __esModule: true,
  default: ({ onScan }: { onScan: (data: string) => void }) => (
    <button type="button" onClick={() => onScan('uuid-qr')}>Simular escaneo</button>
  ),
}));
jest.mock('@/components/staff/MemberNameSearch', () => ({
  __esModule: true,
  default: ({ onSelect }: { onSelect: (member: { uuid: string; user_id: number; first_name: string; last_name: string }) => void }) => (
    <button type="button" onClick={() => onSelect({ uuid: 'uuid-ana', user_id: 70, first_name: 'Ana', last_name: 'Gomez' })}>
      Elegir Ana
    </button>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;

const user = { id: 70, first_name: 'Ana', last_name: 'Gomez', comment_on_user: 'Trae cajas grandes' };

const receiveResponse: TradeResponse<ReceiveTrade> = {
  user,
  games: [{
    from_member: null,
    to_member: { id: 3, first_name: 'Luis', last_name: 'Diaz' },
    math_item_exchanged: { id: 1, title: 'Catan', assigned_trade_code: 101 },
    result: { table_number: 4, assigned_trade_code: 101, status_display: 'In Event', change_by: user },
  }],
};

const deliverResponse: TradeResponse<DeliverTrade> = {
  user,
  games: [{
    from_member: { id: 5, first_name: 'Juan', last_name: 'Perez' },
    to_member: null,
    math_item_exchanged: { id: 2, title: 'Carcassonne', assigned_trade_code: 202 },
    result: { table_number: 'B', assigned_trade_code: 202, status_display: 'Delivered', change_by: user },
  }],
};

const game: GameDetail = {
  id: 9,
  assigned_trade_code: 303,
  item_to: { id: 3, title: 'Azul', assigned_trade_code: 303 },
  membership: { id: 1, first_name: 'Juan', last_name: 'Perez' },
  member_to: { id: 2, first_name: 'Ana', last_name: 'Gomez' },
  table_number: 7,
  status: 5,
  change_by: null,
};

let memberExecute: jest.Mock;
let gameExecute: jest.Mock;
let historyExecute: jest.Mock;
let fetchSpy: jest.Mock;

describe('LookupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    memberExecute = jest.fn((_body: unknown, path: string) =>
      Promise.resolve(path.endsWith('/games/receive/') ? receiveResponse : deliverResponse));
    gameExecute = jest.fn().mockResolvedValue(game);
    historyExecute = jest.fn().mockResolvedValue({ results: [], truncated: false });
    mockUseApi.mockImplementation((endpoint: string) => {
      if (endpoint === 'logistics/') return { execute: historyExecute };
      if (endpoint === 'logistics/game/') return { execute: gameExecute };
      return { execute: memberExecute };
    });
  });

  afterEach(() => {
    // Read-only page: no hook is ever set up for PATCH and fetch never sees one.
    for (const [, options] of mockUseApi.mock.calls) {
      expect(options?.method ?? 'GET').toBe('GET');
    }
    for (const [, init] of fetchSpy.mock.calls) {
      expect(init?.method ?? 'GET').not.toBe('PATCH');
    }
  });

  it('loads both lists of a selected participant with table and status', async () => {
    render(<LookupPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(memberExecute).toHaveBeenCalledWith(undefined, 'uuid-ana/games/receive/');
    expect(memberExecute).toHaveBeenCalledWith(undefined, 'uuid-ana/games/deliver/');
    expect(screen.getByText('Trae cajas grandes')).toBeInTheDocument();

    expect(screen.getByText('Trae / entrega (1)')).toBeInTheDocument();
    expect(screen.getByText('Catan')).toBeInTheDocument();
    expect(screen.getByText('00101 · Mesa 4 · En evento')).toBeInTheDocument();
    expect(screen.getByText('Para: Luis Diaz')).toBeInTheDocument();

    expect(screen.getByText('Recibe (1)')).toBeInTheDocument();
    expect(screen.getByText('Carcassonne')).toBeInTheDocument();
    expect(screen.getByText('00202 · Mesa B · Entregado a Usuario')).toBeInTheDocument();
    expect(screen.getByText('De: Juan Perez')).toBeInTheDocument();
  });

  it('shows empty states when the participant has no games', async () => {
    memberExecute.mockImplementation(() => Promise.resolve({ user, games: [] }));
    render(<LookupPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));

    expect(await screen.findByText('No trae juegos.')).toBeInTheDocument();
    expect(screen.getByText('No recibe juegos.')).toBeInTheDocument();
  });

  it('loads a participant from a QR scan and from ?qr=', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('qr=uuid-url'));
    render(<LookupPage />);

    await waitFor(() => expect(memberExecute).toHaveBeenCalledWith(undefined, 'uuid-url/games/receive/'));
    expect(memberExecute).toHaveBeenCalledWith(undefined, 'uuid-url/games/deliver/');
    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Escanear QR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simular escaneo' }));
    await waitFor(() => expect(memberExecute).toHaveBeenCalledWith(undefined, 'uuid-qr/games/receive/'));
    expect(memberExecute).toHaveBeenCalledWith(undefined, 'uuid-qr/games/deliver/');
  });

  it('searches a code and renders the game detail', async () => {
    render(<LookupPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Juego' }));
    fireEvent.change(screen.getByLabelText('Buscar juego por título o código'), { target: { value: ' 303 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Azul')).toBeInTheDocument();
    expect(gameExecute).toHaveBeenCalledWith(undefined, '303/detail/');
    expect(screen.getByText('00303 · Mesa 7 · En evento')).toBeInTheDocument();
    expect(screen.getByText('Entrega: Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Recibe: Ana Gomez')).toBeInTheDocument();
  });

  it('shows the error when the code is not found', async () => {
    gameExecute.mockRejectedValue(new Error('Trade con el código asignado no encontrado.'));
    render(<LookupPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Juego' }));
    fireEvent.change(screen.getByLabelText('Buscar juego por título o código'), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Trade con el código asignado no encontrado.')).toBeInTheDocument();
  });

  it('opens in Juego with its question when ?mode=game', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('mode=game'));
    render(<LookupPage />);

    expect(screen.getByRole('heading', { level: 2, name: '¿Dónde está un juego?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juego' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Buscar juego por título o código')).toBeInTheDocument();
  });

  it('opens in Participante with its question when ?mode=participant', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('mode=participant'));
    render(<LookupPage />);

    expect(screen.getByRole('heading', { level: 2, name: '¿No tiene etiqueta o no se lee?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Participante' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Elegir Ana' })).toBeInTheDocument();
  });

  it('shows no question header without ?mode=', () => {
    render(<LookupPage />);

    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Participante' })).toHaveAttribute('aria-pressed', 'true');
  });

  describe('Juego: title search and "Dónde está"', () => {
    const box = (overrides: Partial<GameBoxInfo>): GameBoxInfo => ({
      id: 1,
      number: 12,
      origin_id: 4,
      origin_name: 'Córdoba',
      destination_id: 1,
      destination_name: 'AMBA',
      closed: true,
      has_tracking: true,
      opened: false,
      item_count: 8,
      received_count: 3,
      ...overrides,
    });

    const matches: GameSearchResult[] = [
      {
        assigned_trade_code: 303, title: 'Azul', giver_first_name: 'Juan', giver_last_name: 'Perez',
        receiver_first_name: 'Ana', receiver_last_name: 'Gomez', status: 5, status_display: 'In Event',
      },
      {
        assigned_trade_code: 404, title: 'Azul: Pabellón', giver_first_name: 'Eva', giver_last_name: 'Ruiz',
        receiver_first_name: 'Luis', receiver_last_name: 'Diaz', status: 2, status_display: 'Transit to Event',
      },
    ];

    const routeGame = (detail: GameDetail, results: GameSearchResult[] = matches) => {
      gameExecute.mockImplementation((_body: unknown, path: string) =>
        Promise.resolve(path.startsWith('search/') ? results : detail));
    };

    const search = (text: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Juego' }));
      fireEvent.change(screen.getByLabelText('Buscar juego por título o código'), { target: { value: text } });
      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    };

    it('searches by title, lists the matches and opens the detail on tap', async () => {
      routeGame({ ...game, giver_attends_event: false, boxes: [] });
      render(<LookupPage />);

      search('azúl ');

      const list = await screen.findByRole('list', { name: 'Juegos encontrados' });
      expect(gameExecute).toHaveBeenCalledWith(undefined, `search/?q=${encodeURIComponent('azúl')}`);
      expect(within(list).getByText('Azul')).toBeInTheDocument();
      expect(within(list).getByText('Entrega: Juan Perez · Recibe: Ana Gomez')).toBeInTheDocument();
      expect(within(list).getByText('En evento')).toBeInTheDocument();
      expect(within(list).getByText('Azul: Pabellón')).toBeInTheDocument();
      expect(within(list).getByText('Entrega: Eva Ruiz · Recibe: Luis Diaz')).toBeInTheDocument();
      expect(within(list).getByText('En viaje al evento')).toBeInTheDocument();

      fireEvent.click(within(list).getByRole('button', { name: /Azul: Pabellón/ }));

      expect(await screen.findByText('00303 · Mesa 7 · En evento')).toBeInTheDocument();
      expect(gameExecute).toHaveBeenCalledWith(undefined, '404/detail/');
      expect(screen.queryByRole('list', { name: 'Juegos encontrados' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Volver a los resultados' }));
      expect(screen.getByRole('list', { name: 'Juegos encontrados' })).toBeInTheDocument();
    });

    it('needs at least 2 letters and does not search on each keystroke', async () => {
      render(<LookupPage />);

      fireEvent.click(screen.getByRole('button', { name: 'Juego' }));
      fireEvent.change(screen.getByLabelText('Buscar juego por título o código'), { target: { value: 'Az' } });
      expect(gameExecute).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText('Buscar juego por título o código'), { target: { value: 'a' } });
      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
      expect(await screen.findByText('Escribí al menos 2 letras del título.')).toBeInTheDocument();
      expect(gameExecute).not.toHaveBeenCalled();
    });

    it('shows an empty state when no title matches', async () => {
      routeGame(game, []);
      render(<LookupPage />);

      search('zzz');

      expect(await screen.findByText('No hay juegos con “zzz” en el título.')).toBeInTheDocument();
    });

    it('shows the error when the title search fails', async () => {
      gameExecute.mockRejectedValue(new Error('El servidor respondió con un error (500).'));
      render(<LookupPage />);

      search('Azul');

      expect(await screen.findByText('El servidor respondió con un error (500).')).toBeInTheDocument();
    });

    it('goes straight to the detail for a label code, without a title search', async () => {
      routeGame(game);
      render(<LookupPage />);

      search('#00303');

      expect(await screen.findByText('00303 · Mesa 7 · En evento')).toBeInTheDocument();
      expect(gameExecute).toHaveBeenCalledTimes(1);
      expect(gameExecute).toHaveBeenCalledWith(undefined, '303/detail/');
    });

    it('does not show "Dónde está" when the backend does not send the new fields', async () => {
      routeGame(game);
      render(<LookupPage />);

      search('303');

      expect(await screen.findByText('Recibe: Ana Gomez')).toBeInTheDocument();
      expect(screen.queryByText('Dónde está')).not.toBeInTheDocument();
      expect(screen.queryByText('No está en ninguna caja')).not.toBeInTheDocument();
    });

    it('says who brings it when the giver attends, and that it arrived', async () => {
      routeGame({ ...game, status: 5, giver_attends_event: true, giver_location_name: 'AMBA', boxes: [] });
      render(<LookupPage />);

      search('303');

      expect(await screen.findByText('Dónde está')).toBeInTheDocument();
      expect(screen.getByText('Lo trae Juan Perez (AMBA)')).toBeInTheDocument();
      expect(screen.getByText('Ya llegó al evento')).toBeInTheDocument();
      expect(screen.queryByText('No está en ninguna caja')).not.toBeInTheDocument();
    });

    it('does not say it arrived while an attendee has not brought it yet', async () => {
      routeGame({ ...game, status: 1, giver_attends_event: true, boxes: [] });
      render(<LookupPage />);

      search('303');

      expect(await screen.findByText('Lo trae Juan Perez (AMBA)')).toBeInTheDocument();
      expect(screen.queryByText('Ya llegó al evento')).not.toBeInTheDocument();
    });

    it('says it is in no box when the giver does not attend and there is no box', async () => {
      routeGame({ ...game, giver_attends_event: false, giver_location_name: 'Córdoba', boxes: [] });
      render(<LookupPage />);

      search('303');

      expect(await screen.findByText('No está en ninguna caja')).toBeInTheDocument();
    });

    it.each([
      ['opened', box({ opened: true, received_count: 8 }), 'Ya se abrió', false],
      ['closed, not opened', box({}), 'Sin abrir', true],
      ['not closed', box({ closed: false, has_tracking: false, number: 7 }), 'En armado', true],
      ['from AMBA, sent', box({ origin_id: 1, origin_name: 'AMBA', destination_id: 4, destination_name: 'Córdoba', opened: true }), 'Armada en AMBA, enviada', false],
      ['from AMBA, not sent', box({ origin_id: 1, origin_name: 'AMBA', destination_id: 4, destination_name: 'Córdoba', has_tracking: false, opened: true }), 'Armada en AMBA, sin enviar', false],
    ])('shows the chip of a box that is %s', async (_state, theBox, chip, showsReceived) => {
      routeGame({ ...game, giver_attends_event: false, boxes: [theBox] });
      render(<LookupPage />);

      search('303');

      expect(await screen.findByText(chip)).toBeInTheDocument();
      expect(screen.getByText(`Caja #${theBox.number} de ${theBox.origin_name} a ${theBox.destination_name}`)).toBeInTheDocument();
      if (showsReceived) {
        expect(screen.getByText(`${theBox.received_count} de ${theBox.item_count} juegos recibidos`)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(/juegos recibidos/)).not.toBeInTheDocument();
      }
    });

    it('lists every box and names an unnumbered one "Caja en armado" (no #)', async () => {
      routeGame({
        ...game,
        giver_attends_event: false,
        boxes: [
          box({ id: 1, opened: true }),
          box({ id: 2, number: null, origin_id: 1, origin_name: 'AMBA', destination_id: 4, destination_name: 'Córdoba', closed: false, has_tracking: false }),
        ],
      });
      render(<LookupPage />);

      search('303');

      expect(await screen.findByText('Caja #12 de Córdoba a AMBA')).toBeInTheDocument();
      expect(screen.getByText('Ya se abrió')).toBeInTheDocument();
      expect(screen.getByText('Caja en armado de AMBA a Córdoba')).toBeInTheDocument();
      expect(screen.queryByText(/#en armado/)).not.toBeInTheDocument();
      expect(screen.getByText('En armado')).toBeInTheDocument();
    });

    it('hints that a game can be found by title or label code', () => {
      expect(PROBLEMS.find((p) => p.id === 'where-is-game')?.hint).toBe('Buscalo por el título o por el código de la etiqueta');
    });
  });
  describe('Juego: historial (admin)', () => {
    const searchCode = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Juego' }));
      fireEvent.change(screen.getByLabelText('Buscar juego por título o código'), { target: { value: '303' } });
      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    };

    it('loads the history only when opened and shows "previous → current" with actor and date', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
      historyExecute.mockResolvedValue({
        results: [
          { id: 3, status: 6, status_display: 'Delivered', actor: { id: 1, name: 'Ana Gomez' }, at: '2026-11-26T15:30:00Z' },
          { id: 2, status: 5, status_display: 'In Event', actor: { id: 2, name: 'Luis Diaz' }, at: '2026-11-26T14:00:00Z' },
          { id: 1, status: 2, status_display: 'Transit to Event', actor: null, at: '2026-11-25T10:00:00Z' },
        ],
        truncated: false,
      });
      render(<LookupPage />);
      searchCode();

      const button = await screen.findByRole('button', { name: 'Ver historial' });
      expect(historyExecute).not.toHaveBeenCalled();
      fireEvent.click(button);
      expect(historyExecute).toHaveBeenCalledWith(undefined, 'game/303/history/');

      expect(await screen.findByText('En evento → Entregado a Usuario')).toBeInTheDocument();
      expect(screen.getByText('En viaje al evento → En evento')).toBeInTheDocument();
      expect(screen.getByText('En viaje al evento')).toBeInTheDocument();
      expect(screen.getByText(/^Ana Gomez · /)).toBeInTheDocument();
      expect(screen.getByText(/^Luis Diaz · /)).toBeInTheDocument();
      expect(screen.getByText(/^Alguien \(sin nombre\) · /)).toBeInTheDocument();
    });

    it('does not show the history to a non admin', async () => {
      render(<LookupPage />);
      searchCode();
      expect(await screen.findByText('Azul')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ver historial' })).not.toBeInTheDocument();
    });

    it('shows a notice on a 404 and keeps the game card', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
      historyExecute.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
      render(<LookupPage />);
      searchCode();
      fireEvent.click(await screen.findByRole('button', { name: 'Ver historial' }));

      expect(await screen.findByText(/El historial todavía no está disponible/)).toBeInTheDocument();
      expect(screen.getByText('Azul')).toBeInTheDocument();
      expect(screen.getByText('00303 · Mesa 7 · En evento')).toBeInTheDocument();
    });

    it('says there are more rows when the response is truncated', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
      historyExecute.mockResolvedValue({
        results: [{ id: 1, status: 5, status_display: 'In Event', actor: { id: 1, name: 'Ana Gomez' }, at: '2026-11-26T15:30:00Z' }],
        truncated: true,
      });
      render(<LookupPage />);
      searchCode();
      fireEvent.click(await screen.findByRole('button', { name: 'Ver historial' }));
      expect(await screen.findByText(/Hay más movimientos/)).toBeInTheDocument();
    });
  });

  describe('Participante: historial (admin)', () => {
    const asAdmin = () => mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    const rows = {
      results: [
        { id: 4, status: 6, status_display: 'Delivered', actor: { id: 1, name: 'Luis Diaz' }, at: '2026-11-26T16:00:00Z',
          trade_id: 20, trade_code: 202, game_title: 'Carcassonne', role: 'receives' },
        { id: 3, status: 5, status_display: 'In Event', actor: { id: 2, name: 'Eva Ruiz' }, at: '2026-11-26T15:00:00Z',
          trade_id: 10, trade_code: 101, game_title: 'Catan', role: 'gives' },
        { id: 2, status: 5, status_display: 'In Event', actor: null, at: '2026-11-26T14:00:00Z',
          trade_id: 20, trade_code: 202, game_title: 'Carcassonne', role: 'receives' },
        { id: 1, status: 2, status_display: 'Transit to Event', actor: null, at: '2026-11-25T10:00:00Z',
          trade_id: 10, trade_code: 101, game_title: null, role: 'gives' },
      ],
      truncated: false,
    };

    it('loads the history of the selected participant only when opened, with role and previous status per game', async () => {
      asAdmin();
      historyExecute.mockResolvedValue(rows);
      render(<LookupPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));

      const button = await screen.findByRole('button', { name: 'Ver historial' });
      expect(historyExecute).not.toHaveBeenCalled();
      fireEvent.click(button);
      expect(historyExecute).toHaveBeenCalledWith(undefined, 'user/uuid-ana/history/');

      expect(await screen.findByText('Recibe: En evento → Entregado a Usuario')).toBeInTheDocument();
      expect(screen.getByText('Entrega: En viaje al evento → En evento')).toBeInTheDocument();
      expect(screen.getByText('Recibe: En evento')).toBeInTheDocument();
      expect(screen.getByText('Entrega: En viaje al evento')).toBeInTheDocument();
      expect(screen.getAllByText('Carcassonne (00202)')).toHaveLength(2);
      expect(screen.getByText('Catan (00101)')).toBeInTheDocument();
      expect(screen.getByText('Sin título (00101)')).toBeInTheDocument();
      expect(screen.getByText(/^Luis Diaz · /)).toBeInTheDocument();
      expect(screen.getByText(/Los cambios de asistencia .* no se registran/)).toBeInTheDocument();
    });

    it('shows its own empty text', async () => {
      asAdmin();
      render(<LookupPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Ver historial' }));
      expect(await screen.findByText('No hay movimientos registrados de sus juegos.')).toBeInTheDocument();
    });

    it('does not show the history to a non admin', async () => {
      render(<LookupPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));
      expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ver historial' })).not.toBeInTheDocument();
    });

    it('works for a participant opened with ?qr=', async () => {
      asAdmin();
      mockUseSearchParams.mockReturnValue(new URLSearchParams('qr=uuid-url'));
      render(<LookupPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Ver historial' }));
      expect(historyExecute).toHaveBeenCalledWith(undefined, 'user/uuid-url/history/');
      expect(await screen.findByText('No hay movimientos registrados de sus juegos.')).toBeInTheDocument();
    });

    it('shows a notice on a 404 and keeps both lists', async () => {
      asAdmin();
      historyExecute.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
      render(<LookupPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Ver historial' }));

      expect(await screen.findByText(/El historial todavía no está disponible/)).toBeInTheDocument();
      expect(screen.getByText('Trae / entrega (1)')).toBeInTheDocument();
      expect(screen.getByText('Recibe (1)')).toBeInTheDocument();
      expect(screen.getByText('Catan')).toBeInTheDocument();
      expect(screen.getByText('Carcassonne')).toBeInTheDocument();
    });

    it('closes the block when another participant is loaded', async () => {
      asAdmin();
      historyExecute.mockResolvedValue(rows);
      render(<LookupPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Ver historial' }));
      expect(await screen.findByText('Catan (00101)')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Escanear QR' }));
      fireEvent.click(screen.getByRole('button', { name: 'Simular escaneo' }));

      await waitFor(() => expect(memberExecute).toHaveBeenCalledWith(undefined, 'uuid-qr/games/receive/'));
      expect(await screen.findByRole('button', { name: 'Ver historial' })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Catan (00101)')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
      expect(historyExecute).toHaveBeenLastCalledWith(undefined, 'user/uuid-qr/history/');
      expect(await screen.findAllByText('Catan (00101)')).not.toHaveLength(0);
    });
  });

  describe('the box a game is in now', () => {
    const cityBox: GameCurrentBox = {
      id: 31, number: 12, origin_id: 4, origin_name: 'Santa Fe',
      destination_id: 1, destination_name: 'AMBA', destination_code: 'AMB', closed: false,
    };
    const hubBox: GameCurrentBox = {
      id: 32, number: 3, origin_id: 1, origin_name: 'AMBA',
      destination_id: 4, destination_name: 'Córdoba', destination_code: 'COR', closed: true,
    };

    const openGame = (text: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Juego' }));
      fireEvent.change(screen.getByLabelText('Buscar juego por título o código'), { target: { value: text } });
      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    };

    it('shows the box of a game in the detail, linked to its screen', async () => {
      gameExecute.mockResolvedValue({ ...game, status: 2, box: cityBox });
      render(<LookupPage />);
      openGame('303');

      const link = await screen.findByRole('link', { name: 'En caja #12 · Santa Fe → AMBA · abierta' });
      expect(link).toHaveAttribute('href', '/boxes/in/4/31');
      expect(screen.getByText('00303 · Mesa 7 · En viaje al evento')).toBeInTheDocument();
    });

    it('shows a box leaving AMBA with its label and no link', async () => {
      gameExecute.mockResolvedValue({ ...game, status: 3, box: hubBox });
      render(<LookupPage />);
      openGame('303');

      expect(await screen.findByText('En caja #COR-3 · AMBA → Córdoba · cerrada')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /En caja/ })).not.toBeInTheDocument();
      expect(screen.getByText('00303 · Mesa 7 · En viaje de vuelta')).toBeInTheDocument();
    });

    it('names an unnumbered box "en armado"', async () => {
      gameExecute.mockResolvedValue({ ...game, status: 4, box: { ...cityBox, number: null, destination_name: 'Salta', destination_id: 9 } });
      render(<LookupPage />);
      openGame('303');

      expect(await screen.findByText('En caja en armado · Santa Fe → Salta · abierta')).toBeInTheDocument();
      expect(screen.getByText('00303 · Mesa 7 · En viaje directo')).toBeInTheDocument();
    });

    it.each([
      ['null', null],
      ['missing (older backend)', undefined],
    ])('shows nothing when box is %s', async (_case, value) => {
      gameExecute.mockResolvedValue({ ...game, box: value });
      render(<LookupPage />);
      openGame('303');

      expect(await screen.findByText('00303 · Mesa 7 · En evento')).toBeInTheDocument();
      expect(screen.queryByText(/En caja/)).not.toBeInTheDocument();
    });

    it('shows the box on the title search results', async () => {
      const results: GameSearchResult[] = [
        {
          assigned_trade_code: 404, title: 'Azul', giver_first_name: 'Eva', giver_last_name: 'Ruiz',
          receiver_first_name: 'Luis', receiver_last_name: 'Diaz', status: 4, status_display: 'Transit Direct',
          box: { ...cityBox, destination_name: 'Salta', destination_id: 9, closed: true },
        },
        {
          assigned_trade_code: 405, title: 'Azul 2', giver_first_name: 'Eva', giver_last_name: 'Ruiz',
          receiver_first_name: 'Luis', receiver_last_name: 'Diaz', status: 1, status_display: 'Created', box: null,
        },
      ];
      gameExecute.mockResolvedValue(results);
      render(<LookupPage />);
      openGame('azul');

      const list = await screen.findByRole('list', { name: 'Juegos encontrados' });
      expect(within(list).getByText('En caja #12 · Santa Fe → Salta · cerrada')).toBeInTheDocument();
      expect(within(list).getAllByText(/En caja/)).toHaveLength(1);
      expect(within(list).getByText('En viaje directo')).toBeInTheDocument();
      expect(within(list).getByText('Creado')).toBeInTheDocument();
    });

    it('shows the box of each game of a participant', async () => {
      memberExecute.mockImplementation((_body: unknown, path: string) => Promise.resolve(
        path.endsWith('/games/receive/')
          ? { ...receiveResponse, games: [{ ...receiveResponse.games[0], result: { ...receiveResponse.games[0].result, status_display: 'Transit to Event' }, box: cityBox }] }
          : { ...deliverResponse, games: [{ ...deliverResponse.games[0], result: { ...deliverResponse.games[0].result, status_display: 'Transit Back' }, box: hubBox }] },
      ));
      render(<LookupPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));

      expect(await screen.findByRole('link', { name: 'En caja #12 · Santa Fe → AMBA · abierta' })).toHaveAttribute('href', '/boxes/in/4/31');
      expect(screen.getByText('En caja #COR-3 · AMBA → Córdoba · cerrada')).toBeInTheDocument();
      expect(screen.getByText('00101 · Mesa 4 · En viaje al evento')).toBeInTheDocument();
      expect(screen.getByText('00202 · Mesa B · En viaje de vuelta')).toBeInTheDocument();
    });

    it('shows no box line for participant games without box', async () => {
      render(<LookupPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Elegir Ana' }));

      expect(await screen.findByText('Catan')).toBeInTheDocument();
      expect(screen.queryByText(/En caja/)).not.toBeInTheDocument();
    });
  });
});

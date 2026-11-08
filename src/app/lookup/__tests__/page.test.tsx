import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { DeliverTrade, GameBoxInfo, GameDetail, GameSearchResult, ReceiveTrade, TradeResponse } from '@/types';
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
    mockUseApi.mockImplementation((endpoint: string) => {
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

    it('lists every box and names an unnumbered one "en armado"', async () => {
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
      expect(screen.getByText('Caja #en armado de AMBA a Córdoba')).toBeInTheDocument();
      expect(screen.getByText('En armado')).toBeInTheDocument();
    });

    it('hints that a game can be found by title or label code', () => {
      expect(PROBLEMS.find((p) => p.id === 'where-is-game')?.hint).toBe('Buscalo por el título o por el código de la etiqueta');
    });
  });
});

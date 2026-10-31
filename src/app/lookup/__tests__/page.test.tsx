import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { DeliverTrade, GameDetail, ReceiveTrade, TradeResponse } from '@/types';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByText('#101 · Mesa 4 · En evento')).toBeInTheDocument();
    expect(screen.getByText('Para: Luis Diaz')).toBeInTheDocument();

    expect(screen.getByText('Recibe (1)')).toBeInTheDocument();
    expect(screen.getByText('Carcassonne')).toBeInTheDocument();
    expect(screen.getByText('#202 · Mesa B · Entregado a Usuario')).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText('Buscar juego por código'), { target: { value: ' 303 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar código' }));

    expect(await screen.findByText('Azul')).toBeInTheDocument();
    expect(gameExecute).toHaveBeenCalledWith(undefined, '303/detail/');
    expect(screen.getByText('#303 · Mesa 7 · En evento')).toBeInTheDocument();
    expect(screen.getByText('Entrega: Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Recibe: Ana Gomez')).toBeInTheDocument();
  });

  it('shows the error when the code is not found', async () => {
    gameExecute.mockRejectedValue(new Error('Trade con el código asignado no encontrado.'));
    render(<LookupPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Juego' }));
    fireEvent.change(screen.getByLabelText('Buscar juego por código'), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar código' }));

    expect(await screen.findByText('Trade con el código asignado no encontrado.')).toBeInTheDocument();
  });
});

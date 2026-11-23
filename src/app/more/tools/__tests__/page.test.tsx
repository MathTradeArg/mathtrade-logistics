import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import type { GameDetail } from '@/types';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ToolsPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');
jest.mock('@/hooks/boxes/boxApi', () => ({
  bulkUpdateTradeStatus: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;

const game: GameDetail = {
  id: 1,
  assigned_trade_code: 123,
  item_to: { id: 1, title: 'Catan', assigned_trade_code: 123 },
  membership: { id: 1, first_name: 'Juan', last_name: 'Perez' },
  member_to: { id: 2, first_name: 'Ana', last_name: 'Gomez' },
  status: 6,
} as GameDetail;

describe('ToolsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApi.mockReturnValue({ execute: jest.fn().mockResolvedValue(game) });
  });

  it('shows the admin-only notice to non-admins and does not search games', () => {
    const execute = jest.fn().mockResolvedValue(game);
    mockUseApi.mockReturnValue({ execute });
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, userId: '1' });
    render(
      <ActionStatusProvider>
        <ToolsPage />
      </ActionStatusProvider>,
    );

    expect(screen.getByText('Esto lo resuelve un organizador. Avisale a uno.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Buscar juego por código')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Buscar código' })).not.toBeInTheDocument();
    expect(execute).not.toHaveBeenCalled();
  });

  it('shows pending rollback for admins', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false, userId: '1' });
    render(
      <ActionStatusProvider>
        <ToolsPage />
      </ActionStatusProvider>,
    );

    fireEvent.change(screen.getByLabelText('Buscar juego por código'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar código' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Volver a pendiente' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Marcar no apareció')).not.toBeInTheDocument();
    expect(screen.queryByText('Interior')).not.toBeInTheDocument();
    expect(mockUseApi).not.toHaveBeenCalledWith('logistics/users/update-status/', expect.anything());
  });

  // Rule: reverting a delivered game (6) to pending only changes its status:
  // the transfer stays (traded, elements belong to the receiver), so warn.
  const searchGame = async (status: number) => {
    mockUseApi.mockReturnValue({ execute: jest.fn().mockResolvedValue({ ...game, status }) });
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false, userId: '1' });
    render(
      <ActionStatusProvider>
        <ToolsPage />
      </ActionStatusProvider>,
    );
    fireEvent.change(screen.getByLabelText('Buscar juego por código'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar código' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Volver a pendiente' }));
    return screen.getByRole('dialog');
  };

  it('reverting a delivered game warns that it does not undo the transfer', async () => {
    const dialog = await searchGame(6);
    expect(dialog).toHaveTextContent(
      'esto no deshace el traspaso (el juego sigue marcado como intercambiado y los elementos quedan del receptor)',
    );
  });

  it('reverting a game En evento keeps the usual text', async () => {
    const dialog = await searchGame(5);
    expect(dialog).toHaveTextContent('Vas a volver este juego a pendiente.');
    expect(dialog).not.toHaveTextContent('traspaso');
  });
});

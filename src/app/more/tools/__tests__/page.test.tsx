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
jest.mock('@/components/staff/MemberNameSearch', () => ({
  __esModule: true,
  default: () => <div>Buscar socio</div>,
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

  it('does not show pending rollback for volunteers on a delivered game', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, userId: '1' });
    render(
      <ActionStatusProvider>
        <ToolsPage />
      </ActionStatusProvider>,
    );

    fireEvent.change(screen.getByLabelText('Buscar juego por código'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar código' }));

    await waitFor(() => {
      expect(screen.getByText(/#123/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Volver a pendiente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar entregado' })).not.toBeInTheDocument();
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
  });
});

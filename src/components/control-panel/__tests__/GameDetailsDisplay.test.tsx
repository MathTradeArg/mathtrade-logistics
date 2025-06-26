import { GameDetail, GameStatusCode } from '@/types';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { GameDetailsDisplay } from '../GameDetailsDisplay';

describe('GameDetailsDisplay', () => {
  const mockOnGameAction = jest.fn();

  const baseGameDetail: GameDetail = {
    id: 1,
    assigned_trade_code: 12345,
    item_to: { id: 101, title: 'Catan', assigned_trade_code: 12345 },
    membership: { id: 202, first_name: 'Juan', last_name: 'Perez' },
    status: 4 as GameStatusCode,
    table_number: 'Mesa 5',
    change_by: { id: 303, first_name: 'Admin', last_name: 'User' },
    member_to: { id: 404, first_name: 'Ana', last_name: 'Gomez' },
  };

  const defaultProps = {
    gameDetail: baseGameDetail,
    isAdmin: false,
    isPerformingGameAction: false,
    actionsDisabledByPhase: false,
    gameActionSuccess: null,
    gameActionError: null,
    onGameAction: mockOnGameAction,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('renders game details correctly', () => {
    render(<GameDetailsDisplay {...defaultProps} />);
    expect(screen.getByText('Catan')).toBeInTheDocument();
    expect(screen.getByText('ID:')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('De:')).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Estado:')).toBeInTheDocument();
    expect(screen.getByText('En evento')).toBeInTheDocument();
    expect(screen.getByText('Ubicación:')).toBeInTheDocument();
    expect(screen.getByText('Mesa 5')).toBeInTheDocument();
    expect(screen.getByText('Último cambio por:')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('does not render location or last change if not available', () => {
    const gameDetailWithoutExtras = {
      ...baseGameDetail,
      table_number: null,
      change_by: null
    };
    render(<GameDetailsDisplay {...defaultProps} gameDetail={gameDetailWithoutExtras as unknown as GameDetail} />);
    expect(screen.queryByText('Ubicación:')).not.toBeInTheDocument();
    expect(screen.queryByText('Último cambio por:')).not.toBeInTheDocument();
  });

  it('does not render admin actions if isAdmin is false', () => {
    render(<GameDetailsDisplay {...defaultProps} isAdmin={false} />);
    expect(screen.queryByText('Acciones sobre el juego')).not.toBeInTheDocument();
  });

  it('renders admin actions if isAdmin is true', () => {
    render(<GameDetailsDisplay {...defaultProps} isAdmin={true} />);
    expect(screen.getByText('Cambiar estado de juego')).toBeInTheDocument();
  });

  describe('Admin Actions Button Logic', () => {
    it('shows correct buttons for status 4 (En viaje)', () => {
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} gameDetail={{ ...baseGameDetail, status: 4 }} />);
      expect(screen.getAllByRole('button', { name: 'En evento' })[0]).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entregado' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Pendiente' })).not.toBeInTheDocument();
    });

    it('shows correct buttons for status 5 (En evento)', () => {
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} gameDetail={{ ...baseGameDetail, status: 5 }} />);
      expect(screen.queryAllByRole('button', { name: 'En evento' })).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Entregado' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pendiente' })).toBeInTheDocument();
    });

    it('shows correct buttons for status 6 (Entregado a Usuario)', () => {
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} gameDetail={{ ...baseGameDetail, status: 6 }} />);
      expect(screen.queryAllByRole('button', { name: 'Entregado' })).toHaveLength(0);
      expect(screen.getAllByRole('button', { name: 'Pendiente' })[0]).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'En evento' })[0]).toBeInTheDocument();
    });

    it('calls onGameAction with correct parameters when an action is confirmed', () => {
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} />);
      const receiveButton = screen.getAllByRole('button', { name: 'En evento' })[0];
      fireEvent.click(receiveButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnGameAction).toHaveBeenCalledWith(12345, 5);
    });

    it('does not call onGameAction when an action is cancelled', () => {
      jest.spyOn(window, 'confirm').mockImplementation(() => false);
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} />);
      const receiveButton = screen.getAllByRole('button', { name: 'En evento' })[0];
      fireEvent.click(receiveButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnGameAction).not.toHaveBeenCalled();
    });

    it('disables buttons when isPerformingGameAction is true', () => {
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} isPerformingGameAction={true} />);
      expect(screen.getAllByRole('button', { name: 'En evento' })[0]).toBeDisabled();
      expect(screen.getAllByRole('button', { name: 'Entregado' })[0]).toBeDisabled();
    });

    it('disables buttons when actionsDisabledByPhase is true', () => {
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} actionsDisabledByPhase={true} />);
      expect(screen.getAllByRole('button', { name: 'En evento' })[0]).toBeDisabled();
      expect(screen.getAllByRole('button', { name: 'Entregado' })[0]).toBeDisabled();
    });

    it('displays loading spinner when performing an action', () => {
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} isPerformingGameAction={true} />);
      expect(screen.getByText('Procesando...')).toBeInTheDocument();
    });

    it('displays success message', () => {
      const successMessage = '¡Estado actualizado!';
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} gameActionSuccess={successMessage} />);
      expect(screen.getByText(successMessage)).toBeInTheDocument();
    });

    it('displays error message', () => {
      const errorMessage = 'Hubo un error.';
      render(<GameDetailsDisplay {...defaultProps} isAdmin={true} gameActionError={errorMessage} />);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

})
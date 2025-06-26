import { useControlPanel } from '@/contexts/ControlPanelContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { GameStatusCode } from '@/types';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ControlPanelModal from '../ControlPanelModal';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/contexts/ControlPanelContext');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/useAuth');
jest.mock('@/components/control-panel/GameDetailsDisplay', () => ({
  GameDetailsDisplay: (props: any) => (
    <div data-testid="game-details-display">
      <button onClick={() => props.onGameAction(123, 5)}>Perform Game Action</button>
      {props.isPerformingGameAction && <span>Procesando...</span>}
      {props.gameActionError && <p>{props.gameActionError}</p>}
    </div>
  ),
}));

const mockUseControlPanel = useControlPanel as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

describe('ControlPanelModal', () => {
  const mockOnClose = jest.fn();

  const defaultControlPanelContext = {
    gameDetail: null,
    isLoading: false,
    error: null,
    updateGameStatus: jest.fn().mockResolvedValue({ success: true }),
    gameActionLoading: false,
    gameActionError: null,
  };

  const defaultEventPhaseContext = {
    eventPhase: 1,
    updateEventPhase: jest.fn().mockResolvedValue({ success: true, message: 'Phase updated' }),
  };

  const defaultAuthContext = {
    isHighContrast: false,
    toggleHighContrast: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseControlPanel.mockReturnValue(defaultControlPanelContext);
    mockUseEventPhase.mockReturnValue(defaultEventPhaseContext);
    mockUseAuth.mockReturnValue(defaultAuthContext);
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(<ControlPanelModal isOpen={false} onClose={mockOnClose} isAdmin={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when isOpen is true', () => {
    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={false} />);
    expect(screen.getByText('Panel de Control')).toBeInTheDocument();
  });

  it('calls onClose with false when close button is clicked and no action was successful', () => {
    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={false} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockOnClose).toHaveBeenCalledWith(false);
  });

  it('displays loading spinner when searching for a game', () => {
    mockUseControlPanel.mockReturnValue({ ...defaultControlPanelContext, isLoading: true });
    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={false} />);
    expect(screen.getByText('Buscando juego...')).toBeInTheDocument();
  });

  it('displays search error message', () => {
    const errorMessage = 'Game not found';
    mockUseControlPanel.mockReturnValue({ ...defaultControlPanelContext, error: errorMessage });
    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={false} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays GameDetailsDisplay when gameDetail is available', () => {
    const gameDetail = {
      id: 1,
      assigned_trade_code: 123,
      item_to: { id: 1, title: 'Test Game' },
      membership: { id: 1, first_name: 'John', last_name: 'Doe' },
      status: 4 as GameStatusCode,
      table_number: 'A1',
      change_by: { id: 2, first_name: 'Admin', last_name: 'User' },
    };
    mockUseControlPanel.mockReturnValue({ ...defaultControlPanelContext, gameDetail });
    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={false} />);
    expect(screen.getByTestId('game-details-display')).toBeInTheDocument();
  });

  it('does not render AdminSection if user is not admin', () => {
    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={false} />);
    expect(screen.queryByText('Acciones de Administrador')).not.toBeInTheDocument();
  });

  it('renders AdminSection if user is admin', () => {
    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={true} />);
    expect(screen.getByText('Acciones de Administrador')).toBeInTheDocument();
  });

  it('calls updateGameStatus and onClose with true after a successful game action', async () => {
  const mockOnClose = jest.fn(); 
  const updateGameStatusMock = jest.fn().mockResolvedValue({ success: true });

  const gameDetail = {
    id: 1, assigned_trade_code: 123, item_to: { id: 1, title: 'Test Game' },
    membership: { id: 1, first_name: 'John', last_name: 'Doe' }, status: 4 as GameStatusCode,
  };

  mockUseControlPanel.mockReturnValue({
    ...defaultControlPanelContext,
    gameDetail,
    updateGameStatus: updateGameStatusMock,
  });

  render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={true} />);

  fireEvent.click(screen.getByText('Perform Game Action'));

  await waitFor(() => {
    expect(updateGameStatusMock).toHaveBeenCalledWith(123, 5);
  });

  const closeButton = screen.getAllByRole('button')[0];
  fireEvent.click(closeButton);

  await waitFor(() => {
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });
});

  it('calls updateEventPhase and onClose with true after a successful phase change', async () => {
    const mockUpdateEventPhase = jest.fn().mockResolvedValue({ success: true, message: 'Phase updated' });
    const mockOnClose = jest.fn();

    mockUseEventPhase.mockReturnValue({
      ...defaultEventPhaseContext,
      updateEventPhase: mockUpdateEventPhase,
    });

    window.confirm = jest.fn(() => true);

    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={true} />);

    const phaseButton = screen.getByRole('button', { name: 'Entrega' });
    fireEvent.click(phaseButton);

    await waitFor(() => {
      expect(mockUpdateEventPhase).toHaveBeenCalledWith(2);
    });

    const closeButton = screen.getAllByRole('button')[0];
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith(true);
    });
  });

  it('displays an error message when updateGameStatus fails', async () => {
    const errorMessage = 'Failed to update status';
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    const updateGameStatusMock = jest.fn().mockRejectedValue(new Error(errorMessage));

    const gameDetail = {
      id: 1, assigned_trade_code: 123, item_to: { id: 1, title: 'Test Game' },
      membership: { id: 1, first_name: 'John', last_name: 'Doe' }, status: 4 as GameStatusCode,
    };

    mockUseControlPanel.mockReturnValue({
      ...defaultControlPanelContext,
      gameDetail,
      gameActionError: errorMessage,
      updateGameStatus: updateGameStatusMock, 
    });

    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={true} />);

    fireEvent.click(screen.getByText('Perform Game Action'));

    await waitFor(() => {
      expect(updateGameStatusMock).toHaveBeenCalled();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('displays an error message when updateEventPhase fails', async () => {
    const errorMessage = 'Failed to update phase';
    const updateEventPhaseMock = jest.fn().mockResolvedValue({ success: false, message: errorMessage });
    mockUseEventPhase.mockReturnValue({
      ...defaultEventPhaseContext,
      updateEventPhase: updateEventPhaseMock,
    });

    window.confirm = jest.fn(() => true);

    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrega' }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays a loading spinner when updating game status', async () => {
    const gameDetail = {
      id: 1, assigned_trade_code: 123, item_to: { id: 1, title: 'Test Game' }, membership: { id: 1, first_name: 'John', last_name: 'Doe' }, status: 4 as GameStatusCode, table_number: 'A1', change_by: { id: 2, first_name: 'Admin', last_name: 'User' },
    };
    mockUseControlPanel.mockReturnValue({
      ...defaultControlPanelContext,
      gameDetail,
      gameActionLoading: true, 
    });
    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={true} />);

    expect(screen.getByText('Procesando...')).toBeInTheDocument();
  });

  it('displays a loading spinner when updating event phase', async () => {
    const mockUpdateEventPhase = jest.fn(() => new Promise(() => { }));
    mockUseEventPhase.mockReturnValue({
      ...defaultEventPhaseContext,
      updateEventPhase: mockUpdateEventPhase,
    });

    window.confirm = jest.fn(() => true);

    render(<ControlPanelModal isOpen={true} onClose={mockOnClose} isAdmin={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrega' }));

    await waitFor(() => {
      expect(screen.getByText('Actualizando fase...')).toBeInTheDocument();
    });
  });
});
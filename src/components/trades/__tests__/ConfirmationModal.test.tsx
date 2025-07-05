import { Trade } from '@/types';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmationModal from '../ConfirmationModal';

const mockItems: Trade[] = [
  {
    result: { assigned_trade_code: 101 },
    math_item_exchanged: { title: 'Juego de Mesa A' },
  } as Trade,
  {
    result: { assigned_trade_code: 202 },
    math_item_exchanged: { title: 'Juego de Mesa B' },
  } as Trade,
];

describe('ConfirmationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    itemsToDeliver: mockItems,
    actionType: 'selected' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(<ConfirmationModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when isOpen is true', () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Confirmar Entrega de Seleccionados')).toBeInTheDocument();
    expect(screen.getByText('Vas a marcar como entregados los siguientes juegos:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('displays the list of items to deliver', () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('Juego de Mesa A')).toBeInTheDocument();
    expect(screen.getByText('202')).toBeInTheDocument();
    expect(screen.getByText('Juego de Mesa B')).toBeInTheDocument();
  });

  it('displays a message and disables confirm button when there are no items', () => {
    render(<ConfirmationModal {...defaultProps} itemsToDeliver={[]} />);
    expect(screen.getByText('No hay juegos seleccionados para esta acción.')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: /Entregar Marcados/i });
    expect(confirmButton).toBeDisabled();
  });

  it('calls onClose when the close (X) button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /cerrar/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Cancelar button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm and onClose when the confirm button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: /Entregar Marcados/i });
    fireEvent.click(confirmButton);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  describe('actionType: "all"', () => {
    it('displays correct text and style for confirm button', () => {
      render(<ConfirmationModal {...defaultProps} actionType="all" />);
      const confirmButton = screen.getByRole('button', { name: `Entregar TODO (${mockItems.length})` });
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toHaveClass('bg-accent-yellow');
    });
  });

  describe('actionType: "selected"', () => {
    it('displays correct text and style for confirm button', () => {
      render(<ConfirmationModal {...defaultProps} actionType="selected" />);
      const confirmButton = screen.getByRole('button', { name: `Entregar Marcados (${mockItems.length})` });
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toHaveClass('bg-secondary-blue');
    });
  });

  describe('modalTitle prop', () => {
    it('uses the default title based on actionType when modalTitle is not provided', () => {
      const { rerender } = render(<ConfirmationModal {...defaultProps} actionType="selected" />);
      expect(screen.getByText('Confirmar Entrega de Seleccionados')).toBeInTheDocument();

      rerender(<ConfirmationModal {...defaultProps} actionType="all" />);
      expect(screen.getByText('Confirmar Entrega Total')).toBeInTheDocument();
    });

    it('uses the modalTitle prop when provided, ignoring actionType', () => {
      const customTitle = 'Título Personalizado';
      render(<ConfirmationModal {...defaultProps} modalTitle={customTitle} />);
      expect(screen.getByText(customTitle)).toBeInTheDocument();
      expect(screen.queryByText('Confirmar Entrega de Seleccionados')).not.toBeInTheDocument();
      expect(screen.queryByText('Confirmar Entrega Total')).not.toBeInTheDocument();
    });
  });
});

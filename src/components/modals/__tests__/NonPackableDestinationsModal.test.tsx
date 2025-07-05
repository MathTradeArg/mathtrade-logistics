
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NonPackableDestinationsModal from '../NonPackableDestinationsModal';

const mockOnClose = jest.fn();

describe('NonPackableDestinationsModal', () => {
  beforeEach(() => {
    mockOnClose.mockClear();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    destinations: {
      fullyPacked: [{ id: 1, name: 'Destination A' }],
      notReady: [{ id: 2, name: 'Destination B' }],
    },
  };

  it('renders correctly when open', () => {
    render(<NonPackableDestinationsModal {...defaultProps} />);

    expect(screen.getByText('Destinos no empaquetables')).toBeInTheDocument();
    expect(screen.getByText('Todos los ítems ya están en cajas')).toBeInTheDocument();
    expect(screen.getByText('Destination A')).toBeInTheDocument();
    expect(screen.getByText('Ningún ítem está listo para empaquetar')).toBeInTheDocument();
    expect(screen.getByText('Destination B')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<NonPackableDestinationsModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Destinos no empaquetables')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    render(<NonPackableDestinationsModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cerrar'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

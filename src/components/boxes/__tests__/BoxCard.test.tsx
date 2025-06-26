import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoxCard from '../BoxCard';
import { Box } from '@/types/logistics';
import { useActionStatus } from '@/contexts/ActionStatusContext';

jest.mock('@/contexts/ActionStatusContext');

jest.mock('@/components/GameRowItem', () => {
  return {
    __esModule: true,
    default: ({ title, onRowClick, variant }: { title: string, onRowClick?: () => void, variant: string }) => (
      <li data-testid="game-row-item" data-variant={variant} onClick={onRowClick}>
        {title}
      </li>
    ),
  };
});

describe('BoxCard', () => {
  const mockOnToggleItemSelection = jest.fn();
  const mockOnDeliverSelected = jest.fn();

  const mockBox: Box = {
    id: 1,
    number: 101,
    math_items: [
      { id: 1, assigned_trade_code: 1001, title: 'Actionable Game', status: 4, box_number: null, location: 1, location_name: 'A', first_name: 'A', last_name: 'A' },
      { id: 2, assigned_trade_code: 1002, title: 'Delivered Game', status: 6, box_number: 101, location: 1, location_name: 'A', first_name: 'A', last_name: 'A' },
    ],
    selectedItemIds: new Set(),
    created_by_username: null,
    created_by_first_name: null,
    created_by_last_name: null,
    origin: 0,
    origin_name: '',
    destination_name: ''
  };

  beforeEach(() => {
    (useActionStatus as jest.Mock).mockReturnValue({ isProcessingAction: false });
    jest.clearAllMocks();
  });

  it('renders items and distinguishes between variants', () => {
    render(<BoxCard box={mockBox} onToggleItemSelection={mockOnToggleItemSelection} onDeliverSelected={mockOnDeliverSelected} />);
    
    const gameItems = screen.getAllByTestId('game-row-item');
    expect(gameItems).toHaveLength(2);
    expect(screen.getByText('Actionable Game')).toBeInTheDocument();
    expect(screen.getByText('Delivered Game')).toBeInTheDocument();

    expect(gameItems[0]).toHaveAttribute('data-variant', 'actionable');
    expect(gameItems[1]).toHaveAttribute('data-variant', 'delivered');
  });

  it('calls onToggleItemSelection when an actionable item is clicked', () => {
    render(<BoxCard box={mockBox} onToggleItemSelection={mockOnToggleItemSelection} onDeliverSelected={mockOnDeliverSelected} />);
    fireEvent.click(screen.getByText('Actionable Game'));
    expect(mockOnToggleItemSelection).toHaveBeenCalledWith(1, 1001);
  });

  it('disables the button when no items are selected', () => {
    render(<BoxCard box={mockBox} onToggleItemSelection={mockOnToggleItemSelection} onDeliverSelected={mockOnDeliverSelected} />);
    const button = screen.getByRole('button', { name: /Recibir Seleccionados/ });
    expect(button).toBeDisabled();
  });

});


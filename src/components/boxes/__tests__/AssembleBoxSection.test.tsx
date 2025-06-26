import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssembleBoxSection from '../AssembleBoxSection';
import { useAssembleBox } from '@/hooks/boxes/useAssembleBox';

jest.mock('@/hooks/boxes/useAssembleBox');

jest.mock('@/components/GameRowItem', () => {
  return {
    __esModule: true,
    default: ({ title, onRowClick, isSelected }: { title: string, onRowClick?: () => void, isSelected: boolean }) => (
      <li onClick={onRowClick} data-testid="game-row-item" data-selected={isSelected}>
        {title}
      </li>
    ),
  };
});

jest.mock('@/components/boxes/RecentlyCreatedBox', () => {
    return {
      __esModule: true,
      default: () => <div data-testid="recently-created-box">Caja Reciente</div>,
    };
});

jest.mock('@/components/NonPackableDestinationsModal', () => {
    return {
      __esModule: true,
      default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="modal">Modal Abierto</div> : null,
    };
});


describe('AssembleBoxSection', () => {
  const mockFetchItemsForPacking = jest.fn();
  const mockHandleCreateBoxSubmit = jest.fn();

  const mockItems = [
    { id: 1, assigned_trade_code: 101, title: 'Game A', status: 5, box_number: null, location: 1, location_name: 'Dest A', first_name: 'John', last_name: 'Doe' },
    { id: 2, assigned_trade_code: 102, title: 'Game B', status: 5, box_number: null, location: 1, location_name: 'Dest A', first_name: 'Jane', last_name: 'Doe' },
    { id: 3, assigned_trade_code: 103, title: 'Game C', status: 4, box_number: null, location: 1, location_name: 'Dest A', first_name: 'Jim', last_name: 'Beam' },
  ];

  beforeEach(() => {
    (useAssembleBox as jest.Mock).mockReturnValue({
      itemsReadyForPacking: mockItems,
      isLoadingPackingItems: false,
      errorPackingItems: null,
      nonPackableDestinations: { fullyPacked: [], notReady: [] },
      recentlyCreatedBoxes: [],
      fetchItemsForPacking: mockFetchItemsForPacking,
      handleCreateBoxSubmit: mockHandleCreateBoxSubmit,
    });
    jest.clearAllMocks();
  });

  it('fetches items on mount', () => {
    render(<AssembleBoxSection />);
    expect(mockFetchItemsForPacking).toHaveBeenCalledTimes(1);
  });

  it('filters items based on search term', async () => {
    render(<AssembleBoxSection />);
    
    const destinationSelects = screen.getAllByRole('combobox');
    fireEvent.change(destinationSelects[0], { target: { value: '1' } });

    const searchInput = screen.getByPlaceholderText('Buscar por título, dueño o código...');
    fireEvent.change(searchInput, { target: { value: 'Game A' } });

    await waitFor(() => {
      expect(screen.getByText('Game A')).toBeInTheDocument();
      expect(screen.queryByText('Game B')).not.toBeInTheDocument();
    });
  });

  it('allows selecting and deselecting items', async () => {
    render(<AssembleBoxSection />);
    const destinationSelects = screen.getAllByRole('combobox');
    fireEvent.change(destinationSelects[0], { target: { value: '1' } });

    const gameA = await screen.findByText('Game A');
    fireEvent.click(gameA);

    const createButtons = screen.getAllByRole('button', { name: /Crear Caja/ });
    expect(createButtons[0]).not.toBeDisabled();
  });
});


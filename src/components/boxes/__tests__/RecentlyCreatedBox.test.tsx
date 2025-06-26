import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecentlyCreatedBox from '../RecentlyCreatedBox';
import { Box } from '@/types/logistics';

jest.mock('@/components/GameRowItem', () => {
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => <li data-testid="game-row-item">{title}</li>,
  };
});

describe('RecentlyCreatedBox', () => {
  const mockBox: Box = {
    id: 1,
    number: 101,
    destination_name: 'Córdoba',
    math_items: [
      { id: 1, title: 'Catan', assigned_trade_code: 1001, status: 5, box_number: 101, location: 3, location_name: 'Córdoba', first_name: 'John', last_name: 'Doe' },
    ],
    selectedItemIds: new Set(),
    created_by_username: null,
    created_by_first_name: null,
    created_by_last_name: null,
    origin: 0,
    origin_name: ''
  };

  it('renders box information and items', () => {
    render(<RecentlyCreatedBox box={mockBox} />);

    expect(screen.getByText('Caja #101')).toBeInTheDocument();
    expect(screen.getByText(/Destino:/)).toHaveTextContent('Destino: Córdoba');
    expect(screen.getByTestId('game-row-item')).toHaveTextContent('Catan');
  });
});


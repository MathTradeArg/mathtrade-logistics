import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleBoxDisplayCard from '../SimpleBoxDisplayCard';
import { Box } from '@/types/logistics';

jest.mock('@/components/GameRowItem', () => {
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => <li data-testid="game-row-item">{title}</li>,
  };
});

describe('SimpleBoxDisplayCard', () => {
  const mockBox: Box = {
    id: 1,
    number: 101,
    origin: 2,
    origin_name: 'Buenos Aires',
    destination_name: 'Córdoba',
    created_by_username: 'AdminMT',
    created_by_first_name: 'Admin',
    created_by_last_name: 'User',
    math_items: [
      { id: 1, title: 'Catan', assigned_trade_code: 1001, status: 5, box_number: 101, location: 3, location_name: 'Córdoba', first_name: 'John', last_name: 'Doe' },
      { id: 2, title: 'Ticket to Ride', assigned_trade_code: 1002, status: 5, box_number: 101, location: 3, location_name: 'Córdoba', first_name: 'Jane', last_name: 'Doe' },
    ],
    selectedItemIds: new Set(),
  };

  it('renders box information and items correctly', () => {
    render(<SimpleBoxDisplayCard box={mockBox} />);

    expect(screen.getByText('Caja #101')).toBeInTheDocument();
    expect(screen.getByText(/Origen:/)).toHaveTextContent('Origen: Buenos Aires');
    expect(screen.getByText(/Destino:/)).toHaveTextContent('Destino: Córdoba');
    expect(screen.getByText(/Creado por Admin User/)).toBeInTheDocument();
    expect(screen.getByText('Ítems (2)')).toBeInTheDocument();
    expect(screen.getAllByTestId('game-row-item')).toHaveLength(2);
    expect(screen.getByText('Catan')).toBeInTheDocument();
    expect(screen.getByText('Ticket to Ride')).toBeInTheDocument();
  });

  it('renders correctly when there are no items', () => {
    const boxWithNoItems = { ...mockBox, math_items: [] };
    render(<SimpleBoxDisplayCard box={boxWithNoItems} />);

    expect(screen.getByText('Ítems (0)')).toBeInTheDocument();
    expect(screen.getByText('Esta caja no contiene ítems.')).toBeInTheDocument();
  });
});
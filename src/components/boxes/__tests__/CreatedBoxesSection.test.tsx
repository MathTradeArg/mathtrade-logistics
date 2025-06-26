import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreatedBoxesSection from '../CreatedBoxesSection';
import { Box } from '@/types';

jest.mock('../SimpleBoxDisplayCard', () => {
  return {
    __esModule: true,
    default: ({ box }: { box: Box }) => <div data-testid="simple-box-card">Caja #{box.number}</div>,
  };
});

describe('CreatedBoxesSection', () => {
  const mockBoxes: Box[] = [
    {
      id: 1, number: 101, math_items: [], selectedItemIds: new Set(),
      created_by_username: null,
      created_by_first_name: null,
      created_by_last_name: null,
      origin: 0,
      origin_name: '',
      destination_name: ''
    },  

    {
      id: 2, number: 102, math_items: [], selectedItemIds: new Set(),
      created_by_username: null,
      created_by_first_name: null,
      created_by_last_name: null,
      origin: 0,
      origin_name: '',
      destination_name: ''
    },  
  ];

  it('shows loading spinner when loading', () => {
    render(<CreatedBoxesSection createdBoxes={[]} isLoadingCreated={true} errorCreated={null} />);
    expect(screen.getByText('Cargando cajas creadas...')).toBeInTheDocument();
  });

  it('shows error message on error', () => {
    render(<CreatedBoxesSection createdBoxes={[]} isLoadingCreated={false} errorCreated="Failed to load" />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows empty message when there are no boxes', () => {
    render(<CreatedBoxesSection createdBoxes={[]} isLoadingCreated={false} errorCreated={null} />);
    expect(screen.getByText('No hay cajas creadas para mostrar.')).toBeInTheDocument();
  });

  it('renders a list of boxes when data is available', () => {
    render(<CreatedBoxesSection createdBoxes={mockBoxes} isLoadingCreated={false} errorCreated={null} />);
    
    const boxCards = screen.getAllByTestId('simple-box-card');
    expect(boxCards).toHaveLength(2);
    expect(boxCards[0]).toHaveTextContent('Caja #101');
    expect(boxCards[1]).toHaveTextContent('Caja #102');
  });
});

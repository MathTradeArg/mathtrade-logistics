import { fireEvent, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameList from '../GameList';
import { Trade } from '@/types';
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal, AwaitedReactNode } from 'react';

jest.mock('../ConfirmationModal', () => {
  return jest.fn(({ isOpen, onConfirm, itemsToDeliver, actionType, modalTitle }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirmation-modal">
        <h2 data-testid="modal-title">{modalTitle}</h2>
        <p data-testid="modal-action-type">{actionType}</p>
        <ul data-testid="modal-items">
          {itemsToDeliver.map((item: Trade) => (
            <li key={item.result.assigned_trade_code}>{item.math_item_exchanged.title}</li>
          ))}
        </ul>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    );
  });
});

jest.mock('../GameRowItem', () => {
  return jest.fn(({ id, title, isSelected, onRowClick, showCheckbox, onCheckboxChange, variant }) => (
    <li data-testid={`game-row-${id}`} onClick={onRowClick || onCheckboxChange}>
      <span>{title}</span>
      {showCheckbox && <input type="checkbox" readOnly checked={!!isSelected} />}
      <span className="variant-info hidden">{variant}</span>
    </li>
  ));
});

window.HTMLElement.prototype.scrollIntoView = jest.fn();

const mockTrades: Trade[] = [
  {
    result: { assigned_trade_code: 101, status_display: 'In Event', table_number: 'A1' },
    math_item_exchanged: { title: 'Juego A' },
    to_member: { first_name: 'Juan', last_name: 'Perez' },
  } as unknown as Trade,
  {
    result: { assigned_trade_code: 102, status_display: 'Received by Org', table_number: 'A1' },
    math_item_exchanged: { title: 'Juego B' },
    to_member: { first_name: 'Juan', last_name: 'Perez' },
  } as unknown as Trade,
  {
    result: { assigned_trade_code: 103, status_display: 'Delivered', table_number: 'A1' },
    math_item_exchanged: { title: 'Juego C' },
    to_member: { first_name: 'Juan', last_name: 'Perez' },
  } as unknown as Trade,
];

const mockOnUpdateItems = jest.fn().mockResolvedValue(undefined);
const mockOnFinish = jest.fn();

describe('GameList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

   afterEach(() => {
    jest.useRealTimers();
  }); 

  describe('in "deliver" mode', () => {
    const deliverProps = {
      trades: mockTrades,
      onUpdateItems: mockOnUpdateItems,
      onFinish: mockOnFinish,
      deliveredByUserId: 1,
      mode: 'deliver' as const,
    };

    it('renders user info, table number, and summary correctly', () => {
      render(<GameList {...deliverProps} />);
      
      expect(screen.getByRole('heading', { name: /Juan Perez/i })).toBeInTheDocument();

      const mesaElement = screen.getByText(/Mesa:/i);
      expect(mesaElement).toBeInTheDocument();
      expect(mesaElement).toHaveTextContent('A1');

      const summaryElement = screen.getByText(/Resumen:/i);
      expect(summaryElement.textContent).toMatch(/1 juego para entregar de 3 en total/);

      const completedElement = screen.getByText(/ya entregado/i);
      expect(completedElement.textContent).toMatch(/\(1 ya entregado\)/);


    });

    it('pre-selects all pending items on initial render', () => {
      render(<GameList {...deliverProps} />);
      expect(screen.getByRole('button', { name: /Entregar lo marcado \(1\)/i })).toBeInTheDocument();
    });

    it('handles item selection and deselection', () => {
      render(<GameList {...deliverProps} />);
      expect(screen.getByRole('button', { name: /Entregar lo marcado \(1\)/i })).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('game-row-101'));
      expect(screen.queryByRole('button', { name: /Entregar lo marcado/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('game-row-101'));
      expect(screen.getByRole('button', { name: /Entregar lo marcado \(1\)/i })).toBeInTheDocument();
    });

    it('opens confirmation modal for "Entregar TODO"', () => {
      render(<GameList {...deliverProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Entregar TODO lo listo/i }));
      
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Confirmar Entrega a Juan');
      expect(screen.getByTestId('modal-action-type')).toHaveTextContent('all');
      expect(screen.getByTestId('modal-items')).toHaveTextContent('Juego A');
      expect(screen.getByTestId('modal-items')).not.toHaveTextContent('Juego B');
    });

    it('calls onUpdateItems and scrolls on "all" confirmation', async () => {
            jest.useFakeTimers();

      render(<GameList {...deliverProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Entregar TODO lo listo/i }));
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      act(() => {
        jest.runAllTimers();
      });

      expect(mockOnUpdateItems).toHaveBeenCalledWith([101], 1);
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('in "receive" mode', () => {
    const receiveTrades: Trade[] = [
      { result: { assigned_trade_code: 201, status_display: 'In Transit' }, math_item_exchanged: { title: 'Juego Recibir A' }, to_member: { first_name: 'Maria', last_name: 'Lopez' } } as unknown as Trade,
      { result: { assigned_trade_code: 202, status_display: 'Delivered' }, math_item_exchanged: { title: 'Juego Recibir B' }, to_member: { first_name: 'Maria', last_name: 'Lopez' } } as unknown as Trade,
    ];

    const receiveProps = { trades: receiveTrades, onUpdateItems: mockOnUpdateItems, onFinish: mockOnFinish, deliveredByUserId: 1, mode: 'receive' as const };

    it('renders summary and buttons correctly', () => {
      render(<GameList {...receiveProps} />);
      expect(screen.getByRole('heading', { name: /Maria Lopez/i })).toBeInTheDocument();
      expect(screen.queryByText(/Mesa:/i)).not.toBeInTheDocument();

      const summaryElement = screen.getByText(/Resumen:/i);
      expect(summaryElement.textContent).toMatch(/1 juego pendiente de 2 en total/);

      const receivedElement = screen.getByText(/ya recibido/i);
      expect(receivedElement.textContent).toMatch(/\(1 ya recibido\)/);      expect(screen.getByRole('button', { name: /Recibir TODO lo pendiente/i })).toBeInTheDocument();
    });

    it('calls onUpdateItems when "Recibir lo marcado" is confirmed', async () => {
      render(<GameList {...receiveProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Recibir lo marcado/i }));
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await act(async () => { fireEvent.click(confirmButton); });

      expect(mockOnUpdateItems).toHaveBeenCalledWith([201], 1);
      expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('General behavior', () => {
    it('renders a "no items" message when trades array is empty', () => {
      render(<GameList trades={[]} onUpdateItems={mockOnUpdateItems} onFinish={mockOnFinish} deliveredByUserId={1} mode="deliver" />);
      expect(screen.getByText('Este usuario no tiene juegos pendientes de retirar.')).toBeInTheDocument();
    });

    it('changes finish button text when all items are completed', () => {
      const allCompletedTrades = mockTrades.map(t => ({ ...t, result: { ...t.result, status_display: 'Delivered' } }));
      render(<GameList trades={allCompletedTrades} onUpdateItems={mockOnUpdateItems} onFinish={mockOnFinish} deliveredByUserId={1} mode="deliver" />);
      expect(screen.getByRole('button', { name: /Todo entregado. Siguiente QR/i })).toBeInTheDocument();
    });

    it('disables action buttons when disabled prop is true', () => {
      render(<GameList trades={mockTrades} onUpdateItems={mockOnUpdateItems} onFinish={mockOnFinish} deliveredByUserId={1} mode="deliver" disabled={true} />);
      expect(screen.getByRole('button', { name: /Entregar TODO lo listo/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Entregar lo marcado/i })).toBeDisabled();
    });
  });
});
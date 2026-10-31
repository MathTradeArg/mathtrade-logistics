import * as boxApi from '@/hooks/boxes/boxApi';
import * as cityApi from '@/hooks/city/cityApi';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Box, Item, Tracking } from '@/types';
import TrackingEditor from '../TrackingEditor';

jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/hooks/city/cityApi');
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const box = (id: number, number: number, destiny: number, tracking: string | null = null): Box => ({
  created_by_username: 'r', created_by_first_name: 'R', created_by_last_name: null,
  id, number, origin_number: id - 29, destiny, tracking,
  destination_name: destiny === 1 ? 'AMBA' : 'Córdoba',
  origin: 7, origin_name: 'Mendoza', closed_at: '2026-10-30T10:00:00Z',
  math_items: [{ id: id * 10, title: 'x' } as Item],
});

const closed = [box(30, 1, 1), box(31, 2, 1, 'OTHER-CODE'), box(32, 3, 1), box(33, 1, 8)];

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('TrackingEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (boxApi.listBoxes as jest.Mock).mockResolvedValue(closed);
    (cityApi.saveTracking as jest.Mock).mockImplementation(async (body) => ({ id: 9, ...body, boxes: [] }));
  });

  it('offers only the unshipped closed boxes of the chosen destination', async () => {
    render(<TrackingEditor cityId={7} onSaved={jest.fn()} onCancel={jest.fn()} />);
    await screen.findByLabelText('Destino');
    expect(boxApi.listBoxes).toHaveBeenCalledWith({ origin: 7, status: 'closed' });

    fill(/Destino/, '1');
    expect(screen.getByRole('checkbox', { name: /Caja 1-1/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Caja 3-3/ })).toBeInTheDocument();
    // In another shipment, or for another destination.
    expect(screen.queryByRole('checkbox', { name: /Caja 2-2/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Caja 4-1/ })).not.toBeInTheDocument();
  });

  it('keeps the boxes of the shipment being edited', async () => {
    const editing: Tracking = {
      id: 5, tracking_code: 'OTHER-CODE', destiny: 1, price: 10, weight: 1, image: null, item_count: 1,
      boxes: [box(31, 2, 1, 'OTHER-CODE')],
    };
    render(<TrackingEditor cityId={7} tracking={editing} onSaved={jest.fn()} onCancel={jest.fn()} />);
    expect(await screen.findByRole('checkbox', { name: /Caja 2-2/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Caja 1-1/ })).toBeInTheDocument();
  });

  it('submits the body the backend expects', async () => {
    const onSaved = jest.fn();
    (cityApi.uploadReceipt as jest.Mock).mockResolvedValue('https://res.cloudinary.com/x/r.jpg');
    render(<TrackingEditor cityId={7} onSaved={onSaved} onCancel={jest.fn()} />);
    await screen.findByLabelText('Destino');

    fill(/Destino/, '1');
    fireEvent.click(screen.getByRole('checkbox', { name: /Caja 1-1/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Caja 3-3/ }));
    fill(/Código de seguimiento/, ' AR999 ');
    fill(/Precio/, '4500');
    fill(/Peso/, '2.5');
    const file = new File(['img'], 'r.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(screen.getByTestId('receipt-input'), { target: { files: [file] } });
    });
    expect(await screen.findByAltText('Comprobante')).toHaveAttribute('src', 'https://res.cloudinary.com/x/r.jpg');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar envío' }));
    });
    expect(cityApi.saveTracking).toHaveBeenCalledWith({
      destiny: 1,
      tracking_code: 'AR999',
      boxes: [30, 32],
      weight: 2.5,
      price: '4500',
      image: 'https://res.cloudinary.com/x/r.jpg',
    }, undefined);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('shows an upload error', async () => {
    (cityApi.uploadReceipt as jest.Mock).mockRejectedValue(
      new Error('La imagen no pudo comprimirse por debajo de 500KB.'),
    );
    render(<TrackingEditor cityId={7} onSaved={jest.fn()} onCancel={jest.fn()} />);
    await screen.findByLabelText('Destino');
    const file = new File(['img'], 'big.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(screen.getByTestId('receipt-input'), { target: { files: [file] } });
    });
    expect(await screen.findByText('La imagen no pudo comprimirse por debajo de 500KB.')).toBeInTheDocument();
  });

  it('shows backend field errors from err.body', async () => {
    (cityApi.saveTracking as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Error: Bad Request'), { status: 400, body: { boxes: ['Solo cajas cerradas de tu ciudad.'] } }),
    );
    render(<TrackingEditor cityId={7} onSaved={jest.fn()} onCancel={jest.fn()} />);
    await screen.findByLabelText('Destino');
    fill(/Destino/, '1');
    fireEvent.click(screen.getByRole('checkbox', { name: /Caja 1-1/ }));
    fill(/Código de seguimiento/, 'AR1');
    fill(/Precio/, '1');
    fill(/Peso/, '1');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar envío' }));
    });
    expect(await screen.findByText('Solo cajas cerradas de tu ciudad.')).toBeInTheDocument();
  });
});

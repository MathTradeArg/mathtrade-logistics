import * as boxApi from '@/hooks/boxes/boxApi';
import * as cityApi from '@/hooks/city/cityApi';
import { downloadSheet } from '@/utils/xlsx';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShipmentPage from '../[trackingId]/page';
import CityShipmentsPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/city/cityApi');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/utils/xlsx', () => ({ downloadSheet: jest.fn().mockResolvedValue(undefined), fileSlug: jest.fn(() => 'mendoza') }));
jest.mock('@/components/staff/StaffTitleContext', () => ({ useStaffTitle: jest.fn() }));
jest.mock('@/components/common/FullScreenImageModal', () => function Modal({ imageUrl }: { imageUrl: string | null }) {
  return imageUrl ? <div data-testid="fullscreen">{imageUrl}</div> : null;
});
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ trackingId: '4' }),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;

const tracking = {
  id: 4,
  tracking_code: 'AR123',
  destiny: 1,
  price: 5000,
  weight: 3.5,
  image: 'https://res.cloudinary.com/x/receipt.jpg',
  item_count: 6,
  boxes: [
    { id: 30, number: 2, origin_number: 1, destiny: 1, destination_name: 'AMBA', math_items: [] },
    { id: 31, number: 3, origin_number: 2, destiny: 1, destination_name: 'AMBA', math_items: [] },
  ],
};

const items = [
  { id: 1, title: 'Catan', assigned_trade_code: 12, first_name: 'Ana', last_name: 'Paz', location: 1,
    location_name: 'AMBA', box_number: 2, box_origin_number: 1 },
  { id: 2, title: 'Carcassonne', assigned_trade_code: 345, first_name: 'Luis', last_name: 'Gil', location: 7,
    location_name: 'Mendoza', box_number: null },
  { id: 3, title: 'Azul', assigned_trade_code: 6, first_name: 'Eva', last_name: 'Sol', location: 2,
    location_name: 'Rosario', box_number: null },
];

describe('city shipments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } } });
    (cityApi.listTrackings as jest.Mock).mockResolvedValue([tracking]);
    (cityApi.getTracking as jest.Mock).mockResolvedValue(tracking);
    (cityApi.deleteTracking as jest.Mock).mockResolvedValue(undefined);
    (boxApi.listItems as jest.Mock).mockResolvedValue(items);
  });

  it('lists the shipments with boxes, counts and the receipt', async () => {
    render(<CityShipmentsPage />);
    expect(await screen.findByText('AR123')).toBeInTheDocument();
    expect(cityApi.listTrackings).toHaveBeenCalledWith({});
    expect(screen.getByText('AMBA')).toBeInTheDocument();
    expect(screen.getByText('Cajas: 1-2, 2-3')).toBeInTheDocument();
    expect(screen.getByText('6 juegos')).toBeInTheDocument();
    expect(screen.getByText('$5000 · 3.5 kg')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver envío' })).toHaveAttribute('href', '/city/shipments/4');

    fireEvent.click(screen.getByRole('button', { name: 'Ver comprobante' }));
    expect(screen.getByTestId('fullscreen')).toHaveTextContent('receipt.jpg');
  });

  it('shows the Ejemplares tab without the local items and downloads them as Excel', async () => {
    render(<CityShipmentsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ejemplares' }));
    expect(await screen.findByText('0012 · Catan')).toBeInTheDocument();
    expect(boxApi.listItems).toHaveBeenCalledWith({ origin: 7 });
    expect(screen.getByText('Ana Paz · Caja 1-2 · AMBA')).toBeInTheDocument();
    expect(screen.getByText('0006 · Azul')).toBeInTheDocument();
    expect(screen.queryByText(/Carcassonne/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar ejemplares' }), { target: { value: 'catan' } });
    expect(screen.queryByText(/Azul/)).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel' }));
    });
    expect(downloadSheet).toHaveBeenCalledWith(
      [expect.objectContaining({ 'Código': '0012', 'Juego': 'Catan', 'Caja': '1-2', 'Destino': 'AMBA' })],
      'ejemplares_mendoza.xlsx',
      'Ejemplares',
    );
  });

  it('shows a local volunteer only the Ejemplares', async () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } } });
    render(<CityShipmentsPage />);
    expect(await screen.findByText('0012 · Catan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envíos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo envío' })).not.toBeInTheDocument();
    expect(cityApi.listTrackings).not.toHaveBeenCalled();
  });

  it('deletes a shipment after confirming', async () => {
    render(<ShipmentPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('Las cajas quedan cerradas y sin envío.')).toBeInTheDocument();
    const dialogButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await act(async () => {
      fireEvent.click(dialogButtons[dialogButtons.length - 1]);
    });
    await waitFor(() => expect(cityApi.deleteTracking).toHaveBeenCalledWith(4));
    expect(mockReplace).toHaveBeenCalledWith('/city/shipments');
  });
});

import * as cityApi from '@/hooks/city/cityApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShipmentPage from '../[trackingId]/page';
import CityShipmentsPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/city/cityApi');
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

describe('city shipments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } } });
    (cityApi.listTrackings as jest.Mock).mockResolvedValue([tracking]);
    (cityApi.getTracking as jest.Mock).mockResolvedValue(tracking);
    (cityApi.deleteTracking as jest.Mock).mockResolvedValue(undefined);
  });

  it('lists the shipments with boxes, counts and the receipt', async () => {
    render(<CityShipmentsPage />);
    expect(await screen.findByText('AR123')).toBeInTheDocument();
    expect(cityApi.listTrackings).toHaveBeenCalledWith();
    expect(screen.getByText('AMBA')).toBeInTheDocument();
    expect(screen.getByText('Cajas: 1-2, 2-3')).toBeInTheDocument();
    expect(screen.getByText('6 juegos')).toBeInTheDocument();
    expect(screen.getByText('$5000 · 3.5 kg')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver envío' })).toHaveAttribute('href', '/city/shipments/4');

    fireEvent.click(screen.getByRole('button', { name: 'Ver comprobante' }));
    expect(screen.getByTestId('fullscreen')).toHaveTextContent('receipt.jpg');
  });

  it('is only for referrers', () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } } });
    render(<CityShipmentsPage />);
    expect(screen.getByText('Solo el referente de la ciudad maneja los envíos.')).toBeInTheDocument();
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

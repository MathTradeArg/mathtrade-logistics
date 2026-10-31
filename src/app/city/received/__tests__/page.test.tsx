import * as boxApi from '@/hooks/boxes/boxApi';
import * as cityApi from '@/hooks/city/cityApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import CityReceivedPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/city/cityApi');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;

const tracking = {
  id: 4, tracking_code: 'AR123', destiny: 7, price: 6000, weight: 3, image: null, item_count: 3,
  boxes: [
    {
      id: 30, number: 2, origin_number: 1, destiny: 7, origin_name: 'Salta', comment: null,
      math_items: [
        { id: 1, title: 'Catan', assigned_trade_code: 12, receptor_first_name: 'Ana', receptor_last_name: 'Paz' },
      ],
    },
  ],
};
const empty = { ...tracking, id: 5, tracking_code: 'AR999', price: null, item_count: 0 };

const items = [
  { id: 1, title: 'Catan', assigned_trade_code: 12, receptor_first_name: 'Ana', receptor_last_name: 'Paz',
    origin_location: 9, origin_location_name: 'Salta', via_meeting: true, box_number: 2 },
  { id: 2, title: 'Azul', assigned_trade_code: 6, receptor_first_name: 'Eva', receptor_last_name: 'Sol',
    origin_location: 3, origin_location_name: 'Rosario', via_meeting: false, box_number: 5 },
];

describe('city received', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } } });
    (cityApi.listTrackings as jest.Mock).mockResolvedValue([tracking, empty]);
    (boxApi.listItems as jest.Mock).mockResolvedValue(items);
  });

  it('lists the shipments to the city with total and price per game', async () => {
    render(<CityReceivedPage />);
    expect(await screen.findByText('Salta · AR123')).toBeInTheDocument();
    expect(cityApi.listTrackings).toHaveBeenCalledWith({ destination: 7 });
    // 6000 / 3 = 2000 per game; "—" when the shipment has no games or price.
    expect(screen.getByText(/2\.000,00 por juego/)).toBeInTheDocument();
    expect(screen.getByText(/— en total · — por juego/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Salta · AR123'));
    expect(screen.getByText('0012 · Catan → Ana Paz')).toBeInTheDocument();
  });

  it('filters the Ejemplares by origin and by via meeting', async () => {
    render(<CityReceivedPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ejemplares' }));
    expect(await screen.findByText('0012 · Catan')).toBeInTheDocument();
    expect(boxApi.listItems).toHaveBeenCalledWith({ destination: 7 });
    expect(screen.getByText('0006 · Azul')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Origen' }), { target: { value: '3' } });
    expect(screen.queryByText('0012 · Catan')).not.toBeInTheDocument();
    expect(screen.getByText('0006 · Azul')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Origen' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('0012 · Catan')).toBeInTheDocument();
    expect(screen.queryByText('0006 · Azul')).not.toBeInTheDocument();
  });

  it('is for the referrer only', () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } } });
    render(<CityReceivedPage />);
    expect(screen.getByText('Solo el referente de la ciudad ve lo que recibe.')).toBeInTheDocument();
    expect(cityApi.listTrackings).not.toHaveBeenCalled();
  });
});

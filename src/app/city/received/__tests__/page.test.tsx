import * as boxApi from '@/hooks/boxes/boxApi';
import * as cityApi from '@/hooks/city/cityApi';
import { useAuth } from '@/hooks/useAuth';
import { useXlsxExport } from '@/hooks/useXlsxExport';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CITY_VIEW_STORAGE_KEY, CityViewProvider } from '@/contexts/CityViewContext';
import CityReceivedPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/city/cityApi');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/hooks/useXlsxExport', () => ({
  ...jest.requireActual('@/hooks/useXlsxExport'),
  useXlsxExport: jest.fn(),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

jest.mock('@/components/common/FullScreenImageModal', () => ({
  __esModule: true,
  default: ({ imageUrl }: { imageUrl: string | null }) => (imageUrl ? <div data-testid="image-modal">{imageUrl}</div> : null),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseXlsxExport = useXlsxExport as jest.Mock;
const COBRO_BUTTON = 'Descargar cobro';

const tracking = {
  id: 4, tracking_code: 'AR123', destiny: 7, price: 6000, weight: 3, image: null, item_count: 3,
  boxes: [
    {
      id: 30, number: 2, origin_number: 1, destiny: 7, origin_name: 'Salta', comment: null,
      math_items: [
        { id: 1, title: 'Catan', assigned_trade_code: 12, receptor_first_name: 'Ana', receptor_last_name: 'Paz', size_units: 5 },
        { id: 3, title: 'Combo', assigned_trade_code: 13, receptor_first_name: 'Eva', receptor_last_name: 'Sol', size_units: 1 },
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
    mockUseXlsxExport.mockReturnValue({ download: jest.fn(), isLoading: false, error: null, lastDownloadedAt: null });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('lists the shipments to the city with total and price per game', async () => {
    render(<CityReceivedPage />);
    expect(await screen.findByText('Salta · AR123')).toBeInTheDocument();
    expect(cityApi.listTrackings).toHaveBeenCalledWith({ destination: 7 });
    // 6 size units in total; "—" when the shipment has no price.
    expect(screen.getByText(/6\.000,00 en total · 6 unidades/)).toBeInTheDocument();
    expect(screen.getByText(/— en total · 6 unidades/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Salta · AR123'));
    // Cost is proportional to size: 6000 * 5/6 = 5000 and 6000 * 1/6 = 1000.
    expect(screen.getByText(/00012 · Catan → Ana Paz · .*5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/00013 · Combo → Eva Sol · .*1\.000,00/)).toBeInTheDocument();
  });

  it('labels a box that left AMBA as <destination code>-<number>', async () => {
    const fromAmba = { ...tracking, boxes: [{ ...tracking.boxes[0], origin: 1, destination_code: 'MEN' }] };
    (cityApi.listTrackings as jest.Mock).mockResolvedValue([fromAmba]);
    render(<CityReceivedPage />);
    fireEvent.click(await screen.findByText('Salta · AR123'));
    expect(screen.getByText(/Cajas: MEN-2/)).toBeInTheDocument();
    expect(screen.getByText('Caja MEN-2', { exact: true })).toBeInTheDocument();
  });

  it('labels the Ejemplares box as <destination code>-<number> when it left AMBA', async () => {
    (boxApi.listItems as jest.Mock).mockResolvedValue([
      { ...items[0], box_number: 1, box_destination_code: 'CBA' },
      { ...items[1], box_number: 5, box_destination_code: 'CBA' },
    ]);
    render(<CityReceivedPage />);
    fireEvent.click(await screen.findByText('Ejemplares'));
    expect(await screen.findByText(/de Salta \(AMBA\) · Caja CBA-1$/)).toBeInTheDocument();
    // Sent straight from another city: plain number.
    expect(screen.getByText(/de Rosario · Caja 5$/)).toBeInTheDocument();
  });

  it('shows the receipt photo and opens it full screen', async () => {
    (cityApi.listTrackings as jest.Mock).mockResolvedValue([{ ...tracking, image: 'https://img/receipt.jpg' }]);
    render(<CityReceivedPage />);
    expect(await screen.findByAltText('Comprobante')).toBeInTheDocument();
    expect(screen.queryByTestId('image-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver comprobante' }));
    expect(screen.getByTestId('image-modal')).toHaveTextContent('https://img/receipt.jpg');
  });

  it('shows no receipt button when the shipment has no photo', async () => {
    render(<CityReceivedPage />);
    await screen.findByText('Salta · AR123');
    expect(screen.queryByRole('button', { name: 'Ver comprobante' })).not.toBeInTheDocument();
  });

  it('filters the Ejemplares by origin and by via meeting', async () => {
    render(<CityReceivedPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ejemplares' }));
    expect(await screen.findByText('00012 · Catan')).toBeInTheDocument();
    expect(boxApi.listItems).toHaveBeenCalledWith({ destination: 7 });
    expect(screen.getByText('00006 · Azul')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Origen' }), { target: { value: '3' } });
    expect(screen.queryByText('00012 · Catan')).not.toBeInTheDocument();
    expect(screen.getByText('00006 · Azul')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Origen' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('00012 · Catan')).toBeInTheDocument();
    expect(screen.queryByText('00006 · Azul')).not.toBeInTheDocument();
  });

  it('is for the referrer only', () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } } });
    render(<CityReceivedPage />);
    expect(screen.getByText('Solo el referente de la ciudad ve lo que recibe.')).toBeInTheDocument();
    expect(cityApi.listTrackings).not.toHaveBeenCalled();
  });

  it('lets the referrer download what each participant of the city pays', async () => {
    const download = jest.fn();
    mockUseXlsxExport.mockReturnValue({ download, isLoading: false, error: null, lastDownloadedAt: null });
    render(<CityReceivedPage />);
    await screen.findByText('Salta · AR123');
    // No query: the backend scopes the referrer to their own city.
    expect(mockUseXlsxExport).toHaveBeenCalledWith('cobro', 'cobro_mendoza', undefined);
    expect(screen.getByText(/cada participante de tu ciudad/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COBRO_BUTTON }));
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('shows the download error and the busy state', async () => {
    mockUseXlsxExport.mockReturnValue({
      download: jest.fn(), isLoading: true, error: 'El servidor no pudo armar la planilla.', lastDownloadedAt: null,
    });
    render(<CityReceivedPage />);
    await screen.findByText('Salta · AR123');
    expect(screen.getByText('El servidor no pudo armar la planilla.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Armando la planilla...' })).toBeDisabled();
  });

  it('offers an admin the download of the city they are viewing, not the global one', async () => {
    const download = jest.fn();
    mockUseXlsxExport.mockReturnValue({ download, isLoading: false, error: null, lastDownloadedAt: null });
    mockUseAuth.mockReturnValue({
      isAdmin: true, cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    render(<CityReceivedPage />);
    await screen.findByText('Salta · AR123');
    expect(mockUseXlsxExport).toHaveBeenLastCalledWith('cobro', 'cobro_mendoza', { as_location: 7 });
    fireEvent.click(screen.getByRole('button', { name: COBRO_BUTTON }));
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('an admin who picked another city ("Ver como") downloads that city', async () => {
    sessionStorage.setItem(CITY_VIEW_STORAGE_KEY, JSON.stringify({ asLocation: 9, mathtradeId: null }));
    (cityApi.listLocations as jest.Mock).mockResolvedValue([{ id: 9, name: 'Córdoba' }]);
    (cityApi.listMathtrades as jest.Mock).mockResolvedValue([{ id: 1, name: 'MT', active: true }]);
    mockUseAuth.mockReturnValue({ isAdmin: true, cityAccess: null });
    render(<CityViewProvider><CityReceivedPage /></CityViewProvider>);
    await screen.findByText('Salta · AR123');
    expect(cityApi.listTrackings).toHaveBeenCalledWith({ destination: 9, as_location: 9 });
    await waitFor(() =>
      expect(mockUseXlsxExport).toHaveBeenLastCalledWith('cobro', 'cobro_cordoba', { as_location: 9 }));
    expect(screen.getByRole('button', { name: COBRO_BUTTON })).toBeInTheDocument();
    expect(screen.getByText(/cada participante de la ciudad que estás viendo/)).toBeInTheDocument();
  });

  it('an admin looking at a past edition sees no download (the backend only builds the active one)', async () => {
    sessionStorage.setItem(CITY_VIEW_STORAGE_KEY, JSON.stringify({ asLocation: 9, mathtradeId: 2 }));
    (cityApi.listLocations as jest.Mock).mockResolvedValue([{ id: 9, name: 'Córdoba' }]);
    (cityApi.listMathtrades as jest.Mock).mockResolvedValue([
      { id: 1, name: 'MT', active: true }, { id: 2, name: 'MT viejo', active: false },
    ]);
    mockUseAuth.mockReturnValue({ isAdmin: true, cityAccess: null });
    render(<CityViewProvider><CityReceivedPage /></CityViewProvider>);
    await waitFor(() =>
      expect(cityApi.listTrackings).toHaveBeenCalledWith({ destination: 9, as_location: 9, mathtrade: 2 }));
    await screen.findByText('Salta · AR123');
    expect(screen.queryByRole('button', { name: COBRO_BUTTON })).not.toBeInTheDocument();
  });

  it('an admin without a city picked sees no download', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, cityAccess: null });
    render(<CityReceivedPage />);
    expect(screen.queryByRole('button', { name: COBRO_BUTTON })).not.toBeInTheDocument();
    expect(cityApi.listTrackings).not.toHaveBeenCalled();
  });

  it('does not offer the download to a local volunteer', () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } } });
    render(<CityReceivedPage />);
    expect(screen.getByText('Solo el referente de la ciudad ve lo que recibe.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: COBRO_BUTTON })).not.toBeInTheDocument();
  });
});

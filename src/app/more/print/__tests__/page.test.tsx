import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PrintPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));
let mockSearch = '';
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockBoxFetch = boxApi.boxFetch as jest.Mock;

// Fictitious data: the real directory lives in the database.
const DIRECTORY = [
  {
    location_id: 1,
    city: 'AMBA',
    code: 'AMBA',
    address: 'Vía Cargo Villa Devoto New: Calle Falsa 123',
    pay_on_delivery: true,
    referrers: [{ name: 'Ana Hub', dni: '11111111', telegram: '', phone: '1100000000' }],
  },
  {
    location_id: 34,
    city: 'Ciudad Prueba',
    code: 'CPR',
    address: 'Av. Siempre Viva 742',
    pay_on_delivery: false,
    referrers: [{ name: 'Beto Interior', dni: '22222222', telegram: '@beto', phone: '2200000000' }],
  },
];

// Two interior cities so the "first city" preselection is distinguishable.
const DIRECTORY_TWO_INTERIOR = [
  ...DIRECTORY,
  {
    location_id: 35,
    city: 'Otra Ciudad',
    code: 'OTC',
    address: 'Calle Otra 1',
    pay_on_delivery: false,
    referrers: [{ name: 'Caro Otra', dni: '33333333', telegram: '', phone: '3300000000' }],
  },
];

describe('PrintPage', () => {
  afterEach(() => sessionStorage.clear());

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = '';
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, isAdmin: true });
    mockBoxFetch.mockImplementation(async (path: string) =>
      path === 'logistics/directory/' ? DIRECTORY : [],
    );
  });

  it('renders CABA direct box label with filled Circle, the hub referrer, Villa Devoto New address and Pago en Destino', async () => {
    render(<PrintPage />);

    expect(
      await screen.findByRole('img', { name: /Círculo lleno: Destino final CABA/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CABA' })).toBeInTheDocument();
    expect((await screen.findAllByText(/Ana Hub/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Villa Devoto New/i)).toBeInTheDocument();
    expect(screen.getAllByText(/11111111/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1100000000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PAGO EN DESTINO/i).length).toBeGreaterThan(0);
  });

  it('switches to empty Circle for boxes going via CABA and includes Pago en Destino without Circle for interior localities', async () => {
    render(<PrintPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: /SIGUE A OTRA LOCALIDAD · Vía CABA/i }),
    );
    expect(
      screen.getByRole('img', { name: /Círculo vacío: Paso intermedio por CABA/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/PAGO EN DESTINO/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Viaja a localidad del interior/i }));
    expect((await screen.findAllByText(/Ciudad Prueba/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Beto Interior/).length).toBeGreaterThan(0);
    // The receiver block prints DNI, phone and the optional Telegram line
    // straight from the directory (which no longer carries username).
    expect(screen.getAllByText(/22222222/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2200000000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Telegram: @beto/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('PAGO EN DESTINO').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: /Círculo/i })).not.toBeInTheDocument();
  });

  it('renders A4 signs for sectors without referrer, windows without mesas and with pickup screen text, and tables without MESA DE JUEGOS', async () => {
    render(<PrintPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sectores (Localidades)' }));
    expect((await screen.findAllByText(/SECTOR DESARMADO DE CAJAS/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SECTOR ARMADO DE CAJAS/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Referente:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ventanillas' }));
    expect(screen.getByText('Ventanilla 1')).toBeInTheDocument();
    expect(screen.queryByText(/MESAS:/i)).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/Para retirar: cuando hagamos las entregas, esperá a aparecer en pantalla/i)
        .length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Mesas' }));
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.queryByText(/MESA DE JUEGOS/i)).not.toBeInTheDocument();
  });

  describe('city people without an event role', () => {
    const EVENT_TABS = ['Sectores (Localidades)', 'Ventanillas', 'Mesas'];

    it.each([
      ['referrer', { kind: 'referrer', city: { id: 7, name: 'Mendoza' } }],
      ['local volunteer', { kind: 'local', city: { id: 7, name: 'Mendoza' } }],
    ])('shows only labels to a %s', async (_name, cityAccess) => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false, isAdmin: false, role: null, cityAccess,
      });
      render(<PrintPage />);

      expect(await screen.findByText(/Configurar etiquetas de cajas/i)).toBeInTheDocument();
      for (const name of EVENT_TABS) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      }
    });

    it('opens labels when a referrer asks for ?tab=windows', async () => {
      mockSearch = 'tab=windows';
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false, isAdmin: false, role: null,
        cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
      });
      render(<PrintPage />);

      expect(await screen.findByText(/Configurar etiquetas de cajas/i)).toBeInTheDocument();
      expect(screen.queryByText(/Identificaciones para Ventanillas/i)).not.toBeInTheDocument();
    });

    it.each([
      ['an admin', { isAdmin: true, role: null }],
      ['a window volunteer', { isAdmin: false, role: 'window' }],
    ])('keeps the four tabs for %s with a city', async (_name, auth) => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false,
        cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
        ...auth,
      });
      render(<PrintPage />);

      expect(await screen.findByRole('button', { name: 'Etiquetas de cajas' })).toBeInTheDocument();
      for (const name of EVENT_TABS) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
      }
    });
  });

  describe('label form keeps its data', () => {
    const useTwoInterior = () =>
      mockBoxFetch.mockImplementation(async (path: string) =>
        path === 'logistics/directory/' ? DIRECTORY_TWO_INTERIOR : [],
      );
    const checkbox = (name: RegExp) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

    it('keeps sender, copies and box number after unmount and mount', async () => {
      const first = render(<PrintPage />);
      await screen.findByText(/Configurar etiquetas de cajas/i);
      fireEvent.change(screen.getByPlaceholderText(/Localidad que envía/i), { target: { value: 'Rosario' } });
      fireEvent.change(screen.getByPlaceholderText(/Nombre referente que envía/i), { target: { value: 'Juan' } });
      fireEvent.change(screen.getByPlaceholderText(/DNI referente que envía/i), { target: { value: '123' } });
      fireEvent.change(screen.getByPlaceholderText(/Teléfono referente que envía/i), { target: { value: '456' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } });
      fireEvent.change(screen.getByPlaceholderText(/Vacío = recuadro rellenable/i), { target: { value: '17' } });
      first.unmount();

      render(<PrintPage />);
      await screen.findByText(/Configurar etiquetas de cajas/i);
      expect(screen.getByPlaceholderText(/Localidad que envía/i)).toHaveValue('Rosario');
      expect(screen.getByPlaceholderText(/Nombre referente que envía/i)).toHaveValue('Juan');
      expect(screen.getByPlaceholderText(/DNI referente que envía/i)).toHaveValue('123');
      expect(screen.getByPlaceholderText(/Teléfono referente que envía/i)).toHaveValue('456');
      expect(screen.getByRole('spinbutton')).toHaveValue(4);
      expect(screen.getByPlaceholderText(/Vacío = recuadro rellenable/i)).toHaveValue('17');
    });

    it('keeps interior destinations across route kinds and a remount', async () => {
      useTwoInterior();
      const first = render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Viaja a localidad del interior/i }));
      await waitFor(() => expect(checkbox(/Ciudad Prueba/)).toBeChecked());
      fireEvent.click(checkbox(/Otra Ciudad/));
      fireEvent.click(screen.getByRole('button', { name: /SIGUE A OTRA LOCALIDAD · Vía CABA/i }));
      fireEvent.click(screen.getByRole('button', { name: /Viaja a localidad del interior/i }));
      expect(checkbox(/Ciudad Prueba/)).toBeChecked();
      expect(checkbox(/Otra Ciudad/)).toBeChecked();
      first.unmount();

      render(<PrintPage />);
      // routeKind is persisted too: the interior list shows without clicking.
      await waitFor(() => expect(checkbox(/Otra Ciudad/)).toBeChecked());
      expect(checkbox(/Ciudad Prueba/)).toBeChecked();
    });

    it('does not replace saved destinations with the first city when the directory loads', async () => {
      useTwoInterior();
      sessionStorage.setItem('printForm:v1:routeKind', JSON.stringify('interior'));
      sessionStorage.setItem('printForm:v1:selectedLabelDests', JSON.stringify([35]));
      render(<PrintPage />);

      await waitFor(() => expect(checkbox(/Otra Ciudad/)).toBeChecked());
      expect(checkbox(/Ciudad Prueba/)).not.toBeChecked();
    });

    it('preselects the first interior city when nothing is saved', async () => {
      useTwoInterior();
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Viaja a localidad del interior/i }));

      await waitFor(() => expect(checkbox(/Ciudad Prueba/)).toBeChecked());
      expect(checkbox(/Otra Ciudad/)).not.toBeChecked();
    });
  });
});

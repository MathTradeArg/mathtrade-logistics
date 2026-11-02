import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen } from '@testing-library/react';
import PrintPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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

describe('PrintPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('switches to empty Circle for boxes going via CABA and omits Pago en Destino/Circle for interior localities', async () => {
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
    expect(screen.queryByText('PAGO EN DESTINO')).not.toBeInTheDocument();
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
});

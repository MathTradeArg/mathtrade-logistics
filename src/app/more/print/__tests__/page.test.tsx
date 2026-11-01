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

describe('PrintPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, isAdmin: true });
    mockBoxFetch.mockResolvedValue([]);
  });

  it('renders CABA direct box label with filled Circle, Germán Kijel, Villa Devoto address and Pago en Destino', async () => {
    render(<PrintPage />);

    expect(
      await screen.findByRole('img', { name: /Círculo lleno: Destino final CABA/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CABA' })).toBeInTheDocument();
    expect(screen.getAllByText(/Germán Kijel/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Nueva York 4311/i)).toBeInTheDocument();
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
    expect(screen.getAllByText(/Bahía Blanca/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Damian Yazyi/).length).toBeGreaterThan(0);
    expect(screen.queryByText('PAGO EN DESTINO')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Círculo/i })).not.toBeInTheDocument();
  });

  it('renders A4 signs for sectors without referrer, windows without mesas and with pickup screen text, and tables without MESA DE JUEGOS', async () => {
    render(<PrintPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sectores (Localidades)' }));
    expect(screen.getAllByText(/SECTOR DESARMADO DE CAJAS/i).length).toBeGreaterThan(0);
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

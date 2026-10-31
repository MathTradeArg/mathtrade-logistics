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

  it('renders AMBA direct box label with Rombo, Germán Kijel, Villa Devoto address and Pago en Destino', async () => {
    render(<PrintPage />);

    expect(await screen.findByRole('img', { name: /Rombo: Termina en AMBA/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Germán Kijel/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Nueva York 4311/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PAGO EN DESTINO/i).length).toBeGreaterThan(0);
  });

  it('switches to Círculo for boxes going via AMBA or to interior localities and renders sector/window/table signs', async () => {
    render(<PrintPage />);

    fireEvent.click(await screen.findByRole('button', { name: /SIGUE A OTRA LOCALIDAD · Vía AMBA/i }));
    expect(screen.getByRole('img', { name: /Círculo: Sigue a otra localidad/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Viaja a localidad del interior/i }));
    expect(screen.getAllByText(/Bahía Blanca/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Damian Yazyi/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Sectores (Localidades)' }));
    expect(screen.getAllByText(/SECTOR DESARMADO DE CAJAS/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SECTOR ARMADO DE CAJAS/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Ventanillas' }));
    expect(screen.getByText('Ventanilla 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mesas' }));
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});

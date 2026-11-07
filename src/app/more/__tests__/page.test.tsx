import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { useOperationalExport } from '@/hooks/useOperationalExport';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import MorePage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/useOperationalExport');

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseOperationalExport = useOperationalExport as jest.Mock;
const EXPORT_BUTTON = 'Descargar planilla del evento (Excel)';

describe('MorePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false, updateEventPhase: jest.fn() });
    mockUseOperationalExport.mockReturnValue({
      download: jest.fn(), isLoading: false, error: null, lastDownloadedAt: null,
    });
  });

  it('shows volunteer links and hides admin tools', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false });
    render(<MorePage />);

    expect(screen.getByRole('link', { name: 'Consultar' })).toHaveAttribute('href', '/lookup');
    expect(screen.getByRole('link', { name: 'Nuevo reporte' })).toHaveAttribute('href', '/more/report');
    expect(screen.getByRole('link', { name: 'Ver reportes' })).toHaveAttribute('href', '/more/reports');
    expect(screen.getByRole('link', { name: 'Faltantes AMBA' })).toHaveAttribute('href', '/more/reports/amba-missing');
    expect(screen.getByRole('link', { name: 'Herramientas' })).toHaveAttribute('href', '/more/tools');
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voluntarios' })).not.toBeInTheDocument();
    expect(screen.queryByText('Fase del evento')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mi rol/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
  });

  it('shows "Mi rol" to a volunteer with a role', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes' });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi rol: Cajas' })).toHaveAttribute('href', '/more/role');
  });

  it('the event sheet download is admin-only: a volunteer with a role or a referrer does not see it', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes' });
    const { unmount } = render(<MorePage />);
    expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
    unmount();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes',
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    const second = render(<MorePage />);
    expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
    second.unmount();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    render(<MorePage />);
    expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
  });

  it('shows only the city menu to a pure referrer', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi ciudad' })).toHaveAttribute('href', '/city');
    expect(screen.getByRole('link', { name: 'Instructivo' })).toHaveAttribute('href', '/city/instructivo');
    expect(screen.queryByRole('link', { name: 'Consultar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nuevo reporte' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Faltantes AMBA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Herramientas' })).not.toBeInTheDocument();
  });

  it('shows Voluntarios to a pure referrer only, not to a local volunteer', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    const { unmount } = render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Voluntarios' })).toHaveAttribute('href', '/city/volunteers');
    unmount();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } },
    });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi ciudad' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voluntarios' })).not.toBeInTheDocument();
  });

  it('adds a "Mi ciudad" row for a volunteer+referrer', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes',
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi ciudad: Mendoza' })).toHaveAttribute('href', '/city');
    expect(screen.getByRole('link', { name: 'Voluntarios de Mendoza' })).toHaveAttribute('href', '/city/volunteers');
    expect(screen.getByRole('link', { name: 'Mi rol: Cajas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consultar' })).toBeInTheDocument();
  });

  it('shows admin links for math_admin', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    render(<MorePage />);

    expect(screen.getByText('Fase del evento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('href', '/admin/ready-to-pickup');
    expect(screen.getByRole('link', { name: 'Ventanillas' })).toHaveAttribute('href', '/admin/window-config');
    expect(screen.getByRole('link', { name: 'Voluntarios' })).toHaveAttribute('href', '/admin/volunteers');
    expect(screen.getByRole('button', { name: 'Tele' })).toBeInTheDocument();
    expect(screen.queryByText(/Mi rol/)).not.toBeInTheDocument();
  });

  describe('an admin downloads the event sheet (plan B on paper)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    });

    it('a tap on the button starts the download', () => {
      const download = jest.fn();
      mockUseOperationalExport.mockReturnValue({ download, isLoading: false, error: null, lastDownloadedAt: null });
      render(<MorePage />);
      fireEvent.click(screen.getByRole('button', { name: EXPORT_BUTTON }));
      expect(download).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/Descargada a las/)).not.toBeInTheDocument();
    });

    it('while the sheet is being built the button is disabled and says so', () => {
      const download = jest.fn();
      mockUseOperationalExport.mockReturnValue({ download, isLoading: true, error: null, lastDownloadedAt: null });
      render(<MorePage />);
      const button = screen.getByRole('button', { name: 'Armando la planilla...' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(download).not.toHaveBeenCalled();
    });

    it('an error is shown as an alert and the button stays available to retry', () => {
      const download = jest.fn();
      mockUseOperationalExport.mockReturnValue({
        download, isLoading: false, error: 'No hay conexión o el servidor tardó demasiado. Probá de nuevo.', lastDownloadedAt: null,
      });
      render(<MorePage />);
      expect(screen.getByRole('alert')).toHaveTextContent('No hay conexión o el servidor tardó demasiado. Probá de nuevo.');
      const button = screen.getByRole('button', { name: EXPORT_BUTTON });
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(download).toHaveBeenCalledTimes(1);
    });

    it('after a download it shows the time, so the admin knows how old the paper is', () => {
      mockUseOperationalExport.mockReturnValue({
        download: jest.fn(), isLoading: false, error: null, lastDownloadedAt: new Date(2026, 10, 8, 9, 5, 30),
      });
      render(<MorePage />);
      expect(screen.getByText('Descargada a las 09:05')).toBeInTheDocument();
    });
  });
});

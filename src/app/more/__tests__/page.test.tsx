import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import MorePage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;

describe('MorePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false, updateEventPhase: jest.fn() });
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
  });

  it('shows "Mi rol" to a volunteer with a role', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes' });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi rol: Cajas' })).toHaveAttribute('href', '/more/role');
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
});

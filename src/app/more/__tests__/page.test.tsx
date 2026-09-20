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

    expect(screen.getByRole('link', { name: 'Nuevo reporte' })).toHaveAttribute('href', '/more/report');
    expect(screen.getByRole('link', { name: 'Ver reportes' })).toHaveAttribute('href', '/more/reports');
    expect(screen.getByRole('link', { name: 'Faltantes AMBA' })).toHaveAttribute('href', '/more/reports/amba-missing');
    expect(screen.getByRole('link', { name: 'Herramientas' })).toHaveAttribute('href', '/more/tools');
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    expect(screen.queryByText('Fase del evento')).not.toBeInTheDocument();
  });

  it('shows admin links for math_admin', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    render(<MorePage />);

    expect(screen.getByText('Fase del evento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('href', '/admin/ready-to-pickup');
    expect(screen.getByRole('link', { name: 'Ventanillas' })).toHaveAttribute('href', '/admin/window-config');
    expect(screen.getByRole('button', { name: 'Tele' })).toBeInTheDocument();
  });
});

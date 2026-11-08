import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ProblemPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;

describe('ProblemPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
  });

  it('groups the questions under their headings and links them for Cajas', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes' });
    render(<ProblemPage />);

    expect(screen.getByRole('heading', { name: 'En las cajas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Con un participante' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Con un juego' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /¿Falta un juego en una caja\?/ })).toHaveAttribute('href', '/boxes/in');
    expect(screen.getByRole('link', { name: /¿Apareció un juego que no está en la lista\?/ })).toHaveAttribute('href', '/boxes/in/loose');
    expect(screen.getByRole('link', { name: /¿Dónde está un juego\?/ })).toHaveAttribute('href', '/lookup?mode=game');
    expect(screen.queryByRole('link', { name: /¿El participante no tiene su QR\?/ })).not.toBeInTheDocument();
  });

  it('shows the admin questions to a volunteer without a link, with "Avisá a un organizador"', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'runner' });
    render(<ProblemPage />);

    expect(screen.getByText('¿Alguien no vino a retirar?')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /¿Alguien no vino a retirar\?/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /¿Marcaste mal un juego/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Avisá a un organizador')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'En las cajas' })).toBeInTheDocument();
  });

  it('links the admin questions for an admin', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false, role: null });
    render(<ProblemPage />);

    expect(screen.getByRole('link', { name: /¿Alguien no vino a retirar\?/ })).toHaveAttribute('href', '/admin/ready-to-pickup');
    expect(screen.getByRole('link', { name: /¿Marcaste mal un juego/ })).toHaveAttribute('href', '/more/tools');
    expect(screen.queryByText('Avisá a un organizador')).not.toBeInTheDocument();
  });

  it('sends Ventanilla to Entregar for "sin QR" in phase 2', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'window' });
    render(<ProblemPage />);
    expect(screen.getByRole('link', { name: /¿El participante no tiene su QR\?/ })).toHaveAttribute('href', '/deliver');
  });

  it('waits for auth and phase before rendering', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: null, isAdmin: false, isLoading: true, role: null });
    render(<ProblemPage />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Con un juego' })).not.toBeInTheDocument();
  });

  it('tells a city user without an event role there is nothing here', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    render(<ProblemPage />);
    expect(screen.getByText('No hay nada para mostrarte acá.')).toBeInTheDocument();
  });
});

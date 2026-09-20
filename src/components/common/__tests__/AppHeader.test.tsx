import { useControlPanel } from '@/contexts/ControlPanelContext';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AppHeader from '../AppHeader';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/ControlPanelContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/components/common/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));
jest.mock('../NotificationsBell', () => ({
  __esModule: true,
  default: () => <div data-testid="notifications-bell" />,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseControlPanel = useControlPanel as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('AppHeader', () => {
  const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  const mockLogout = jest.fn();
  const mockOpenPanel = jest.fn();

  const defaultAuthContext = {
    userName: 'Test User',
    isAdmin: false,
    logout: mockLogout,
  };

  const defaultControlPanelContext = {
    openPanel: mockOpenPanel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuthContext);
    mockUseControlPanel.mockReturnValue(defaultControlPanelContext);
    mockUseRouter.mockReturnValue(mockRouter);
  });

  it('renders null if userName is not provided', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthContext, userName: null });
    const { container } = render(<AppHeader />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the page title and icon when provided', () => {
    const PageIcon = () => <div data-testid="page-icon">Icon</div>;
    render(<AppHeader pageTitle="My Page" pageIcon={PageIcon} />);
    expect(screen.getByText('My Page')).toBeInTheDocument();
    expect(screen.getByTestId('page-icon')).toBeInTheDocument();
    expect(screen.getByTestId('notifications-bell')).toBeInTheDocument();
  });

  it('renders back button and handles click', () => {
    const onBackClick = jest.fn();
    render(<AppHeader showBackButton={true} onBackClick={onBackClick} />);
    const backButton = screen.getByRole('button', { name: /volver a la página anterior/i });
    fireEvent.click(backButton);
    expect(onBackClick).toHaveBeenCalledTimes(1);
  });

  it('handles back button click with router.back', () => {
    render(<AppHeader showBackButton={true} />);
    const backButton = screen.getByRole('button', { name: /volver a la página anterior/i });
    fireEvent.click(backButton);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('does not render a dark mode toggle', () => {
    render(<AppHeader />);
    expect(screen.queryByRole('button', { name: /activar modo oscuro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /activar modo claro/i })).not.toBeInTheDocument();
  });

  it('toggles search input visibility', () => {
    render(<AppHeader pageTitle="My Page" />);
    const searchButton = screen.getByRole('button', { name: /abrir búsqueda/i });
    expect(screen.getByText('My Page')).toBeInTheDocument();

    fireEvent.click(searchButton);

    expect(screen.queryByText('My Page')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar juego por ID...')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /cerrar búsqueda/i });
    fireEvent.click(closeButton);

    expect(screen.getByText('My Page')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buscar juego por ID...')).not.toBeInTheDocument();
  });

  it('handles search submit', async () => {
    render(<AppHeader />);
    const searchButton = screen.getByRole('button', { name: /abrir búsqueda/i });
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText('Buscar juego por ID...');
    const form = searchInput.closest('form');

    fireEvent.change(searchInput, { target: { value: '123' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockOpenPanel).toHaveBeenCalledWith('123');
    });

    expect(screen.queryByPlaceholderText('Buscar juego por ID...')).not.toBeInTheDocument();
  });

  it('does not submit search with empty value', () => {
    render(<AppHeader />);
    const searchButton = screen.getByRole('button', { name: /abrir búsqueda/i });
    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText('Buscar juego por ID...');
    const form = searchInput.closest('form');

    fireEvent.change(searchInput, { target: { value: '  ' } });
    fireEvent.submit(form!);

    expect(mockOpenPanel).not.toHaveBeenCalled();
  });

  describe('User Menu', () => {
    it('opens and closes the user menu', () => {
      render(<AppHeader />);
      const menuButton = screen.getByRole('button', { name: 'Menú' });

      fireEvent.click(menuButton);
      expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();

      fireEvent.click(menuButton);
      expect(screen.queryByText('Cerrar Sesión')).not.toBeInTheDocument();
    });

    it('handles logout', () => {
      render(<AppHeader />);
      const menuButton = screen.getByRole('button', { name: 'Menú' });
      fireEvent.click(menuButton);

      const logoutButton = screen.getByText('Cerrar Sesión');
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Cerrar Sesión')).not.toBeInTheDocument();
    });

    it('does not show admin crown or control panel for non-admin', () => {
      render(<AppHeader />);
      expect(screen.queryByTitle('Administrador')).not.toBeInTheDocument();

      const menuButton = screen.getByRole('button', { name: 'Menú' });
      fireEvent.click(menuButton);
      expect(screen.queryByText('Panel de Control')).not.toBeInTheDocument();
    });

    it('shows admin crown but not control panel for admin', () => {
      mockUseAuth.mockReturnValue({ ...defaultAuthContext, isAdmin: true });
      render(<AppHeader />);
      expect(screen.getByTitle('Administrador')).toBeInTheDocument();

      const menuButton = screen.getByRole('button', { name: 'Menú' });
      fireEvent.click(menuButton);
      expect(screen.queryByText('Panel de Control')).not.toBeInTheDocument();
      expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
    });
  });
});

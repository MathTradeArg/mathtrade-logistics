import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import BoxesPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('BoxesPage', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ replace: mockReplace, push: jest.fn() });
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
  });

  it('redirects to /boxes/in in phase 1', async () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    render(<BoxesPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/boxes/in');
    });
    expect(screen.queryByText('Cajas Entrantes')).not.toBeInTheDocument();
    expect(screen.queryByText('Crear Cajas')).not.toBeInTheDocument();
  });

  it('redirects to /boxes/out in phase 2', async () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    render(<BoxesPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/boxes/out');
    });
  });

  it('shows the blocked screen in phase 0', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 0, isLoadingEventPhase: false });
    render(<BoxesPage />);

    expect(screen.getByText('El evento no empezó')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

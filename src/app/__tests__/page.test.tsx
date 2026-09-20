import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import HomePage from '../page';

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

describe('HomePage', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ replace: mockReplace, push: jest.fn() });
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
  });

  it('redirects to /boxes/in in phase 1', async () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    render(<HomePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/boxes/in');
    });
  });

  it('redirects to /deliver in phase 2', async () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    render(<HomePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/deliver');
    });
  });

  it('shows a blocked screen with a link to Más in phase 0', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 0, isLoadingEventPhase: false });
    render(<HomePage />);

    expect(screen.getByText('El evento no empezó')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Más' })).toHaveAttribute('href', '/more');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

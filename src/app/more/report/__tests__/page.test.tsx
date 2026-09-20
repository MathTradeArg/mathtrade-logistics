import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import NewReportPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('kind=missing&box=392&boxNumber=16&item=88&code=501&title=Catan&origin=Salta'),
}));
jest.mock('@/components/common', () => ({
  FullScreenImageModal: () => null,
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div>{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;

describe('NewReportPage preload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseApi.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      execute: jest.fn(),
      clearError: jest.fn(),
    });
  });

    it('skips the wizard and shows box and game ids', async () => {
    render(<NewReportPage />);
    expect(await screen.findByText(/Juego id 88/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Item id 88/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Faltante en caja #16/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toBeInTheDocument();
  });
});

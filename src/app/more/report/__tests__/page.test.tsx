import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewReportPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(
    'kind=missing&box=392&boxNumber=16&origin=Salta&items=' + encodeURIComponent(JSON.stringify([
      { item_id: 88, title: 'Catan', assigned_trade_code: 501 },
      { item_id: 89, title: 'Earth', assigned_trade_code: 502 },
    ])),
  ),
}));
jest.mock('@/components/common', () => ({
  FullScreenImageModal: () => null,
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div>{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;
const mockSubmit = jest.fn();

describe('NewReportPage multi missing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockSubmit.mockResolvedValue({ id: 1 });
    mockUseApi.mockImplementation((endpoint: string) => ({
      data: null,
      isLoading: false,
      error: null,
      execute: endpoint === 'reports/' ? mockSubmit : jest.fn(),
      clearError: jest.fn(),
    }));
  });

  it('lists every selected game and posts one report per item', async () => {
    render(<NewReportPage />);

    expect(await screen.findByText(/Juego id 88/)).toBeInTheDocument();
    expect(screen.getByText(/Juego id 89/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Item id 88/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Item id 89/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar 2 reportes' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar 2 reportes' }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(2));
    expect(mockSubmit.mock.calls[0][0]).toMatchObject({ item: 88, box: 392 });
    expect(mockSubmit.mock.calls[1][0]).toMatchObject({ item: 89, box: 392 });
    expect(await screen.findByText('2 reportes enviados')).toBeInTheDocument();
  });
});

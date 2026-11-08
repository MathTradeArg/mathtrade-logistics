import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewReportPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');
const MISSING_QUERY = 'kind=missing&box=392&boxNumber=16&origin=Salta&items=' + encodeURIComponent(JSON.stringify([
  { item_id: 88, title: 'Catan', assigned_trade_code: 501 },
  { item_id: 89, title: 'Earth', assigned_trade_code: 502 },
]));
let mockQuery = MISSING_QUERY;
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(mockQuery),
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
    mockQuery = MISSING_QUERY;
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
    expect(mockSubmit.mock.calls[0][0]).toMatchObject({ item: 88, box: 392, source: 'logistics' });
    expect(mockSubmit.mock.calls[1][0]).toMatchObject({ item: 89, box: 392, source: 'logistics' });
    expect(await screen.findByText('2 reportes enviados')).toBeInTheDocument();
  });

  it('shows the missing-game question when opened with kind=missing', async () => {
    render(<NewReportPage />);

    expect(await screen.findByText('¿Falta un juego en una caja?')).toBeInTheDocument();
    expect(screen.queryByText('¿Vino roto?')).not.toBeInTheDocument();
  });

  it('shows the broken-game question when opened without kind', async () => {
    mockQuery = '';
    render(<NewReportPage />);

    expect(await screen.findByText('¿Vino roto?')).toBeInTheDocument();
    expect(screen.queryByText('¿Falta un juego en una caja?')).not.toBeInTheDocument();
  });
});

describe('NewReportPage broken game', () => {
  const mockFetchItems = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = '';
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockSubmit.mockResolvedValue({ id: 1 });
    mockUseApi.mockImplementation((endpoint: string) => ({
      data: endpoint === 'logistics/items' ? [{ item_id: 7, id: 7, title: 'Azul', assigned_trade_code: 301 }] : null,
      isLoading: false,
      error: null,
      execute: endpoint === 'reports/' ? mockSubmit : endpoint === 'logistics/items' ? mockFetchItems : jest.fn(),
      clearError: jest.fn(),
    }));
  });

  it('starts at the item search without asking item or user', async () => {
    render(<NewReportPage />);

    expect(await screen.findByPlaceholderText('Título o número de etiqueta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Un ítem' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Un usuario' })).not.toBeInTheDocument();
  });

  it('reports the selected item', async () => {
    render(<NewReportPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Azul/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText(/Juego id 7/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Describí el problema'), { target: { value: 'Caja rota' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit.mock.calls[0][0]).toMatchObject({ item: 7, comment: 'Caja rota', source: 'logistics' });
    expect(mockSubmit.mock.calls[0][0]).not.toHaveProperty('reported_user');
  });

  it('starts at the user search only with kind=user', async () => {
    mockQuery = 'kind=user';
    render(<NewReportPage />);

    expect(await screen.findByLabelText('Buscar participante por nombre')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Título o número de etiqueta')).not.toBeInTheDocument();
    expect(screen.queryByText('¿Vino roto?')).not.toBeInTheDocument();
  });
});

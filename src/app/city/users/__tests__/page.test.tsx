import * as cityApi from '@/hooks/city/cityApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import CityUsersPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/city/cityApi');
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;

const full = [
  { id: 1, first_name: 'Ana', last_name: 'Paz', phone: '0261 555 1234', telegram: '@ana', email: 'ana@x.com',
    bgg_user: 'anabgg', items: 4, trades: 2, commitment: true, paid: true },
  { id: 2, first_name: 'Beto', last_name: 'Gil', phone: null, telegram: null, email: 'beto@x.com',
    bgg_user: 'betobgg', items: 0, trades: 0, commitment: false, paid: false },
];
const local = [
  { id: 1, first_name: 'Ana', last_name: 'Paz', phone: '0261 555 1234', telegram: '@ana' },
  { id: 2, first_name: 'Beto', last_name: 'Gil', phone: null, telegram: null },
];

describe('city users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cityApi.getActiveMathtradeId as jest.Mock).mockResolvedValue(8);
  });

  it('shows a referrer every column, paid rows colored, and filters the committed', async () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } } });
    (cityApi.listCityMembers as jest.Mock).mockResolvedValue(full);
    render(<CityUsersPage />);

    expect(await screen.findByText('Ana Paz')).toBeInTheDocument();
    expect(cityApi.listCityMembers).toHaveBeenCalledWith(8, 7);
    ['Email', 'BGG', 'Ejemplares', 'Intercambios', 'Comprometió', 'Pagó'].forEach((name) => {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: '0261 555 1234' })).toHaveAttribute('href', 'https://wa.me/5492615551234');
    expect(screen.getByRole('link', { name: '@ana' })).toHaveAttribute('href', 'https://t.me/ana');
    const rows = screen.getAllByTestId('member-row');
    expect(rows[0]).toHaveClass('bg-green-50');
    expect(rows[1]).toHaveClass('bg-red-50');

    fireEvent.click(screen.getByRole('checkbox', { name: /COMPROMETIERON/ }));
    expect(screen.queryByText('Beto Gil')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Paz')).toBeInTheDocument();
  });

  it('shows a local volunteer only name, phone and Telegram', async () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } } });
    (cityApi.listCityMembers as jest.Mock).mockResolvedValue(local);
    render(<CityUsersPage />);

    expect(await screen.findByText('Ana Paz')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Nombre', 'Teléfono', 'Telegram']);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('member-row')[0]).not.toHaveClass('bg-green-50');
  });
});

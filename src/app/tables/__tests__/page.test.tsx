import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TablesPage from '../page';

const mockFetchTables = jest.fn();
const mockPatchMe = jest.fn();
const mockApplyTables = jest.fn();
const mockSetSuccess = jest.fn();
const mockSetError = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isAdmin: false,
    isLoading: false,
    role: 'tables',
    tables: ['01'],
    applyTables: mockApplyTables,
  }),
}));

jest.mock('@/contexts/ActionStatusContext', () => ({
  useActionStatus: () => ({
    setSuccess: mockSetSuccess,
    setError: mockSetError,
  }),
}));

jest.mock('@/hooks/useApi', () => ({
  useApi: (endpoint: string) => {
    if (endpoint === 'logistics/tables/') {
      return { execute: mockFetchTables };
    }
    return { execute: mockPatchMe };
  },
}));

describe('TablesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchTables.mockResolvedValue({
      all_tables: ['01', '02'],
      assigned_tables: ['01'],
      tables: [
        {
          table_number: '01',
          volunteers: [{ id: 1, user_id: 10, first_name: 'Vol', last_name: 'Uno' }],
          summary: {
            recipients_total: 2,
            recipients_ready: 1,
            recipients_complete_on_table: 1,
            games_total: 3,
            games_on_table: 2,
            games_missing: 1,
            games_delivered: 0,
          },
          recipients: [
            {
              membership_id: 100,
              user_id: 200,
              uuid: 'uuid-1',
              first_name: 'Ana',
              last_name: 'Alvarez',
              username: 'ana_a',
              table_number: '01',
              status: null,
              games_total: 1,
              games_ready: 1,
              games_missing: 0,
              games_delivered: 0,
              pending_drop_off_count: 0,
              is_table_complete: true,
              is_ready_to_pickup: true,
              games: [
                {
                  trade_id: 1,
                  assigned_trade_code: 101,
                  title: 'Catan',
                  status: 5,
                  status_display: 'En evento',
                  from_first_name: 'Pedro',
                  from_last_name: 'Gomez',
                  from_location: 'Rosario',
                },
              ],
            },
            {
              membership_id: 101,
              user_id: 201,
              uuid: 'uuid-2',
              first_name: 'Bruno',
              last_name: 'Biazzi',
              username: 'bruno_b',
              table_number: '01',
              status: null,
              games_total: 2,
              games_ready: 1,
              games_missing: 1,
              games_delivered: 0,
              pending_drop_off_count: 0,
              is_table_complete: false,
              is_ready_to_pickup: false,
              games: [
                {
                  trade_id: 2,
                  assigned_trade_code: 103,
                  title: 'Azul',
                  status: 5,
                  status_display: 'En evento',
                  from_first_name: 'Luis',
                  from_last_name: 'Perez',
                  from_location: 'Córdoba',
                },
                {
                  trade_id: 3,
                  assigned_trade_code: 104,
                  title: 'Root',
                  status: 2,
                  status_display: 'En origen',
                  from_first_name: 'Mario',
                  from_last_name: 'Diaz',
                  from_location: 'Mendoza',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('renders recipients, ready status, missing games, and allows self-assigning tables', async () => {
    render(<TablesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Alvarez Ana/)).toBeInTheDocument();
    });
    expect(screen.getByText('Listo para retirar')).toBeInTheDocument();
    expect(screen.getByText('Faltan 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('00101 · Catan')).toBeInTheDocument();
    expect(screen.getByText('00104 · Root')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Faltan/i }));
    expect(screen.getByText('00104 · Root')).toBeInTheDocument();
    expect(screen.queryByText('00101 · Catan')).not.toBeInTheDocument();

    mockPatchMe.mockResolvedValue({ tables: ['01', '02'] });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar mis mesas' }));
    const mesa02Buttons = screen.getAllByRole('button', { name: 'Mesa 02' });
    fireEvent.click(mesa02Buttons[mesa02Buttons.length - 1]);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar mis mesas' }));

    await waitFor(() => {
      expect(mockPatchMe).toHaveBeenCalledWith({ tables: ['01', '02'] });
    });
  });
});

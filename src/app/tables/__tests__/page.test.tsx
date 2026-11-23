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

  it('does not count already delivered games in the recipient missing/on-table totals', async () => {
    const game = (id: number, code: number, title: string, status: number) => ({
      trade_id: id,
      assigned_trade_code: code,
      title,
      status,
      status_display: 'x',
      from_first_name: 'Pedro',
      from_last_name: 'Gomez',
      from_location: 'Rosario',
    });
    mockFetchTables.mockResolvedValue({
      all_tables: ['01'],
      assigned_tables: ['01'],
      tables: [
        {
          table_number: '01',
          volunteers: [],
          summary: {
            recipients_total: 1,
            recipients_ready: 0,
            recipients_complete_on_table: 0,
            games_total: 5,
            games_on_table: 1,
            games_missing: 1,
            games_delivered: 3,
          },
          recipients: [
            {
              membership_id: 300,
              user_id: 400,
              uuid: 'uuid-3',
              first_name: 'Carla',
              last_name: 'Casas',
              username: 'carla_c',
              table_number: '01',
              status: null,
              games_total: 5,
              games_ready: 1,
              games_missing: 1,
              games_delivered: 3,
              pending_drop_off_count: 0,
              is_table_complete: false,
              is_ready_to_pickup: false,
              games: [
                game(10, 201, 'Uno', 6),
                game(11, 202, 'Dos', 6),
                game(12, 203, 'Tres', 6),
                game(13, 204, 'Cuatro', 5),
                game(14, 205, 'Cinco', 2),
              ],
            },
          ],
        },
      ],
    });

    render(<TablesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Casas Carla/)).toBeInTheDocument();
    });
    expect(screen.getByText('Faltan 1 de 2')).toBeInTheDocument();
    expect(screen.getByText(/1\/2 en mesa/)).toBeInTheDocument();
    expect(screen.getByText(/3 ya entregados/)).toBeInTheDocument();
    // top summary card: 1 on table out of the 2 not yet delivered (summary says 5 total, 3 delivered)
    expect(screen.getByText('Juegos en mesa').nextElementSibling).toHaveTextContent('1/2');
  });

  it('searching a person only matches recipients, not the people who deliver games to them', async () => {
    render(<TablesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Biazzi Bruno/)).toBeInTheDocument();
    });

    // "Perez" only appears as the sender of Bruno's game (Luis Perez)
    fireEvent.change(screen.getByLabelText('Buscar en las mesas'), { target: { value: 'perez' } });
    expect(screen.queryByText(/Biazzi Bruno/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alvarez Ana/)).not.toBeInTheDocument();

    // the recipient's own name still works
    fireEvent.change(screen.getByLabelText('Buscar en las mesas'), { target: { value: 'bruno' } });
    expect(screen.getByText(/Biazzi Bruno/)).toBeInTheDocument();

    // and so does the "Faltan" tab
    fireEvent.change(screen.getByLabelText('Buscar en las mesas'), { target: { value: 'mario' } });
    fireEvent.click(screen.getByRole('button', { name: /Faltan/i }));
    expect(screen.queryByText('00104 · Root')).not.toBeInTheDocument();
  });

  it('groups recipients by table and lets you collapse each group and each recipient', async () => {
    const rec = (id: number, first: string, last: string, table: string, gameTitle: string) => ({
      membership_id: id,
      user_id: id + 1000,
      uuid: `uuid-${id}`,
      first_name: first,
      last_name: last,
      username: `${first.toLowerCase()}_x`,
      table_number: table,
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
          trade_id: id,
          assigned_trade_code: id,
          title: gameTitle,
          status: 5,
          status_display: 'En evento',
          from_first_name: 'Pedro',
          from_last_name: 'Gomez',
          from_location: 'Rosario',
        },
      ],
    });
    const summary = {
      recipients_total: 1,
      recipients_ready: 1,
      recipients_complete_on_table: 1,
      games_total: 1,
      games_on_table: 1,
      games_missing: 0,
      games_delivered: 0,
    };
    mockFetchTables.mockResolvedValue({
      all_tables: ['01', '02'],
      assigned_tables: ['01', '02'],
      tables: [
        { table_number: '01', volunteers: [], summary, recipients: [rec(1, 'Zoe', 'Zapata', '01', 'Juego Zoe')] },
        { table_number: '02', volunteers: [], summary, recipients: [rec(2, 'Abel', 'Aguirre', '02', 'Juego Abel')] },
      ],
    });

    render(<TablesPage />);

    const group01 = await screen.findByRole('button', { name: /^Mesa 01 · 1 receptor/ });
    const group02 = screen.getByRole('button', { name: /^Mesa 02 · 1 receptor/ });
    expect(group01).toHaveAttribute('aria-expanded', 'true');

    // groups are ordered by table, not by recipient name (Zapata is on table 01)
    expect(
      group01.compareDocumentPosition(group02) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText(/Juego Zoe/)).toBeInTheDocument();
    expect(screen.getByText(/Juego Abel/)).toBeInTheDocument();

    // collapse a recipient: games hidden, name still visible
    fireEvent.click(screen.getByRole('button', { name: /Zapata Zoe/ }));
    expect(screen.queryByText(/Juego Zoe/)).not.toBeInTheDocument();
    expect(screen.getByText(/Zapata Zoe/)).toBeInTheDocument();
    expect(screen.getByText(/Juego Abel/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zapata Zoe/ }));
    expect(screen.getByText(/Juego Zoe/)).toBeInTheDocument();

    // collapse a whole table group
    fireEvent.click(group02);
    expect(group02).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Aguirre Abel/)).not.toBeInTheDocument();
    expect(screen.getByText(/Zapata Zoe/)).toBeInTheDocument();
    fireEvent.click(group02);
    expect(screen.getByText(/Aguirre Abel/)).toBeInTheDocument();
  });
});

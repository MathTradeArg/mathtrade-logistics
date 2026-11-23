import { useApi } from '@/hooks/useApi';
import type { UserWithWindow, WindowConfig } from '@/types/window';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import DisplayReadyToPickupPage from '../page';

jest.mock('@/hooks/useApi');
jest.mock('@/utils/windowStorage', () => ({
  getGlobalPollingInterval: () => 10,
  getMaxUsersForWindow: () => 10,
}));

const mockUseApi = useApi as jest.Mock;

let usersExecute: jest.Mock;
let configExecute: jest.Mock;

function serverHas(config: WindowConfig[], users: Partial<UserWithWindow>[]) {
  configExecute.mockResolvedValue(config);
  usersExecute.mockResolvedValue(users.map((u, i) => ({
    id: i + 1,
    first_name: `Nombre${i + 1}`,
    last_name: 'Apellido',
    username: `user${i + 1}`,
    roles: [],
    status: 'present',
    ...u,
  })));
}

const card = (title: string) => screen.getByRole('heading', { level: 2, name: title }).closest('section') as HTMLElement;

describe('DisplayReadyToPickupPage (TV)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersExecute = jest.fn();
    configExecute = jest.fn();
    mockUseApi.mockImplementation((endpoint: string) => {
      if (endpoint === 'logistics/users/ready-to-pickup/') return { execute: usersExecute };
      return { execute: configExecute };
    });
  });

  it('un listo con mesa sin ventanilla aparece en la tarjeta "Sin ventanilla"', async () => {
    serverHas([{ id: 1, name: 'Ventanilla 1', tables: ['1'] }], [
      { first_name: 'Lucia', table_number: '7', window_id: null, window_name: null },
    ]);
    render(<DisplayReadyToPickupPage />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Sin ventanilla' })).toBeInTheDocument();
    const orphan = card('Sin ventanilla');
    expect(within(orphan).getByText('Lucia Apellido')).toBeInTheDocument();
    expect(within(orphan).getByText('Mesas sin ventanilla: avisá a un organizador')).toBeInTheDocument();
  });

  it('un listo cuyo window_id no está en la config también', async () => {
    serverHas([{ id: 1, name: 'Ventanilla 1', tables: ['1'] }], [
      { first_name: 'Bruno', table_number: '9', window_id: 99, window_name: 'Vieja' },
    ]);
    render(<DisplayReadyToPickupPage />);

    await screen.findByRole('heading', { level: 2, name: 'Sin ventanilla' });
    expect(within(card('Sin ventanilla')).getByText('Bruno Apellido')).toBeInTheDocument();
  });

  it('un listo con ventanilla sigue en su ventanilla y no en "Sin ventanilla"', async () => {
    serverHas([{ id: 1, name: 'Ventanilla 1', tables: ['1'] }], [
      { first_name: 'Ana', table_number: '1', window_id: 1, window_name: 'Ventanilla 1' },
      { first_name: 'Lucia', table_number: '7', window_id: null },
    ]);
    render(<DisplayReadyToPickupPage />);

    await screen.findByRole('heading', { level: 2, name: 'Sin ventanilla' });
    expect(within(card('Ventanilla 1')).getByText('Ana Apellido')).toBeInTheDocument();
    expect(within(card('Sin ventanilla')).queryByText('Ana Apellido')).not.toBeInTheDocument();
    expect(within(card('Ventanilla 1')).queryByText('Lucia Apellido')).not.toBeInTheDocument();
    // Footer totals include the orphan card.
    expect(screen.getByText('Listos: 2')).toBeInTheDocument();
  });

  it('los voluntarios/admins siguen sin aparecer', async () => {
    serverHas([], [
      { first_name: 'Vol', window_id: null, roles: ['volunteer'] },
      { first_name: 'Adm', window_id: null, roles: ['admin'] },
    ]);
    render(<DisplayReadyToPickupPage />);

    expect(await screen.findByText('No hay usuarios listos para retirar en este momento.')).toBeInTheDocument();
    expect(screen.queryByText('Vol Apellido')).not.toBeInTheDocument();
    expect(screen.queryByText('Adm Apellido')).not.toBeInTheDocument();
  });

  it('los completed siguen sin aparecer', async () => {
    serverHas([], [{ first_name: 'Camila', window_id: null, status: 'completed' }]);
    render(<DisplayReadyToPickupPage />);

    expect(await screen.findByText('No hay usuarios listos para retirar en este momento.')).toBeInTheDocument();
    expect(screen.queryByText('Camila Apellido')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Sin ventanilla' })).not.toBeInTheDocument();
  });

  it('sin huérfanos no hay tarjeta "Sin ventanilla"', async () => {
    serverHas([{ id: 1, name: 'Ventanilla 1', tables: ['1'] }], [
      { first_name: 'Ana', table_number: '1', window_id: 1 },
    ]);
    render(<DisplayReadyToPickupPage />);

    expect(await screen.findByText('Ana Apellido')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Sin ventanilla' })).not.toBeInTheDocument();
  });

  it('sin usuarios sigue mostrando "No hay usuarios listos para retirar"', async () => {
    serverHas([{ id: 1, name: 'Ventanilla 1', tables: ['1'] }], []);
    render(<DisplayReadyToPickupPage />);

    expect(await screen.findByText('No hay usuarios listos para retirar en este momento.')).toBeInTheDocument();
  });

  it('pide ready-to-pickup sin ?include', async () => {
    serverHas([], []);
    render(<DisplayReadyToPickupPage />);

    await screen.findByText('No hay usuarios listos para retirar en este momento.');
    expect(usersExecute).toHaveBeenCalled();
    usersExecute.mock.calls.forEach((args) => {
      expect(args.filter((a: unknown) => typeof a === 'string' && a.includes('include'))).toHaveLength(0);
      expect(args[1]).toBeUndefined();
    });
  });
});

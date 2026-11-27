import { useApi } from '@/hooks/useApi';
import type { UserWithWindow, WindowConfig } from '@/types/window';
import '@testing-library/jest-dom';
import { act, render, screen, within } from '@testing-library/react';
import DisplayReadyToPickupPage from '../page';

jest.mock('@/hooks/useApi');
let mockQueueMode = false;
let mockCallSlots = 4;

jest.mock('@/utils/windowStorage', () => ({
  getGlobalPollingInterval: () => 10,
  getMaxUsersForWindow: () => 10,
  getQueueMode: () => mockQueueMode,
  getCallSlots: () => mockCallSlots,
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
    mockQueueMode = false;
    mockCallSlots = 4;
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

describe('DisplayReadyToPickupPage polling', () => {
  let fetchUsers: jest.Mock;
  let fetchConfig: jest.Mock;
  let resolvers: Array<(value: unknown[]) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueMode = false;
    mockCallSlots = 4;
    jest.useFakeTimers();
    resolvers = [];
    // Slow network: the users request stays pending until the test resolves it.
    fetchUsers = jest.fn(() => new Promise((resolve) => { resolvers.push(resolve as (v: unknown[]) => void); }));
    fetchConfig = jest.fn().mockResolvedValue([]);
    mockUseApi.mockImplementation((endpoint: string) => ({
      execute: endpoint === 'logistics/users/ready-to-pickup/' ? fetchUsers : fetchConfig,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('skips a tick while a request is still in flight', async () => {
    render(<DisplayReadyToPickupPage />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    expect(fetchUsers).toHaveBeenCalledTimes(1);

    await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });
    expect(fetchUsers).toHaveBeenCalledTimes(1);
    expect(fetchConfig).toHaveBeenCalledTimes(1);
  });

  it('polls again once the previous request settled, and does not rebuild the interval when loading ends', async () => {
    render(<DisplayReadyToPickupPage />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await act(async () => { resolvers[0]([]); await jest.advanceTimersByTimeAsync(0); });
    expect(screen.queryByText('Cargando información...')).not.toBeInTheDocument();

    // Initial fetch finished at t=0 and the interval was created at t=0: the
    // next tick is at 10 s. If isLoadingData rebuilt it, it would still fire at
    // 10 s from the rebuild, so check no extra fetch happens before that.
    await act(async () => { await jest.advanceTimersByTimeAsync(9_999); });
    expect(fetchUsers).toHaveBeenCalledTimes(1);
    await act(async () => { await jest.advanceTimersByTimeAsync(1); });
    expect(fetchUsers).toHaveBeenCalledTimes(2);
  });

  it('keeps one interval across re-renders (fetchData identity is stable)', async () => {
    const setSpy = jest.spyOn(global, 'setInterval');
    render(<DisplayReadyToPickupPage />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    await act(async () => { resolvers[0]([]); await jest.advanceTimersByTimeAsync(0); });
    const pollers = setSpy.mock.calls.filter(([, ms]) => ms === 10_000);
    expect(pollers).toHaveLength(1);
    setSpy.mockRestore();
  });
});

describe('DisplayReadyToPickupPage con cola activa', () => {
  const FIXED_MESSAGE = 'Tené a mano tu QR y acercate a la boca cuando veas tu nombre';

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueMode = true;
    mockCallSlots = 4;
    usersExecute = jest.fn();
    configExecute = jest.fn();
    mockUseApi.mockImplementation((endpoint: string) => {
      if (endpoint === 'logistics/users/ready-to-pickup/') return { execute: usersExecute };
      return { execute: configExecute };
    });
  });

  it('muestra el mensaje fijo, quienes pasan ahora y el total en espera', async () => {
    serverHas([], [
      { first_name: 'Ana' }, { first_name: 'Bruno' }, { first_name: 'Camila' },
      { first_name: 'Dario' }, { first_name: 'Eva' }, { first_name: 'Fede' },
    ]);
    render(<DisplayReadyToPickupPage />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Pasan ahora' })).toBeInTheDocument();
    expect(screen.getByText(FIXED_MESSAGE)).toBeInTheDocument();
    ['Ana', 'Bruno', 'Camila', 'Dario'].forEach((name) => {
      expect(screen.getByText(`${name} Apellido`)).toBeInTheDocument();
    });
    expect(screen.queryByText('Eva Apellido')).not.toBeInTheDocument();
    expect(screen.getByText('En espera: 2')).toBeInTheDocument();
  });

  it('no pide la config de ventanillas y si los listos', async () => {
    serverHas([], [{ first_name: 'Ana' }]);
    render(<DisplayReadyToPickupPage />);

    await screen.findByText('Ana Apellido');
    expect(configExecute).not.toHaveBeenCalled();
    expect(usersExecute).toHaveBeenCalled();
  });

  it('con la fila vacia muestra que no hay nadie', async () => {
    serverHas([], []);
    render(<DisplayReadyToPickupPage />);

    expect(await screen.findByText('No hay nadie en la fila en este momento.')).toBeInTheDocument();
    expect(screen.queryByText('Pasan ahora')).not.toBeInTheDocument();
    expect(screen.queryByText(/En espera/)).not.toBeInTheDocument();
  });

  it('respeta callSlots', async () => {
    mockCallSlots = 2;
    serverHas([], [
      { first_name: 'Ana' }, { first_name: 'Bruno' }, { first_name: 'Camila' },
      { first_name: 'Dario' }, { first_name: 'Eva' },
    ]);
    render(<DisplayReadyToPickupPage />);

    await screen.findByText('Ana Apellido');
    expect(screen.getByText('Bruno Apellido')).toBeInTheDocument();
    expect(screen.queryByText('Camila Apellido')).not.toBeInTheDocument();
    expect(screen.getByText('En espera: 3')).toBeInTheDocument();
  });

  it('respeta a los que estan en mesa aunque esten al final de la lista', async () => {
    serverHas([], [
      { first_name: 'Ana' }, { first_name: 'Bruno' }, { first_name: 'Camila' },
      { first_name: 'Dario' }, { first_name: 'Mesa', status: 'receiving' },
    ]);
    render(<DisplayReadyToPickupPage />);

    await screen.findByText('Mesa Apellido');
    ['Ana', 'Bruno', 'Camila'].forEach((name) => {
      expect(screen.getByText(`${name} Apellido`)).toBeInTheDocument();
    });
    expect(screen.queryByText('Dario Apellido')).not.toBeInTheDocument();
    expect(screen.getByText('En espera: 1')).toBeInTheDocument();
  });

  it('ignora staff y completed', async () => {
    serverHas([], [
      { first_name: 'Ana' },
      { first_name: 'Vol', roles: ['volunteer'] },
      { first_name: 'Adm', roles: ['admin'] },
      { first_name: 'Camila', status: 'completed' },
    ]);
    render(<DisplayReadyToPickupPage />);

    await screen.findByText('Ana Apellido');
    expect(screen.queryByText('Vol Apellido')).not.toBeInTheDocument();
    expect(screen.queryByText('Adm Apellido')).not.toBeInTheDocument();
    expect(screen.queryByText('Camila Apellido')).not.toBeInTheDocument();
    expect(screen.queryByText(/En espera/)).not.toBeInTheDocument();
  });

  it('no muestra la grilla de ventanillas ni los totales por estado', async () => {
    serverHas([], [{ first_name: 'Ana' }]);
    render(<DisplayReadyToPickupPage />);

    await screen.findByText('Ana Apellido');
    expect(screen.queryByText(/Listos: /)).not.toBeInTheDocument();
    expect(screen.getByText(/Esta pantalla se actualiza automáticamente cada 10 segundos/)).toBeInTheDocument();
  });
});

describe('DisplayReadyToPickupPage cola activa con polling', () => {
  const originalLocation = window.location;
  let reload: jest.Mock;
  let fetchUsers: jest.Mock;

  const row = (id: number, name: string, status = 'present') => ({
    id,
    first_name: name,
    last_name: 'Apellido',
    username: `user${id}`,
    roles: [],
    status,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockQueueMode = true;
    mockCallSlots = 4;
    reload = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });
    fetchUsers = jest.fn();
    const fetchConfig = jest.fn().mockResolvedValue([]);
    mockUseApi.mockImplementation((endpoint: string) => ({
      execute: endpoint === 'logistics/users/ready-to-pickup/' ? fetchUsers : fetchConfig,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('se desliza en el siguiente polling cuando alguien sale de la fila', async () => {
    fetchUsers
      .mockResolvedValueOnce([
        row(1, 'A', 'receiving'), row(2, 'B'), row(3, 'C'), row(4, 'D'), row(5, 'E'), row(6, 'F'),
      ])
      .mockResolvedValue([row(2, 'B'), row(3, 'C'), row(4, 'D'), row(5, 'E'), row(6, 'F'), row(1, 'A', 'completed')]);
    render(<DisplayReadyToPickupPage />);
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });

    expect(screen.getByText('A Apellido')).toBeInTheDocument();
    expect(screen.queryByText('E Apellido')).not.toBeInTheDocument();
    expect(screen.getByText('En espera: 2')).toBeInTheDocument();

    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });

    expect(screen.queryByText('A Apellido')).not.toBeInTheDocument();
    ['B', 'C', 'D', 'E'].forEach((name) => {
      expect(screen.getByText(`${name} Apellido`)).toBeInTheDocument();
    });
    expect(screen.getByText('En espera: 1')).toBeInTheDocument();
  });

  it('recarga cuando cambia queueMode o callSlots', async () => {
    fetchUsers.mockResolvedValue([]);
    render(<DisplayReadyToPickupPage />);
    await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });
    expect(reload).not.toHaveBeenCalled();

    mockCallSlots = 6;
    await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('recarga cuando se apaga queueMode', async () => {
    fetchUsers.mockResolvedValue([]);
    render(<DisplayReadyToPickupPage />);
    await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });

    mockQueueMode = false;
    await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

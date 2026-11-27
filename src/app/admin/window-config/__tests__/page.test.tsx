import { ActionStatusProvider, useActionStatus } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import WindowConfigPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;

type Win = { id: number; name: string; tables: string[] };

let configExecute: jest.Mock;
let saveExecute: jest.Mock;
let tablesExecute: jest.Mock;

function StatusOut() {
  const { actionError, actionSuccess } = useActionStatus();
  return (
    <>
      {actionError && <p role="alert">{actionError}</p>}
      {actionSuccess && <p role="status">{actionSuccess}</p>}
    </>
  );
}

const renderPage = () => render(
  <ActionStatusProvider>
    <WindowConfigPage />
    <StatusOut />
  </ActionStatusProvider>,
);

/** Server state: GET returns the given windows; available-tables excludes the
 *  tables already assigned (as the BE does). */
function serverHas(windows: Win[], freeTables: string[] = []) {
  configExecute.mockResolvedValue(windows);
  tablesExecute.mockResolvedValue({
    available_tables: freeTables,
    assigned_tables: windows.flatMap(w => w.tables),
  });
}

const card = (name: string) => screen.getByDisplayValue(name).closest('div.p-3') as HTMLElement;
const save = () => fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración/ }));
const lastBody = () => saveExecute.mock.calls[saveExecute.mock.calls.length - 1][0];

describe('WindowConfigPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    configExecute = jest.fn();
    saveExecute = jest.fn().mockImplementation((body: Win[]) =>
      Promise.resolve(body.map((w, i) => ({ id: w.id ?? 100 + i, name: w.name, tables: w.tables }))));
    tablesExecute = jest.fn();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    mockUseApi.mockImplementation((endpoint: string, options?: { method?: string }) => {
      if (endpoint === 'logistics/windows/available-tables/') return { execute: tablesExecute };
      if (options?.method === 'POST') return { execute: saveExecute };
      return { execute: configExecute };
    });
  });

  describe('a window keeps its identity (id) across saves, so its users stay on the display', () => {
    it('renaming an existing window sends its own id, not a new one', async () => {
      serverHas([{ id: 7, name: 'V1', tables: ['10'] }]);
      renderPage();
      fireEvent.change(await screen.findByDisplayValue('V1'), { target: { value: 'Entrega A' } });
      save();

      await waitFor(() => expect(saveExecute).toHaveBeenCalledTimes(1));
      expect(lastBody()).toEqual([{ id: 7, name: 'Entrega A', tables: ['10'] }]);
    });

    it('a window added on screen is sent without id, so the server creates it', async () => {
      serverHas([{ id: 7, name: 'V1', tables: ['10'] }]);
      renderPage();
      await screen.findByDisplayValue('V1');
      fireEvent.click(screen.getByRole('button', { name: /Agregar Ventanilla/ }));
      save();

      await waitFor(() => expect(saveExecute).toHaveBeenCalledTimes(1));
      const body = lastBody();
      expect(body).toHaveLength(2);
      expect(body[0]).not.toHaveProperty('id');
      expect(body[0]).toEqual({ name: 'Ventanilla 2', tables: [] });
      expect(body[1]).toEqual({ id: 7, name: 'V1', tables: ['10'] });
    });

    it('after saving it reloads the configuration and the next save uses the real ids', async () => {
      serverHas([{ id: 7, name: 'V1', tables: ['10'] }]);
      renderPage();
      await screen.findByDisplayValue('V1');
      fireEvent.click(screen.getByRole('button', { name: /Agregar Ventanilla/ }));

      serverHas([{ id: 12, name: 'Ventanilla 2', tables: [] }, { id: 7, name: 'V1', tables: ['10'] }]);
      save();
      await waitFor(() => expect(configExecute).toHaveBeenCalledTimes(2));
      expect(await screen.findByRole('status')).toHaveTextContent('Configuración guardada exitosamente.');

      save();
      await waitFor(() => expect(saveExecute).toHaveBeenCalledTimes(2));
      expect(lastBody()).toEqual([
        { id: 12, name: 'Ventanilla 2', tables: [] },
        { id: 7, name: 'V1', tables: ['10'] },
      ]);
    });

    it('a new window never takes the list id of a real window', async () => {
      serverHas([{ id: 3, name: 'A', tables: [] }, { id: 9, name: 'B', tables: [] }]);
      renderPage();
      await screen.findByDisplayValue('A');
      fireEvent.click(screen.getByRole('button', { name: /Agregar Ventanilla/ }));
      // The new window is prepended: its name input is the first textbox.
      fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Nueva' } });
      save();

      await waitFor(() => expect(saveExecute).toHaveBeenCalledTimes(1));
      // Only the edited new window changed: a clash with id 3 or 9 would rename A or B too.
      expect(lastBody().map((w: Win) => w.name)).toEqual(['Nueva', 'A', 'B']);
    });
  });

  describe('a table can move from one window to another in a single save', () => {
    it('moving table 11 from A to B sends both windows with their ids and the final tables', async () => {
      serverHas([{ id: 1, name: 'A', tables: ['10', '11'] }, { id: 2, name: 'B', tables: ['12'] }]);
      renderPage();
      await screen.findByDisplayValue('A');

      const mesa11 = within(card('A')).getByText(/Mesa 11/);
      fireEvent.click(within(mesa11).getByTitle('Quitar mesa'));
      // The freed table must be offered to B even though available-tables (server) lists it as assigned.
      expect(within(card('B')).getByRole('option', { name: 'Mesa 11' })).toBeInTheDocument();
      fireEvent.change(within(card('B')).getByRole('combobox'), { target: { value: '11' } });
      save();

      await waitFor(() => expect(saveExecute).toHaveBeenCalledTimes(1));
      expect(lastBody()).toEqual([
        { id: 1, name: 'A', tables: ['10'] },
        { id: 2, name: 'B', tables: ['12', '11'] },
      ]);
    });
  });

  describe('a rejected save tells the admin why, in Spanish', () => {
    it.each([
      ['tables', "Los siguientes números de mesa ya están asignados a otras ventanillas: ['10']"],
      ['id', 'La ventanilla 7 no existe.'],
    ])('a 400 on %s shows the server reason instead of the generic error', async (field, reason) => {
      serverHas([{ id: 7, name: 'V1', tables: ['10'] }]);
      const err = new Error('El servidor respondió con un error (400).') as Error & { body: unknown };
      err.body = { [field]: [reason] };
      saveExecute.mockRejectedValue(err);
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      renderPage();
      await screen.findByDisplayValue('V1');
      save();

      expect(await screen.findByRole('alert')).toHaveTextContent(reason);
      expect(screen.getByRole('alert')).not.toHaveTextContent('error (400)');
      expect(configExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('una carga fallida no permite guardar', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    it('si la carga falla no muestra el formulario ni Guardar', async () => {
      configExecute.mockRejectedValue(new Error('Network'));
      tablesExecute.mockResolvedValue({ available_tables: ['1'], assigned_tables: [] });
      renderPage();

      expect(await screen.findByText(/No se pudo cargar la configuración de ventanillas/)).toBeInTheDocument();
      const banner = screen.getByText(/No se pudo cargar la configuración de ventanillas/).closest('[role="alert"]') as HTMLElement;
      expect(banner).toBeInTheDocument();
      expect(within(banner).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Guardar Configuración/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Agregar Ventanilla/ })).not.toBeInTheDocument();
      expect(saveExecute).not.toHaveBeenCalled();
    });

    it('una respuesta vacía del GET también cuenta como carga fallida', async () => {
      configExecute.mockResolvedValue(undefined);
      tablesExecute.mockResolvedValue({ available_tables: [], assigned_tables: [] });
      renderPage();

      expect(await screen.findByText(/No se pudo cargar la configuración de ventanillas/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Guardar Configuración/ })).not.toBeInTheDocument();
    });

    it('Reintentar recarga y recién ahí aparece el formulario', async () => {
      configExecute
        .mockRejectedValueOnce(new Error('Network'))
        .mockResolvedValueOnce([{ id: 7, name: 'V1', tables: ['10'] }]);
      tablesExecute.mockResolvedValue({ available_tables: [], assigned_tables: ['10'] });
      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByRole('button', { name: /Guardar Configuración/ })).toBeInTheDocument();
      expect(screen.getByDisplayValue('V1')).toBeInTheDocument();
      expect(configExecute).toHaveBeenCalledTimes(2);
      expect(screen.queryByText(/No se pudo cargar la configuración de ventanillas/)).not.toBeInTheDocument();
    });
  });

  describe('guardar cero ventanillas es una decisión explícita', () => {
    it('guardar con cero ventanillas pide confirmar y manda ?allow_empty=1', async () => {
      serverHas([]);
      renderPage();
      await screen.findByRole('button', { name: /Guardar Configuración/ });
      save();

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent('Vas a borrar todas las ventanillas');
      expect(saveExecute).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, borrar todo' }));
      await waitFor(() => expect(saveExecute).toHaveBeenCalledTimes(1));
      expect(saveExecute).toHaveBeenCalledWith([], '?allow_empty=1');
    });

    it('al cancelar no guarda nada', async () => {
      serverHas([]);
      renderPage();
      await screen.findByRole('button', { name: /Guardar Configuración/ });
      save();

      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(saveExecute).not.toHaveBeenCalled();
    });

    it('guardar con ventanillas no pide confirmación ni manda el flag', async () => {
      serverHas([{ id: 7, name: 'V1', tables: ['10'] }]);
      renderPage();
      await screen.findByDisplayValue('V1');
      save();

      await waitFor(() => expect(saveExecute).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(saveExecute.mock.calls[0][1]).toBeUndefined();
    });
  });

  describe('avisa qué mesas no tienen ventanilla (sus participantes no salen en la tele)', () => {
    it('avisa cuántas mesas quedan sin ventanilla', async () => {
      serverHas([{ id: 1, name: 'A', tables: ['1'] }], ['2', '3']);
      renderPage();
      await screen.findByDisplayValue('A');

      expect(screen.getByText('2 mesas con juegos sin ventanilla: 2, 3. Sus participantes no aparecen en la tele.'))
        .toHaveAttribute('role', 'status');

      fireEvent.change(within(card('A')).getByRole('combobox'), { target: { value: '2' } });
      expect(screen.getByText('1 mesa con juegos sin ventanilla: 3. Sus participantes no aparecen en la tele.'))
        .toBeInTheDocument();
    });

    it('sin mesas libres no hay aviso', async () => {
      serverHas([{ id: 1, name: 'A', tables: ['1', '2'] }], []);
      renderPage();
      await screen.findByDisplayValue('A');

      expect(screen.queryByText(/sin ventanilla/)).not.toBeInTheDocument();
    });
  });

  describe('Configuración Local del Display: cola de llamado', () => {
    const openConfig = async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Configuración Local del Display/ }));
    };
    const storedConfig = () => JSON.parse(localStorage.getItem('globalDisplayConfig') as string);
    const queueSwitch = () => screen.getByRole('switch', { name: /Llamar a la fila de a pocos/ });
    const slotsField = () => screen.getByLabelText('Personas llamadas a la vez');

    beforeEach(() => serverHas([{ id: 1, name: 'V1', tables: ['10'] }]));

    it('shows the switch and the slots field', async () => {
      renderPage();
      await openConfig();
      expect(queueSwitch()).toBeInTheDocument();
      expect(slotsField()).toBeInTheDocument();
    });

    it('defaults to on with 4 slots', async () => {
      renderPage();
      await openConfig();
      expect(queueSwitch()).toHaveAttribute('aria-checked', 'true');
      expect(slotsField()).toHaveValue(4);
    });

    it('shows the stored values', async () => {
      localStorage.setItem('globalDisplayConfig', JSON.stringify({ maxUsers: 10, pollingInterval: 10, queueMode: false, callSlots: 7 }));
      renderPage();
      await openConfig();
      expect(queueSwitch()).toHaveAttribute('aria-checked', 'false');
      expect(slotsField()).toHaveValue(7);
    });

    it('saves the switch', async () => {
      renderPage();
      await openConfig();
      fireEvent.click(queueSwitch());
      expect(queueSwitch()).toHaveAttribute('aria-checked', 'false');
      expect(storedConfig().queueMode).toBe(false);
    });

    it('saves the slots and clamps them', async () => {
      renderPage();
      await openConfig();
      fireEvent.change(slotsField(), { target: { value: '6' } });
      expect(storedConfig().callSlots).toBe(6);
      fireEvent.change(slotsField(), { target: { value: '20' } });
      expect(storedConfig().callSlots).toBe(12);
      expect(slotsField()).toHaveValue(12);
    });

    it('does not alter maxUsers nor pollingInterval', async () => {
      localStorage.setItem('globalDisplayConfig', JSON.stringify({ maxUsers: 8, pollingInterval: 25 }));
      renderPage();
      await openConfig();
      fireEvent.click(queueSwitch());
      fireEvent.change(slotsField(), { target: { value: '5' } });
      expect(storedConfig()).toMatchObject({ maxUsers: 8, pollingInterval: 25, queueMode: false, callSlots: 5 });
    });
  });
});

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
});

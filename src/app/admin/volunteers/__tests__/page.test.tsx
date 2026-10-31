import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { EventVolunteer, VolunteerCandidate } from '@/types';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import VolunteersPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;

const ana: EventVolunteer = {
  id: 7,
  user: { id: 70, first_name: 'Ana', last_name: 'Gomez', email: 'ana@mail.com' },
  role: 'boxes',
};

const candidates: VolunteerCandidate[] = [
  { id: 80, first_name: 'Juan', last_name: 'Perez', email: 'juan@mail.com', is_volunteer: false },
  { id: 70, first_name: 'Ana', last_name: 'Gomez', email: 'ana@mail.com', is_volunteer: true },
];

const juan: EventVolunteer = {
  id: 8,
  user: { id: 80, first_name: 'Juan', last_name: 'Perez', email: 'juan@mail.com' },
  role: null,
};

let listExecute: jest.Mock;
let candidatesExecute: jest.Mock;
let createExecute: jest.Mock;
let deleteExecute: jest.Mock;

const renderPage = () => render(
  <ActionStatusProvider>
    <VolunteersPage />
  </ActionStatusProvider>,
);

describe('VolunteersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listExecute = jest.fn().mockResolvedValue([ana]);
    candidatesExecute = jest.fn().mockResolvedValue(candidates);
    createExecute = jest.fn().mockResolvedValue(juan);
    deleteExecute = jest.fn().mockResolvedValue(undefined);
    mockUseApi.mockImplementation((endpoint: string, options?: { method?: string }) => {
      const method = options?.method ?? 'GET';
      if (endpoint === 'logistics/volunteers/candidates/') return { execute: candidatesExecute };
      if (method === 'POST') return { execute: createExecute };
      if (method === 'DELETE') return { execute: deleteExecute };
      return { execute: listExecute };
    });
  });

  it('redirects a non-admin to / and denies access', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false });
    renderPage();

    expect(screen.getByText('Acceso denegado.')).toBeInTheDocument();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(listExecute).not.toHaveBeenCalled();
  });

  it('shows the list to an admin and searches candidates from 2 characters', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    renderPage();

    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText('Voluntarios (1)')).toBeInTheDocument();
    expect(screen.getByText('Cajas')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    const search = screen.getByLabelText('Buscar usuario para agregar como voluntario');
    fireEvent.change(search, { target: { value: 'j' } });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(candidatesExecute).not.toHaveBeenCalled();

    fireEvent.change(search, { target: { value: 'ju' } });
    await waitFor(() => expect(candidatesExecute).toHaveBeenCalledWith(undefined, '?q=ju'));
    expect(await screen.findByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Ya es voluntario')).toBeInTheDocument();
  });

  it('adds a candidate with POST {user_id}', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    renderPage();
    await screen.findByText('Ana Gomez');

    fireEvent.change(screen.getByLabelText('Buscar usuario para agregar como voluntario'), {
      target: { value: 'juan' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar a Juan Perez' }));

    await waitFor(() => expect(createExecute).toHaveBeenCalledWith({ user_id: 80 }));
    expect(await screen.findByText('Voluntarios (2)')).toBeInTheDocument();
    expect(screen.getByText('Sin rol')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar usuario para agregar como voluntario')).toHaveValue('');
  });

  it('removes a volunteer after confirming the dialog', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar a Ana Gomez' }));

    const dialog = screen.getByText('¿Quitar a Ana Gomez?').parentElement as HTMLElement;
    expect(within(dialog).getByText('Va a dejar de poder entrar a la app de logística en esta edición.')).toBeInTheDocument();
    expect(deleteExecute).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, quitar' }));

    await waitFor(() => expect(deleteExecute).toHaveBeenCalledWith(undefined, '7/'));
    await waitFor(() => expect(screen.queryByText('Ana Gomez')).not.toBeInTheDocument());
    expect(screen.getByText('Voluntarios (0)')).toBeInTheDocument();
  });
});

import { ActionStatusProvider, useActionStatus } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { CityVolunteer, CityVolunteerCandidate } from '@/types';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CityVolunteersPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;

const referrer = { kind: 'referrer' as const, city: { id: 5, name: 'Mendoza' } };
const addedBy = { id: 50, first_name: 'Rita', last_name: 'Referente' };

const ana: CityVolunteer = {
  id: 7,
  user: { id: 70, first_name: 'Ana', last_name: 'Gomez', email: 'ana@mail.com', phone: '2615550000', telegram: '@anag' },
  added_by: addedBy,
  created_at: '2026-10-31T10:00:00Z',
};
const juan: CityVolunteer = {
  id: 8,
  user: { id: 80, first_name: 'Juan', last_name: 'Perez', email: 'juan@mail.com', phone: '', telegram: null },
  added_by: addedBy,
  created_at: '2026-10-31T11:00:00Z',
};
const candidates: CityVolunteerCandidate[] = [
  { id: 80, first_name: 'Juan', last_name: 'Perez', email: 'juan@mail.com', is_volunteer: false },
  { id: 70, first_name: 'Ana', last_name: 'Gomez', email: 'ana@mail.com', is_volunteer: true },
];

let listExecute: jest.Mock;
let candidatesExecute: jest.Mock;
let createExecute: jest.Mock;
let deleteExecute: jest.Mock;

function ErrorOut() {
  const { actionError } = useActionStatus();
  return actionError ? <p role="alert">{actionError}</p> : null;
}

const renderPage = () => render(
  <ActionStatusProvider>
    <CityVolunteersPage />
    <ErrorOut />
  </ActionStatusProvider>,
);

describe('CityVolunteersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listExecute = jest.fn().mockResolvedValue([ana]);
    candidatesExecute = jest.fn().mockResolvedValue(candidates);
    createExecute = jest.fn().mockResolvedValue(juan);
    deleteExecute = jest.fn().mockResolvedValue(undefined);
    mockUseApi.mockImplementation((endpoint: string, options?: { method?: string }) => {
      const method = options?.method ?? 'GET';
      if (endpoint === 'logistics/city-volunteers/candidates/') return { execute: candidatesExecute };
      if (method === 'POST') return { execute: createExecute };
      if (method === 'DELETE') return { execute: deleteExecute };
      return { execute: listExecute };
    });
    mockUseAuth.mockReturnValue({ cityAccess: referrer });
  });

  it('lists the city volunteers with their contact links', async () => {
    renderPage();
    expect(await screen.findByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText('Voluntarios (1)')).toBeInTheDocument();
    expect(screen.getByText(/Pueden armar cajas de Mendoza/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5492615550000');
    expect(screen.getByRole('link', { name: 'Telegram' })).toHaveAttribute('href', 'https://t.me/anag');
  });

  it('searches city members and adds one with POST {user_id}', async () => {
    renderPage();
    await screen.findByText('Ana Gomez');
    fireEvent.change(screen.getByLabelText('Buscar participante para agregar como voluntario'), {
      target: { value: 'ju' },
    });
    await waitFor(() => expect(candidatesExecute).toHaveBeenCalledWith(undefined, '?q=ju'));
    expect(screen.getByText('Ya es voluntario')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar a Juan Perez' }));
    await waitFor(() => expect(createExecute).toHaveBeenCalledWith({ user_id: 80 }));
    expect(await screen.findByText('Voluntarios (2)')).toBeInTheDocument();
  });

  it('removes a volunteer after confirming', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar a Ana Gomez' }));
    const dialog = screen.getByText('¿Quitar a Ana Gomez?').parentElement as HTMLElement;
    expect(within(dialog).getByText('Va a dejar de poder armar las cajas de Mendoza.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, quitar' }));
    await waitFor(() => expect(deleteExecute).toHaveBeenCalledWith(undefined, '7/'));
    expect(await screen.findByText('Voluntarios (0)')).toBeInTheDocument();
  });

  it('shows the field error from err.body when adding fails', async () => {
    createExecute.mockRejectedValue(Object.assign(new Error('Bad Request'), {
      body: { user_id: ['Tiene que ser participante de tu ciudad.'] },
    }));
    renderPage();
    await screen.findByText('Ana Gomez');
    fireEvent.change(screen.getByLabelText('Buscar participante para agregar como voluntario'), {
      target: { value: 'juan' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar a Juan Perez' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tiene que ser participante de tu ciudad.');
  });

  it('is referrer only', () => {
    mockUseAuth.mockReturnValue({ cityAccess: { kind: 'local', city: { id: 5, name: 'Mendoza' } } });
    renderPage();
    expect(screen.getByText('Solo el referente de la ciudad maneja sus voluntarios.')).toBeInTheDocument();
    expect(listExecute).not.toHaveBeenCalled();
  });
});

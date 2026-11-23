import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReadyToPickupPage from '../page';

jest.mock('@/hooks/useApi');
jest.mock('@/hooks/useAuth');
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/staff/ProblemHeader', () => () => null);

const mockUseApi = useApi as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

let usersExecute: jest.Mock;
let statusExecute: jest.Mock;

beforeAll(() => {
  // jsdom has no IntersectionObserver; the page uses it to collapse sections.
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe() { return undefined; }
    disconnect() { return undefined; }
  };
});

describe('/admin/ready-to-pickup ("Quién retiró")', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersExecute = jest.fn().mockResolvedValue([{
      id: 7, first_name: 'Lucía', last_name: 'Pérez', username: 'lucia',
      roles: [], status: 'completed', table_number: '07', ready_games_count: 0,
    }]);
    statusExecute = jest.fn().mockResolvedValue({ updated: true });
    mockUseApi.mockImplementation((endpoint: string) => (
      endpoint === 'logistics/users/update-status/' ? { execute: statusExecute } : { execute: usersExecute }
    ));
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
  });

  it('el cambio manual de estado manda force: true (puede bajar de Completado a Recibiendo)', async () => {
    render(<ReadyToPickupPage />);
    await waitFor(() => expect(usersExecute).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('Nombre, usuario o mesa...'), { target: { value: 'lucia' } });
    fireEvent.click(await screen.findByText('Lucía Pérez'));
    fireEvent.click(await screen.findByRole('button', { name: /Marcar como Recibiendo/ }));

    await waitFor(() => expect(statusExecute).toHaveBeenCalledTimes(1));
    expect(statusExecute).toHaveBeenCalledWith({ user_id: 7, status: 'receiving', force: true });
  });
});

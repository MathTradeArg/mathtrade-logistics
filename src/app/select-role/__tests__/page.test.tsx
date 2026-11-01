import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SelectRolePage from '../page';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/contexts/ActionStatusContext');

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseActionStatus = useActionStatus as jest.Mock;

describe('SelectRolePage', () => {
  let patchExecute: jest.Mock;
  let applyRole: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    patchExecute = jest.fn().mockResolvedValue({ role: 'boxes' });
    applyRole = jest.fn();
    mockUseApi.mockReturnValue({ execute: patchExecute });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUseActionStatus.mockReturnValue({ setError: jest.fn() });
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null, applyRole,
    });
  });

  it('offers the four roles and saves the tapped one with PATCH', async () => {
    render(<SelectRolePage />);
    expect(screen.getByText('¿Qué vas a hacer hoy?')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Cajas/ }));

    await waitFor(() => expect(patchExecute).toHaveBeenCalledWith({ role: 'boxes' }));
    expect(mockUseApi).toHaveBeenCalledWith('logistics/me/', { method: 'PATCH' });
    await waitFor(() => expect(applyRole).toHaveBeenCalledWith('boxes'));
    expect(mockReplace).toHaveBeenCalledWith('/boxes/in');
  });

  it('keeps the role and stays when the PATCH fails', async () => {
    const setError = jest.fn();
    mockUseActionStatus.mockReturnValue({ setError });
    patchExecute.mockRejectedValue(new Error('No sos voluntario de esta edición.'));
    render(<SelectRolePage />);

    fireEvent.click(screen.getByRole('button', { name: /Runner/ }));

    await waitFor(() => expect(setError).toHaveBeenCalledWith('No sos voluntario de esta edición.'));
    expect(applyRole).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Runner/ })).not.toBeDisabled();
  });

  it('sends an admin to /', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false, role: null, applyRole });
    render(<SelectRolePage />);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('sends a volunteer who already has a role to their home', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'window', applyRole });
    mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false });
    render(<SelectRolePage />);
    expect(mockReplace).toHaveBeenCalledWith('/deliver');
  });
});

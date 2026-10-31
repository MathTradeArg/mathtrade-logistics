import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import MyRolePage from '../page';

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

describe('MyRolePage', () => {
  let patchExecute: jest.Mock;
  let applyRole: jest.Mock;
  let setSuccess: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    patchExecute = jest.fn().mockResolvedValue({ role: 'boxes' });
    applyRole = jest.fn();
    setSuccess = jest.fn();
    mockUseApi.mockReturnValue({ execute: patchExecute });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockUseActionStatus.mockReturnValue({ setSuccess, setError: jest.fn() });
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: 'window', applyRole,
    });
  });

  const openBoxesDialog = () => {
    render(<MyRolePage />);
    expect(screen.getByText('Ventanilla')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ventanilla/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cajas/ }));
    expect(screen.getByText('Cambiar a Cajas')).toBeInTheDocument();
  };

  it('lists what changes going from window to boxes in phase 1', () => {
    openBoxesDialog();
    const lose = screen.getByText('Vas a dejar de ver').parentElement as HTMLElement;
    const gain = screen.getByText('Vas a ver').parentElement as HTMLElement;
    expect(within(lose).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Recibir']);
    expect(within(gain).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Llegan', 'Empacar']);
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });

  it('a tap does nothing; a 2s hold sends PATCH, applies the role and goes home', async () => {
    jest.useFakeTimers();
    try {
      openBoxesDialog();
      const hold = screen.getByRole('button', { name: 'Mantené para cambiar' });
      fireEvent.click(hold);
      expect(patchExecute).not.toHaveBeenCalled();

      fireEvent.pointerDown(hold, { pointerType: 'touch' });
      await act(async () => { jest.advanceTimersByTime(2000); });

      expect(mockUseApi).toHaveBeenCalledWith('logistics/me/', { method: 'PATCH' });
      expect(patchExecute).toHaveBeenCalledWith({ role: 'boxes' });
      expect(applyRole).toHaveBeenCalledWith('boxes');
      expect(setSuccess).toHaveBeenCalledWith('Ahora sos Cajas.');
      expect(mockReplace).toHaveBeenCalledWith('/boxes/in');
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancel closes the dialog', () => {
    openBoxesDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Cambiar a Cajas')).not.toBeInTheDocument();
  });

  it('redirects an admin to /more', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false, role: null, applyRole });
    render(<MyRolePage />);
    expect(mockReplace).toHaveBeenCalledWith('/more');
  });
});

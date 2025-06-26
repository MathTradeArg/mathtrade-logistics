import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminSection } from '../AdminSection';
import { useControlPanel } from '@/contexts/ControlPanelContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/contexts/ControlPanelContext', () => ({
  useControlPanel: jest.fn(),
}));

describe('AdminSection', () => {
  const mockOnPhaseChange = jest.fn();
  const mockClosePanel = jest.fn();
  const router = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useControlPanel as jest.Mock).mockReturnValue({ closePanel: mockClosePanel });
    window.confirm = jest.fn(() => true);
    const useRouter = jest.spyOn(require('next/navigation'), 'useRouter');
    useRouter.mockImplementation(() => router);
  });

  const defaultProps = {
    isUpdatingPhase: false,
    eventPhase: 0,
    phaseUpdateSuccess: null,
    phaseUpdateError: null,
    onPhaseChange: mockOnPhaseChange,
  };

  it('renders admin actions and TV views sections', () => {
    render(<AdminSection {...defaultProps} />);
    expect(screen.getByText('Acciones de Administrador')).toBeInTheDocument();
    expect(screen.getByText('Vistas para TV')).toBeInTheDocument();
  });

  it('calls onPhaseChange with correct phase when a phase button is clicked', () => {
    render(<AdminSection {...defaultProps} eventPhase={0} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Recepción' }));
    expect(window.confirm).toHaveBeenCalledWith('¿Estás seguro que querés cambiar a la fase 1?');
    expect(mockOnPhaseChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Entrega' }));
    expect(window.confirm).toHaveBeenCalledWith('¿Estás seguro que querés cambiar a la fase 2?');
    expect(mockOnPhaseChange).toHaveBeenCalledWith(2);
  });

  it('disables the current phase button', () => {
    render(<AdminSection {...defaultProps} eventPhase={1} />);
    expect(screen.getByRole('button', { name: 'Recepción' })).toBeDisabled();
  });

  it('navigates to ready-to-pickup page on TV view button click', () => {
    render(<AdminSection {...defaultProps} />);
    const tvViewButton = screen.getByRole('button', { name: /Ver Usuarios Listos para Retirar/i });
    fireEvent.click(tvViewButton);
    expect(mockClosePanel).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/admin/ready-to-pickup');
  });
});


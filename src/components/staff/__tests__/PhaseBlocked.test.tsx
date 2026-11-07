import { useEventPhase } from '@/contexts/EventPhaseContext';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { PhaseBlocked } from '../StaffPage';

jest.mock('@/contexts/EventPhaseContext');
const mockUseEventPhase = useEventPhase as jest.Mock;

describe('PhaseBlocked only says "El evento no empezó" when the phase is actually known', () => {
  it('shows the blocked screen in phase 0', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 0, errorEventPhase: null });
    render(<PhaseBlocked />);
    expect(screen.getByText('El evento no empezó')).toBeInTheDocument();
  });

  it('stays silent when the phase never loaded (StaffChrome offers Reintentar)', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: null, errorEventPhase: 'sin red' });
    render(<PhaseBlocked />);
    expect(screen.queryByText('El evento no empezó')).not.toBeInTheDocument();
  });
});

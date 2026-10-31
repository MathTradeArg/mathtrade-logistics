import PackingDestination from '@/components/boxes/out/PackingDestination';
import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({ useStaffTitle: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

describe('admin "Ver como" (readOnly)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: true, isLoading: false, isAdmin: true });
    (useEventPhase as jest.Mock).mockReturnValue({ eventPhase: 0, isLoadingEventPhase: false });
    (boxApi.listBoxes as jest.Mock).mockResolvedValue([]);
    (boxApi.listItems as jest.Mock).mockResolvedValue([]);
  });

  it('hides "Nueva caja" and passes the view params to the lists', async () => {
    render(
      <PackingDestination
        origin={9} destinationId={1} basePath="/city/boxes" phaseGated={false} itemsOrigin={9}
        readOnly viewParams={{ as_location: 9 }}
      />,
      { wrapper },
    );
    await waitFor(() => expect(boxApi.listBoxes).toHaveBeenCalled());
    expect(boxApi.listBoxes).toHaveBeenCalledWith(expect.objectContaining({ origin: 9, as_location: 9 }));
    expect(await screen.findByText('No hay cajas abiertas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva caja' })).not.toBeInTheDocument();
  });

  it('shows "Nueva caja" when not read-only', async () => {
    render(
      <PackingDestination origin={9} destinationId={1} basePath="/city/boxes" phaseGated={false} itemsOrigin={9} />,
      { wrapper },
    );
    expect(await screen.findByRole('button', { name: 'Nueva caja' })).toBeInTheDocument();
  });
});

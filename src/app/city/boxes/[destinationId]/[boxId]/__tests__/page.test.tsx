import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import CityBoxPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({ useStaffTitle: jest.fn() }));
jest.mock('next/navigation', () => ({
  useParams: () => ({ destinationId: '1', boxId: '61' }),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

const closedBox = {
  id: 61, number: 4, closed_at: '2026-11-07T10:00:00Z', origin: 7, destiny: 1, origin_name: 'Mendoza',
  destination_name: 'AMBA', created_by_username: 'r', created_by_first_name: 'R', created_by_last_name: null,
  tracking: null, math_items: [{ id: 1, title: 'Catan', assigned_trade_code: 101, status: 2 }],
};

describe('CityBoxPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEventPhase as jest.Mock).mockReturnValue({ eventPhase: 0, isLoadingEventPhase: false });
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isLoading: false,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    (boxApi.getBox as jest.Mock).mockResolvedValue(closedBox);
    (boxApi.listBoxes as jest.Mock).mockResolvedValue([]);
    (boxApi.listItems as jest.Mock).mockResolvedValue([]);
  });

  // Rule: the referrer packs the games of the cities that ship as theirs, so the
  // list of games to add must include them.
  it('asks for the games of the cities that ship as the own one', async () => {
    render(<CityBoxPage />, { wrapper });
    await waitFor(() => expect(boxApi.listItems).toHaveBeenCalled());
    expect(boxApi.listItems).toHaveBeenCalledWith({ destination: 1, origin: 7, includeSendAs: true });
  });

  it('offers to reopen a closed box of the city', async () => {
    render(<CityBoxPage />, { wrapper });
    expect(await screen.findByRole('button', { name: 'Reabrir caja' })).toBeInTheDocument();
  });
});

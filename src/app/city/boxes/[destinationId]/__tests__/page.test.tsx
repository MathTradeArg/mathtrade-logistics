import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CityBoxesDestinationPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({ useStaffTitle: jest.fn() }));
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ destinationId: '1' }),
  useRouter: jest.fn(() => ({ push: mockPush, replace: jest.fn(), back: jest.fn() })),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

describe('CityBoxesDestinationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isLoading: false,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    mockUseEventPhase.mockReturnValue({ eventPhase: 0, isLoadingEventPhase: false });
    (boxApi.listBoxes as jest.Mock).mockResolvedValue([]);
    (boxApi.listItems as jest.Mock).mockResolvedValue([]);
    (boxApi.openBox as jest.Mock).mockResolvedValue({
      id: 55, number: null, closed_at: null, origin: 7, destiny: 1, origin_name: 'Mendoza',
      destination_name: 'AMBA', created_by_username: 'r', created_by_first_name: 'R',
      created_by_last_name: null, math_items: [],
    });
  });

  it('lists and opens boxes from the city', async () => {
    render(<CityBoxesDestinationPage />, { wrapper });

    const btn = await screen.findByRole('button', { name: 'Nueva caja' });
    await waitFor(() => expect(btn).not.toBeDisabled());
    expect(boxApi.listBoxes).toHaveBeenCalledWith({ destination: 1, origin: 7 });
    expect(boxApi.listItems).toHaveBeenCalledWith({ destination: 1, origin: 7 });

    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => expect(boxApi.openBox).toHaveBeenCalledWith(1, 7, expect.any(String)));
    expect(mockPush).toHaveBeenCalledWith('/city/boxes/1/55');
  });
});

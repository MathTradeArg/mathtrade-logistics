import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { render, screen, waitFor } from '@testing-library/react';
import BoxesInOriginPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ originId: '8' }),
  useSearchParams: () => new URLSearchParams('segment=transit'),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockListBoxes = boxApi.listBoxes as jest.Mock;

describe('BoxesInOriginPage transit', () => {
  it('links transit boxes so they can be inspected', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockListBoxes.mockResolvedValue([
      {
        id: 400,
        number: 16,
        origin: 8,
        origin_name: 'Salta',
        destiny: 3,
        destination_name: 'Córdoba',
        closed_at: '2026-09-01T10:00:00Z',
        math_items: [{ id: 9, title: 'Wingspan', assigned_trade_code: 20040, status: 4 }],
      },
    ]);

    render(
      <ActionStatusProvider>
        <BoxesInOriginPage />
      </ActionStatusProvider>,
    );

    const row = await screen.findByRole('link', { name: /#16/ });
    expect(row).toHaveAttribute('href', '/boxes/in/8/400');
    expect(row).toHaveTextContent(/no abrir/);
  });
});

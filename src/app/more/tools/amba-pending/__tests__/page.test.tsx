import { useAuth } from '@/hooks/useAuth';
import { listAmbaPending } from '@/hooks/boxes/boxApi';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import AmbaPendingIndexPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/boxes/boxApi', () => ({
  listAmbaPending: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockList = listAmbaPending as jest.Mock;

describe('AmbaPendingIndexPage', () => {
  it('lists origins separately even when both have box #3', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockList.mockResolvedValue([
      { origin_id: 10, origin_name: 'Córdoba', trades: [{ assigned_trade_code: 1 }], transit_boxes: [], unopened_amba_boxes: [{ id: 1, number: 3 }] },
      { origin_id: 20, origin_name: 'Rosario', trades: [{ assigned_trade_code: 2 }], transit_boxes: [], unopened_amba_boxes: [{ id: 2, number: 3 }] },
    ]);

    render(<AmbaPendingIndexPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Córdoba/ })).toHaveAttribute('href', '/more/tools/amba-pending/10');
    });
    expect(screen.getByRole('link', { name: /Rosario/ })).toHaveAttribute('href', '/more/tools/amba-pending/20');
  });
});

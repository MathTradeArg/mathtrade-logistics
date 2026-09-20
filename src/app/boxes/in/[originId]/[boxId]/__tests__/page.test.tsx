import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import IncomingBoxPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ originId: '8', boxId: '392' }),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockGetBox = boxApi.getBox as jest.Mock;
const mockListBoxes = boxApi.listBoxes as jest.Mock;
const mockListItems = boxApi.listItems as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

const ambaBox = {
  id: 392,
  number: 16,
  origin: 8,
  origin_name: 'Salta',
  destiny: 1,
  destination_name: 'AMBA',
  math_items: [
    { id: 1, item_id: 88, title: 'Catan', assigned_trade_code: 501, status: 4, reported_missing: true },
    { id: 2, item_id: 89, title: 'Earth', assigned_trade_code: 502, status: 4 },
  ],
};

describe('IncomingBoxPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, userId: '1' });
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false });
    mockGetBox.mockResolvedValue(ambaBox);
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([]);
  });

  it('shows reported-missing items as flagged but still selectable', async () => {
    render(<IncomingBoxPage />, { wrapper });

    const missingRow = await screen.findByRole('checkbox', { name: /Catan/ });
    expect(missingRow).toHaveTextContent('Faltante reportado');
    expect(missingRow).toBeEnabled();
    expect(missingRow).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(missingRow);
    expect(missingRow).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Marcar recibidos (1)' })).toBeEnabled();

    expect(screen.getByRole('checkbox', { name: /Earth/ })).not.toHaveTextContent('Faltante reportado');
  });

  it('links Reportar faltante to a preloaded report with box and game ids', async () => {
    render(<IncomingBoxPage />, { wrapper });

    const link = await screen.findByRole('link', { name: 'Reportar faltante' });
    expect(link).toHaveAttribute(
      'href',
      '/more/report?kind=missing&box=392&boxNumber=16&origin=Salta',
    );
  });

  it('lets volunteers inspect a transit box and rearmar it without marking received', async () => {
    mockGetBox.mockResolvedValue({
      id: 400,
      number: 16,
      origin: 8,
      origin_name: 'Salta',
      destiny: 3,
      destination_name: 'Córdoba',
      closed_at: '2026-09-01T10:00:00Z',
      math_items: [
        { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4 },
      ],
    });

    render(<IncomingBoxPage />, { wrapper });

    expect(await screen.findByText(/Wingspan/)).toBeInTheDocument();
    expect(screen.getByText(/sigue de largo/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar recibidos/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rearmar caja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rearmar' }));

    await screen.findByText(/Wingspan/);
    expect(boxApi.reopenBox).toHaveBeenCalledWith(400);
  });

  it('offers games from other same-lane boxes so adding them pulls them over', async () => {
    mockGetBox.mockResolvedValue({
      id: 400,
      number: 16,
      origin: 8,
      origin_name: 'Salta',
      destiny: 3,
      destination_name: 'Córdoba',
      closed_at: null,
      math_items: [
        { id: 9, item_id: 90, title: 'Wingspan', assigned_trade_code: 20040, status: 4, origin_location: 8, location: 3 },
      ],
    });
    mockListBoxes.mockResolvedValue([
      {
        id: 400,
        origin: 8,
        destiny: 3,
        closed_at: null,
        math_items: [{ id: 9, title: 'Wingspan', assigned_trade_code: 20040, status: 4 }],
      },
      {
        id: 401,
        origin: 8,
        destiny: 3,
        number: 7,
        closed_at: '2026-09-01T10:00:00Z',
        math_items: [{ id: 99, title: 'Catan', assigned_trade_code: 20041, status: 4 }],
      },
    ]);
    mockListItems.mockResolvedValue([
      { id: 9, title: 'Wingspan', assigned_trade_code: 20040, status: 4, origin_location: 8, location: 3, box_number: null },
      { id: 99, title: 'Catan', assigned_trade_code: 20041, status: 4, origin_location: 8, location: 3, box_number: 7 },
      { id: 88, title: 'Azul', assigned_trade_code: 20042, status: 4, origin_location: 8, location: 3, box_number: null },
      { id: 77, title: 'Root', assigned_trade_code: 20043, status: 5, origin_location: 1, location: 3, box_number: null },
    ]);

    render(<IncomingBoxPage />, { wrapper });

    const addButton = await screen.findByRole('button', { name: 'Agregar juegos' });
    await waitFor(() => expect(addButton).toBeEnabled());
    fireEvent.click(addButton);

    expect(await screen.findByText(/Azul/)).toBeInTheDocument();
    expect(screen.getByText(/Catan/)).toBeInTheDocument();
    expect(screen.getByText(/Caja #7/)).toBeInTheDocument();
    expect(screen.queryByText(/Wingspan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Root/)).not.toBeInTheDocument();
  });
});

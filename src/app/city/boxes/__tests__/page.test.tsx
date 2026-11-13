import { ActionStatusProvider } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import * as xlsx from '@/utils/xlsx';
import CityBoxesPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/utils/xlsx', () => ({
  ...jest.requireActual('@/utils/xlsx'),
  downloadWorkbook: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockListBoxes = boxApi.listBoxes as jest.Mock;
const mockListItems = boxApi.listItems as jest.Mock;
const mockDownload = xlsx.downloadWorkbook as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionStatusProvider>{children}</ActionStatusProvider>
);

describe('CityBoxesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isLoading: false,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    // The event hasn't started: city screens work anyway.
    mockUseEventPhase.mockReturnValue({ eventPhase: 0, isLoadingEventPhase: false });
    mockListBoxes.mockResolvedValue([]);
    mockListItems.mockResolvedValue([
      // status 2: not scanned at the event, still packable from a city.
      { id: 1, title: 'Catan', assigned_trade_code: 101, status: 2, location: 1, location_name: 'AMBA' },
      { id: 2, title: 'Azul', assigned_trade_code: 102, status: 2, location: 8, location_name: 'Córdoba' },
      { id: 3, title: 'Root', assigned_trade_code: 103, status: 2, location: 7, location_name: 'Mendoza' },
    ]);
  });

  it('lists the city origin, keeps AMBA and drops the local destination', async () => {
    render(<CityBoxesPage />, { wrapper });

    expect(await screen.findByRole('link', { name: /AMBA/ })).toHaveAttribute('href', '/city/boxes/1');
    expect(screen.getByRole('link', { name: /Córdoba/ })).toHaveAttribute('href', '/city/boxes/8');
    expect(screen.queryByRole('link', { name: /Mendoza/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/1 listos/)).toHaveLength(2);
    expect(mockListBoxes).toHaveBeenCalledWith({ origin: 7 });
    expect(mockListItems).toHaveBeenCalledWith({ origin: 7, includeSendAs: true, excludeDelivered: true });
    expect(screen.queryByText('El evento no empezó')).not.toBeInTheDocument();
  });

  it('separates direct AMBA from via-AMBA destinations and direct cities', async () => {
    mockListItems.mockResolvedValue([
      { id: 1, title: 'Catan', assigned_trade_code: 101, status: 2, location: 1, location_name: 'AMBA', via_meeting: true },
      { id: 2, title: 'Azul', assigned_trade_code: 102, status: 2, location: 12, location_name: 'Catamarca', via_meeting: true },
      { id: 4, title: 'Dune', assigned_trade_code: 104, status: 2, location: 15, location_name: 'Salta', via_meeting: true },
      { id: 3, title: 'Root', assigned_trade_code: 103, status: 2, location: 9, location_name: 'Rosario', via_meeting: false },
    ]);
    render(<CityBoxesPage />, { wrapper });

    const hub = await screen.findByRole('region', { name: 'Van a AMBA' });
    const direct = screen.getByRole('region', { name: 'Directo a otra ciudad' });
    expect(within(hub).getAllByRole('link').map((link) => link.getAttribute('href')))
      .toEqual(['/city/boxes/1', '/city/boxes/-1']);
    expect(within(hub).getByText('AMBA')).toBeInTheDocument();
    expect(within(hub).getByText('Otras ciudades · Vía AMBA')).toBeInTheDocument();
    expect(within(hub).getByText(/2 listos/)).toBeInTheDocument();
    expect(within(direct).getByText('Rosario')).toBeInTheDocument();
    expect(within(direct).queryByText(/AMBA/)).not.toBeInTheDocument();
  });

  describe('Excel export', () => {
    it('lets the referrer download cajas_<slug>.xlsx with the two sheets, without local games', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false,
        cityAccess: { kind: 'referrer', city: { id: 7, name: 'San Martín' } },
      });
      render(<CityBoxesPage />, { wrapper });
      const button = await screen.findByRole('button', { name: 'Excel de cajas' });
      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);
      await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
      const [sheets, fileName] = mockDownload.mock.calls[0];
      expect(fileName).toBe('cajas_san_martin.xlsx');
      expect(sheets.map((s: { name: string }) => s.name)).toEqual(['Por destino', 'Total']);
      expect(sheets[1].rows.map((r: Record<string, string>) => r['Juego'])).toEqual(['Catan', 'Azul']);
    });

    it('is shown to an admin viewing as a referrer (read only) and asks for send_as items', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false, isAdmin: true,
        cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
      });
      render(<CityBoxesPage />, { wrapper });
      expect(await screen.findByRole('button', { name: 'Excel de cajas' })).toBeInTheDocument();
      expect(mockListItems).toHaveBeenCalledWith(expect.objectContaining({ includeSendAs: true }));
    });

    it('is hidden from a local volunteer, who does not ask for send_as items', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false,
        cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } },
      });
      render(<CityBoxesPage />, { wrapper });
      await screen.findByRole('link', { name: /AMBA/ });
      expect(screen.queryByRole('button', { name: 'Excel de cajas' })).not.toBeInTheDocument();
      expect(mockListItems).toHaveBeenCalledWith({ origin: 7, includeSendAs: false, excludeDelivered: true });
    });

    it('is disabled when there is nothing to send to other cities', async () => {
      mockListItems.mockResolvedValue([
        { id: 3, title: 'Root', assigned_trade_code: 103, status: 2, location: 7, location_name: 'Mendoza' },
      ]);
      render(<CityBoxesPage />, { wrapper });
      expect(await screen.findByRole('button', { name: 'Excel de cajas' })).toBeDisabled();
    });

    it('shows an error when the file cannot be generated', async () => {
      mockDownload.mockRejectedValueOnce(new Error('boom'));
      render(<CityBoxesPage />, { wrapper });
      const button = await screen.findByRole('button', { name: 'Excel de cajas' });
      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);
      expect(await screen.findByText('No se pudo generar el Excel.')).toBeInTheDocument();
    });
  });

  describe('Excel intralocalidad', () => {
    const intraButton = () => screen.findByRole('button', { name: 'Excel intralocalidad' });

    it('downloads intralocalidad_<slug>.xlsx with one sheet of only intra games', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false,
        cityAccess: { kind: 'referrer', city: { id: 7, name: 'San Martín' } },
      });
      render(<CityBoxesPage />, { wrapper });
      const button = await intraButton();
      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);
      await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
      const [sheets, fileName] = mockDownload.mock.calls[0];
      expect(fileName).toBe('intralocalidad_san_martin.xlsx');
      expect(sheets.map((s: { name: string }) => s.name)).toEqual(['Intralocalidad']);
      expect(sheets[0].rows.map((r: Record<string, string>) => r['Juego'])).toEqual(['Root']);
    });

    it('counts a send_as city (lane_destination = own city) as intra, not in the boxes Excel', async () => {
      mockListItems.mockResolvedValue([
        { id: 6, title: 'Esp', assigned_trade_code: 106, status: 2, location: 12, location_name: 'Esperanza', send_to: 7, lane_destination: 7 },
        { id: 2, title: 'Azul', assigned_trade_code: 102, status: 2, location: 8, location_name: 'Córdoba' },
      ]);
      render(<CityBoxesPage />, { wrapper });
      const intra = await intraButton();
      await waitFor(() => expect(intra).toBeEnabled());
      fireEvent.click(intra);
      await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
      expect(mockDownload.mock.calls[0][0][0].rows.map((r: Record<string, string>) => r['Juego'])).toEqual(['Esp']);
      fireEvent.click(screen.getByRole('button', { name: 'Excel de cajas' }));
      await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(2));
      expect(mockDownload.mock.calls[1][0][1].rows.map((r: Record<string, string>) => r['Juego'])).toEqual(['Azul']);
    });

    it('puts both buttons together before the destination list', async () => {
      render(<CityBoxesPage />, { wrapper });
      const group = await screen.findByRole('group', { name: 'Descargas en Excel' });
      expect(within(group).getAllByRole('button').map((b) => b.textContent))
        .toEqual(['Excel de cajas', 'Excel intralocalidad']);
      const firstLink = await screen.findByRole('link', { name: /AMBA/ });
      expect(group.compareDocumentPosition(firstLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('is shown to an admin viewing as a referrer', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false, isAdmin: true,
        cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
      });
      render(<CityBoxesPage />, { wrapper });
      expect(await intraButton()).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Excel de cajas' })).toBeInTheDocument();
    });

    it('is hidden from a local volunteer, along with the boxes button', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false,
        cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } },
      });
      render(<CityBoxesPage />, { wrapper });
      await screen.findByRole('link', { name: /AMBA/ });
      expect(screen.queryByRole('button', { name: 'Excel intralocalidad' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Excel de cajas' })).not.toBeInTheDocument();
    });

    it('is disabled without intra games, while the boxes button stays enabled', async () => {
      mockListItems.mockResolvedValue([
        { id: 2, title: 'Azul', assigned_trade_code: 102, status: 2, location: 8, location_name: 'Córdoba' },
      ]);
      render(<CityBoxesPage />, { wrapper });
      expect(await intraButton()).toBeDisabled();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Excel de cajas' })).toBeEnabled());
    });

    it('shows an error when the file cannot be generated', async () => {
      mockDownload.mockRejectedValueOnce(new Error('boom'));
      render(<CityBoxesPage />, { wrapper });
      const button = await intraButton();
      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);
      expect(await screen.findByText('No se pudo generar el Excel.')).toBeInTheDocument();
    });
  });

  it('says so when the user has no city', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, cityAccess: null });
    render(<CityBoxesPage />, { wrapper });
    expect(screen.getByText('No tenés una ciudad asignada.')).toBeInTheDocument();
    expect(mockListBoxes).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Excel de cajas' })).not.toBeInTheDocument();
  });
});

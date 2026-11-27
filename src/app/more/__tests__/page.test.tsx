import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { useOperationalExport } from '@/hooks/useOperationalExport';
import { useXlsxExport } from '@/hooks/useXlsxExport';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MorePage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/EventPhaseContext');
jest.mock('@/hooks/useOperationalExport');
jest.mock('@/hooks/useXlsxExport', () => ({
  ...jest.requireActual('@/hooks/useXlsxExport'),
  useXlsxExport: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;
const mockUseOperationalExport = useOperationalExport as jest.Mock;
const mockUseXlsxExport = useXlsxExport as jest.Mock;
const EVENT_SHEET_BUTTONS = [
  'Cajas entrantes',
  'Juegos que salen',
  'Juegos a recibir por usuario',
  'Juegos a entregar por usuario',
  'Envíos cargados',
  'Cobro del interior',
];
const EXPORT_BUTTON = 'Planilla del evento';

describe('MorePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false, updateEventPhase: jest.fn() });
    mockUseOperationalExport.mockReturnValue({
      download: jest.fn(), isLoading: false, error: null, lastDownloadedAt: null,
    });
    mockUseXlsxExport.mockReturnValue({
      download: jest.fn(), isLoading: false, error: null, lastDownloadedAt: null,
    });
  });

  it('shows volunteer links and hides admin tools', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false });
    render(<MorePage />);

    expect(screen.getByRole('link', { name: /Hay un problema/ })).toHaveAttribute('href', '/problem');
    expect(screen.getByRole('link', { name: 'Buscar participante o juego' })).toHaveAttribute('href', '/lookup');
    expect(screen.getByRole('link', { name: 'Reportes cargados' })).toHaveAttribute('href', '/more/reports');
    expect(screen.queryByRole('link', { name: 'Nuevo reporte' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Faltantes AMBA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Herramientas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Quién retiró' })).not.toBeInTheDocument();
    expect(screen.queryByText('Administrar el evento')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voluntarios' })).not.toBeInTheDocument();
    expect(screen.queryByText('Fase del evento')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mi rol/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
  });

  it('opens with "Hay un problema" in the general menu', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes' });
    render(<MorePage />);
    const row = screen.getByRole('link', { name: /Hay un problema/ });
    expect(row).toHaveAttribute('href', '/problem');
    expect(row).toHaveTextContent('Falta un juego, alguien no vino…');
    expect(screen.getAllByRole('link')[0]).toBe(row);
  });

  it('shows "Mi rol" to a volunteer with a role', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes' });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi rol: Cajas' })).toHaveAttribute('href', '/more/role');
  });

  it('the event sheet download is admin-only: a volunteer with a role or a referrer does not see it', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes' });
    const { unmount } = render(<MorePage />);
    expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
    unmount();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes',
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    const second = render(<MorePage />);
    expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
    second.unmount();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    render(<MorePage />);
    expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
  });

  it('the collection download is admin-only: a volunteer with a role or a referrer does not see it', () => {
    const scenarios = [
      { role: 'boxes' },
      { role: 'boxes', cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } } },
      { role: null, cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } } },
    ];
    scenarios.forEach((extra) => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, ...extra });
      const { unmount } = render(<MorePage />);
      expect(screen.queryByRole('button', { name: /Cobro del interior/ })).not.toBeInTheDocument();
      unmount();
    });
  });

  it('shows only the city menu to a pure referrer', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi ciudad' })).toHaveAttribute('href', '/city');
    expect(screen.getByRole('link', { name: 'Instructivo' })).toHaveAttribute('href', '/city/instructivo');
    expect(screen.queryByRole('link', { name: 'Buscar participante o juego' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nuevo reporte' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Faltantes AMBA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Herramientas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Hay un problema/ })).not.toBeInTheDocument();
  });

  it('shows Voluntarios to a pure referrer only, not to a local volunteer', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    const { unmount } = render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Voluntarios' })).toHaveAttribute('href', '/city/volunteers');
    unmount();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: null,
      cityAccess: { kind: 'local', city: { id: 7, name: 'Mendoza' } },
    });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi ciudad' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voluntarios' })).not.toBeInTheDocument();
  });

  it('adds a "Mi ciudad" row for a volunteer+referrer', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes',
      cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
    });
    render(<MorePage />);
    expect(screen.getByRole('link', { name: 'Mi ciudad: Mendoza' })).toHaveAttribute('href', '/city');
    expect(screen.getByRole('link', { name: 'Voluntarios de Mendoza' })).toHaveAttribute('href', '/city/volunteers');
    expect(screen.getByRole('link', { name: 'Mi rol: Cajas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buscar participante o juego' })).toBeInTheDocument();
  });

  it('shows admin links for math_admin', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    render(<MorePage />);

    expect(screen.getByRole('heading', { level: 2, name: 'Administrar el evento' })).toBeInTheDocument();
    expect(screen.getByText('Fase del evento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quién retiró' })).toHaveAttribute('href', '/admin/ready-to-pickup');
    expect(screen.queryByRole('link', { name: 'Herramientas' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurar ventanillas' })).toHaveAttribute('href', '/admin/window-config');
    expect(screen.getByRole('link', { name: 'Administrar voluntarios' })).toHaveAttribute('href', '/admin/volunteers');
    expect(screen.getByRole('button', { name: 'Abrir pantalla de retiros (tele)' })).toBeInTheDocument();
    expect(screen.queryByText(/Mi rol/)).not.toBeInTheDocument();
  });

  const openSheets = () => fireEvent.click(screen.getByRole('button', { name: /Planillas \(Excel\)/ }));

  describe('an admin downloads the event sheet (plan B on paper)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    });

    it('a tap on the button starts the download', () => {
      const download = jest.fn();
      mockUseOperationalExport.mockReturnValue({ download, isLoading: false, error: null, lastDownloadedAt: null });
      render(<MorePage />);
      openSheets();
      fireEvent.click(screen.getByRole('button', { name: EXPORT_BUTTON }));
      expect(download).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/Descargada a las/)).not.toBeInTheDocument();
    });

    it('while the sheet is being built the button is disabled and says so', () => {
      const download = jest.fn();
      mockUseOperationalExport.mockReturnValue({ download, isLoading: true, error: null, lastDownloadedAt: null });
      render(<MorePage />);
      openSheets();
      const button = screen.getByRole('button', { name: 'Armando la planilla...' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(download).not.toHaveBeenCalled();
    });

    it('an error is shown as an alert and the button stays available to retry', () => {
      const download = jest.fn();
      mockUseOperationalExport.mockReturnValue({
        download, isLoading: false, error: 'No hay conexión o el servidor tardó demasiado. Probá de nuevo.', lastDownloadedAt: null,
      });
      render(<MorePage />);
      openSheets();
      expect(screen.getByRole('alert')).toHaveTextContent('No hay conexión o el servidor tardó demasiado. Probá de nuevo.');
      const button = screen.getByRole('button', { name: EXPORT_BUTTON });
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(download).toHaveBeenCalledTimes(1);
    });

    it('after a download it shows the time, so the admin knows how old the paper is', () => {
      mockUseOperationalExport.mockReturnValue({
        download: jest.fn(), isLoading: false, error: null, lastDownloadedAt: new Date(2026, 10, 8, 9, 5, 30),
      });
      render(<MorePage />);
      openSheets();
      expect(screen.getByText('Descargada a las 09:05')).toBeInTheDocument();
    });
  });
  describe('an admin downloads the six event spreadsheets', () => {
    it('groups the sheets under one "Planillas (Excel)" button, closed until tapped', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
      render(<MorePage />);
      expect(screen.queryByRole('button', { name: EXPORT_BUTTON })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cajas entrantes' })).not.toBeInTheDocument();
      openSheets();
      expect(screen.getByRole('button', { name: EXPORT_BUTTON })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cajas entrantes' })).toBeInTheDocument();
    });

    it('hides them from volunteers and referrers', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false, role: 'boxes' });
      render(<MorePage />);
      EVENT_SHEET_BUTTONS.forEach((name) => {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      });
    });

    it('shows the six buttons with their help line to the organizer', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
      render(<MorePage />);
      openSheets();
      EVENT_SHEET_BUTTONS.forEach((name) => {
        expect(screen.getByRole('button', { name })).toBeEnabled();
      });
      expect(screen.getByText(/una pestaña por origen y tipo de caja/i)).toBeInTheDocument();
      expect(screen.getByText(/^una pestaña por destino\.$/i)).toBeInTheDocument();
      expect(screen.getByText(/lo que cada usuario del evento trae/i)).toBeInTheDocument();
      expect(screen.getByText(/lo que cada usuario del evento retira/i)).toBeInTheDocument();
      expect(screen.getByText(/trackings cargados por los referentes/i)).toBeInTheDocument();
      expect(screen.getByText(/monto a cobrar por persona a los participantes del interior/i)).toBeInTheDocument();
      expect(screen.queryByText(/admin\b/i)).not.toBeInTheDocument();
    });

    it('each button uses its own endpoint and file prefix', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
      render(<MorePage />);
      openSheets();
      expect(mockUseXlsxExport.mock.calls.map((c) => [c[0], c[1]])).toEqual([
        ['incoming-boxes', 'cajas_entrantes'],
        ['outgoing-games', 'juegos_que_salen'],
        ['to-receive', 'juegos_a_recibir'],
        ['to-deliver', 'juegos_a_entregar'],
        ['shipments', 'envios'],
        ['cobro', 'cobro_interior'],
      ]);
    });

    it('a tap starts only that download; loading and errors are per button', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
      const downloads = [jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn()];
      const states = [
        { isLoading: false, error: null },
        { isLoading: true, error: null },
        { isLoading: false, error: 'No hay una edición activa.' },
        { isLoading: false, error: null },
        { isLoading: false, error: null },
        { isLoading: false, error: null },
      ];
      let call = 0;
      mockUseXlsxExport.mockImplementation(() => {
        const i = call++ % 6;
        return { download: downloads[i], lastDownloadedAt: i === 3 ? new Date(2026, 10, 8, 9, 5) : null, ...states[i] };
      });
      render(<MorePage />);
      openSheets();
      expect(screen.getByRole('button', { name: /Armando.*Juegos que salen|Juegos que salen/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cajas entrantes' })).toBeEnabled();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(screen.getByRole('alert')).toHaveTextContent('No hay una edición activa.');
      expect(screen.getByText('Descargada a las 09:05')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cajas entrantes' }));
      expect(downloads[0]).toHaveBeenCalledTimes(1);
      expect(downloads[1]).not.toHaveBeenCalled();
    });
  });

  describe('el admin cambia la fase del evento', () => {
    const phaseButton = (name: string) => screen.getByRole('button', { name });

    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    });

    it('si el cambio de fase falla muestra el error', async () => {
      const updateEventPhase = jest.fn().mockResolvedValue({ success: false, message: 'No autenticado.' });
      mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false, updateEventPhase });
      render(<MorePage />);
      fireEvent.click(phaseButton('Entrega'));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Pasar a Entrega' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('No autenticado.');
      expect(updateEventPhase).toHaveBeenCalledWith(2);
      expect(phaseButton('Recepción')).toHaveClass('staff-btn-primary');
      expect(phaseButton('Entrega')).not.toHaveClass('staff-btn-primary');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('si anda muestra una confirmación', async () => {
      const updateEventPhase = jest.fn().mockResolvedValue({ success: true, message: 'Fase del evento actualizada correctamente.' });
      mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false, updateEventPhase });
      render(<MorePage />);
      fireEvent.click(phaseButton('Entrega'));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Pasar a Entrega' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Fase del evento: Entrega');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('retroceder pide un diálogo explícito', async () => {
      const updateEventPhase = jest.fn().mockResolvedValue({ success: true, message: 'ok' });
      mockUseEventPhase.mockReturnValue({ eventPhase: 2, isLoadingEventPhase: false, updateEventPhase });
      render(<MorePage />);
      fireEvent.click(phaseButton('Recepción'));
      expect(updateEventPhase).not.toHaveBeenCalled();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent('frena la entrega para todos los voluntarios');
      expect(dialog).toHaveTextContent('hasta 30 segundos');

      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(updateEventPhase).not.toHaveBeenCalled();

      fireEvent.click(phaseButton('Recepción'));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Volver a Recepción' }));
      await waitFor(() => expect(updateEventPhase).toHaveBeenCalledWith(1));
      expect(updateEventPhase).toHaveBeenCalledTimes(1);
    });

    it('avanzar pide un diálogo simple', async () => {
      const updateEventPhase = jest.fn().mockResolvedValue({ success: true, message: 'ok' });
      mockUseEventPhase.mockReturnValue({ eventPhase: 1, isLoadingEventPhase: false, updateEventPhase });
      render(<MorePage />);
      fireEvent.click(phaseButton('Entrega'));
      expect(updateEventPhase).not.toHaveBeenCalled();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent('¿Pasar a la fase de Entrega? Los voluntarios lo ven en hasta 30 segundos.');
      expect(dialog).not.toHaveTextContent('frena la entrega');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Pasar a Entrega' }));
      await waitFor(() => expect(updateEventPhase).toHaveBeenCalledWith(2));
    });
  });
});

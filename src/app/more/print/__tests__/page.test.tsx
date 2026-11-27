import * as boxApi from '@/hooks/boxes/boxApi';
import { useAuth } from '@/hooks/useAuth';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PrintPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/boxes/boxApi');
jest.mock('@/components/staff/StaffTitleContext', () => ({
  useStaffTitle: jest.fn(),
}));
let mockSearch = '';
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockBoxFetch = boxApi.boxFetch as jest.Mock;

// Fictitious data: the real directory lives in the database.
const DIRECTORY = [
  {
    location_id: 1,
    city: 'AMBA',
    code: 'AMBA',
    address: 'Vía Cargo Villa Devoto New: Calle Falsa 123',
    pay_on_delivery: true,
    referrers: [{ name: 'Ana Hub', dni: '11111111', telegram: '', phone: '1100000000' }],
  },
  {
    location_id: 34,
    city: 'Ciudad Prueba',
    code: 'CPR',
    address: 'Av. Siempre Viva 742',
    pay_on_delivery: false,
    referrers: [{ name: 'Beto Interior', dni: '22222222', telegram: '@beto', phone: '2200000000' }],
  },
];

// Two interior cities so the "first city" preselection is distinguishable.
const DIRECTORY_TWO_INTERIOR = [
  ...DIRECTORY,
  {
    location_id: 35,
    city: 'Otra Ciudad',
    code: 'OTC',
    address: 'Calle Otra 1',
    pay_on_delivery: false,
    referrers: [{ name: 'Caro Otra', dni: '33333333', telegram: '', phone: '3300000000' }],
  },
];

describe('PrintPage', () => {
  afterEach(() => sessionStorage.clear());

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = '';
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, isAdmin: true });
    mockBoxFetch.mockImplementation(async (path: string) =>
      path === 'logistics/directory/' ? DIRECTORY : [],
    );
  });

  it('renders CABA direct box label with filled Circle, the hub referrer, Villa Devoto New address and Pago en Destino', async () => {
    render(<PrintPage />);

    expect(
      await screen.findByRole('img', { name: /Círculo lleno: Destino final CABA/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CABA' })).toBeInTheDocument();
    expect((await screen.findAllByText(/Ana Hub/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Villa Devoto New/i)).toBeInTheDocument();
    expect(screen.getAllByText(/11111111/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1100000000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PAGO EN DESTINO/i).length).toBeGreaterThan(0);
  });

  it('switches to empty Circle for boxes going via CABA and includes Pago en Destino without Circle for interior localities', async () => {
    render(<PrintPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: /SIGUE A OTRA LOCALIDAD · Vía CABA/i }),
    );
    expect(
      screen.getByRole('img', { name: /Círculo vacío: Paso intermedio por CABA/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/PAGO EN DESTINO/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Viaja a localidad del interior/i }));
    expect((await screen.findAllByText(/Ciudad Prueba/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Beto Interior/).length).toBeGreaterThan(0);
    // The receiver block prints DNI, phone and the optional Telegram line
    // straight from the directory (which no longer carries username).
    expect(screen.getAllByText(/22222222/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2200000000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Telegram: @beto/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('PAGO EN DESTINO').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: /Círculo/i })).not.toBeInTheDocument();
  });

  it('renders A4 signs for sectors without referrer, windows without mesas and with pickup screen text, and tables without MESA DE JUEGOS', async () => {
    render(<PrintPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sectores (Localidades)' }));
    expect((await screen.findAllByText(/SECTOR DESARMADO DE CAJAS/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SECTOR ARMADO DE CAJAS/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Referente:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ventanillas' }));
    expect(screen.getByText('Ventanilla 1')).toBeInTheDocument();
    expect(screen.queryByText(/MESAS:/i)).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/Para retirar: cuando hagamos las entregas, esperá a aparecer en pantalla/i)
        .length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Mesas' }));
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.queryByText(/MESA DE JUEGOS/i)).not.toBeInTheDocument();
  });

  describe('sector signs "Incluye"', () => {
    const SFE_DIRECTORY = [
      ...DIRECTORY,
      { location_id: 50, city: 'Santa Fe', code: 'SFE', address: 'X 1', pay_on_delivery: false, referrers: [] },
      { location_id: 51, city: 'Rafaela', code: 'RAF', address: 'X 2', send_as: 50, pay_on_delivery: false, referrers: [] },
      { location_id: 52, city: 'Esperanza', code: 'ESP', address: 'X 3', send_as: 50, pay_on_delivery: false, referrers: [] },
      { location_id: 53, city: 'Paraná', code: 'PAR', address: 'X 4', send_as: 50, pay_on_delivery: false, referrers: [] },
    ];

    const openSectors = async (chosenCities: string[]) => {
      mockBoxFetch.mockImplementation(async (path: string) =>
        path === 'logistics/directory/' ? SFE_DIRECTORY : [],
      );
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Sectores (Localidades)' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Ninguna' }));
      chosenCities.forEach((city) => fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(city) })));
    };

    it('prints one sign per mode listing the cities that ship through it', async () => {
      await openSectors(['Santa Fe']);
      expect(screen.getAllByRole('heading', { name: 'Santa Fe' })).toHaveLength(2);
      expect(screen.getAllByText('Incluye: Esperanza, Paraná, Rafaela')).toHaveLength(2);
    });

    it('omits the line for a city that nobody ships through', async () => {
      await openSectors(['Ciudad Prueba']);
      expect(screen.getAllByRole('heading', { name: 'Ciudad Prueba' })).toHaveLength(2);
      expect(screen.queryByText(/Incluye:/)).not.toBeInTheDocument();
    });
  });

  describe('sector list grouped by shipping city', () => {
    const GROUPED_DIRECTORY = [
      ...DIRECTORY,
      { location_id: 50, city: 'Santa Fe', code: 'SFE', address: 'X 1', pay_on_delivery: false, referrers: [] },
      { location_id: 51, city: 'Rafaela', code: 'RAF', address: 'X 2', send_as: 50, pay_on_delivery: false, referrers: [] },
      { location_id: 52, city: 'Esperanza', code: 'ESP', address: 'X 3', send_as: 50, pay_on_delivery: false, referrers: [] },
      { location_id: 53, city: 'Paraná', code: 'PAR', address: 'X 4', send_as: 50, pay_on_delivery: false, referrers: [] },
      { location_id: 54, city: 'Via Hub', code: 'VHB', address: 'X 5', send_as: 1, pay_on_delivery: false, referrers: [] },
    ];

    const openSectors = async () => {
      mockBoxFetch.mockImplementation(async (path: string) =>
        path === 'logistics/directory/' ? GROUPED_DIRECTORY : [],
      );
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Sectores (Localidades)' }));
      await screen.findByRole('checkbox', { name: /Santa Fe/ });
    };

    it('lists shipping cities only, keeping those that send as the hub', async () => {
      await openSectors();
      expect(screen.getByRole('checkbox', { name: /Santa Fe/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Via Hub/ })).toBeInTheDocument();
      ['Esperanza', 'Paraná', 'Rafaela'].forEach((city) =>
        expect(screen.queryByRole('checkbox', { name: new RegExp(city) })).not.toBeInTheDocument(),
      );
    });

    it('counts only visible cities and preselects them', async () => {
      await openSectors();
      // Ciudad Prueba, Santa Fe, Via Hub
      expect(screen.getByText('Localidades (3 seleccionadas)')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Ninguna' }));
      expect(screen.getByText('Localidades (0 seleccionadas)')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
      expect(screen.getByText('Localidades (3 seleccionadas)')).toBeInTheDocument();
    });

    it('shows the shipping city when searching for a hidden one by name or code', async () => {
      await openSectors();
      const search = screen.getByPlaceholderText('Buscar localidad');
      fireEvent.change(search, { target: { value: 'Esperanza' } });
      expect(screen.getByRole('checkbox', { name: /Santa Fe/ })).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: /Ciudad Prueba/ })).not.toBeInTheDocument();
      fireEvent.change(search, { target: { value: 'ESP' } });
      expect(screen.getByRole('checkbox', { name: /Santa Fe/ })).toBeInTheDocument();
    });

    it('"Incluye" lists every city shipping through it, chosen or not', async () => {
      await openSectors();
      fireEvent.click(screen.getByRole('button', { name: 'Ninguna' }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Santa Fe/ }));
      expect(screen.getAllByText('Incluye: Esperanza, Paraná, Rafaela')).toHaveLength(2);
    });

    it('ignores persisted ids of hidden cities', async () => {
      sessionStorage.setItem('printForm:v1:selectedSectorLocs', JSON.stringify([51, 52]));
      await openSectors();
      expect(screen.getByText('Localidades (0 seleccionadas)')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Santa Fe' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Incluye:/)).not.toBeInTheDocument();
    });
  });

  describe('table 0', () => {
    const openTables = async () => {
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Mesas' }));
      const [from, to] = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      return { from, to };
    };

    it('prints a "Mesa 0" sheet when "Desde" is 0 and counts it', async () => {
      const { from, to } = await openTables();
      fireEvent.change(to, { target: { value: '2' } });
      fireEvent.change(from, { target: { value: '0' } });
      expect(from.value).toBe('0');
      expect(screen.getByRole('heading', { name: 'Mesa 0' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Mesa 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Imprimir \(4 mesas\)/ })).toBeInTheDocument();
      expect(from).toHaveAttribute('min', '0');
      expect(to).toHaveAttribute('min', '0');
    });

    it('does not turn 0 into 1 in "Hasta" and survives an empty value', async () => {
      const { from, to } = await openTables();
      fireEvent.change(from, { target: { value: '0' } });
      fireEvent.change(to, { target: { value: '0' } });
      expect(to.value).toBe('0');
      expect(screen.getByRole('button', { name: /Imprimir \(2 mesas\)/ })).toBeInTheDocument();
      fireEvent.change(to, { target: { value: '' } });
      expect(screen.getByRole('heading', { name: 'Mesa 0' })).toBeInTheDocument();
    });
  });

  describe('LPL table', () => {
    const openTables = async () => {
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Mesas' }));
      const [from, to] = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(from, { target: { value: '1' } });
      fireEvent.change(to, { target: { value: '2' } });
      return screen.getByRole('checkbox', { name: 'Incluir mesa LPL (La Plata)' });
    };

    it('adds one last "Mesa LPL" sheet by default and counts it', async () => {
      const box = await openTables();
      expect(box).toBeChecked();
      const heading = screen.getByRole('heading', { name: 'Mesa LPL' });
      expect(within(heading).getByText('Mesa', { exact: true })).toBeInTheDocument();
      expect(heading.textContent).toBe('MesaLPL');
      const sheets = document.querySelectorAll('.print-sheet-a4');
      expect(sheets[sheets.length - 1]).toContainElement(heading);
      expect(screen.getByRole('button', { name: /Imprimir \(3 mesas\)/ })).toBeInTheDocument();
    });

    it('drops the LPL sheet when unchecked, keeping the numbered range', async () => {
      const box = await openTables();
      fireEvent.click(box);
      expect(screen.queryByRole('heading', { name: 'Mesa LPL' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Mesa 1' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Mesa 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Imprimir \(2 mesas\)/ })).toBeInTheDocument();
    });
  });

  describe('landscape event signs', () => {
    const landscapeStyle = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('style')).find((el) =>
        (el.textContent ?? '').includes('A4 landscape'),
      );

    it('prints labels in A5 landscape, not A4', async () => {
      const { container } = render(<PrintPage />);
      await screen.findByRole('img', { name: /Círculo lleno/i });
      expect(landscapeStyle(container)).toBeUndefined();
      const a5 = Array.from(container.querySelectorAll('style')).find((el) =>
        (el.textContent ?? '').includes('A5 landscape'),
      );
      expect(a5).toBeDefined();
    });

    it('gives each label a full A5 sheet', async () => {
      const { container } = render(<PrintPage />);
      await screen.findByRole('img', { name: /Círculo lleno/i });
      const sheets = container.querySelectorAll('.print-sheet-a5');
      expect(sheets.length).toBeGreaterThan(0);
      expect(container.querySelectorAll('.print-sheet').length).toBe(0);
    });

    it.each(['Sectores (Localidades)', 'Ventanillas', 'Mesas'])(
      'prints %s in A4 landscape',
      async (tabName) => {
        const { container } = render(<PrintPage />);
        fireEvent.click(await screen.findByRole('button', { name: tabName }));
        expect(landscapeStyle(container)).toBeDefined();
      },
    );

    it('shows "Mesa" and the number on table signs without the old header', async () => {
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Mesas' }));
      expect(screen.getByRole('heading', { name: 'Mesa 15' })).toBeInTheDocument();
      expect(screen.queryByText(/SECTOR DE MESAS/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/MATH TRADE ARGENTINA/i)).not.toBeInTheDocument();
    });

    it('stacks "Mesa" over a giant, centered number with nothing else on the sheet', async () => {
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Mesas' }));
      const heading = screen.getByRole('heading', { name: 'Mesa 15' });
      const word = within(heading).getByText('Mesa', { exact: true });
      const number = within(heading).getByText('15', { exact: true });
      expect(word).not.toBe(number);
      expect(word).toHaveClass('block', 'print:text-[8rem]', 'font-bold');
      expect(number).toHaveClass(
        'block',
        'print:text-[30rem]',
        'font-black',
        'leading-none',
        'tabular-nums',
        'whitespace-nowrap',
      );
      const sheet = number.closest('section') as HTMLElement;
      expect(sheet).toHaveClass('print-sheet-a4', 'print:h-[184mm]', 'flex-col', 'items-center', 'justify-center');
      expect(sheet.textContent).toBe('Mesa15');
    });

    it('lets long window names wrap instead of overflowing', async () => {
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Ventanillas' }));
      const h2 = screen.getByRole('heading', { name: 'Ventanilla 1' });
      expect(h2).toHaveClass('break-words');
      expect(h2).not.toHaveClass('text-8xl');
    });
  });

  describe('city people without an event role', () => {
    const EVENT_TABS = ['Sectores (Localidades)', 'Ventanillas', 'Mesas'];

    it.each([
      ['referrer', { kind: 'referrer', city: { id: 7, name: 'Mendoza' } }],
      ['local volunteer', { kind: 'local', city: { id: 7, name: 'Mendoza' } }],
    ])('shows only labels to a %s', async (_name, cityAccess) => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false, isAdmin: false, role: null, cityAccess,
      });
      render(<PrintPage />);

      expect(await screen.findByText(/Configurar etiquetas de cajas/i)).toBeInTheDocument();
      for (const name of EVENT_TABS) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      }
    });

    it('opens labels when a referrer asks for ?tab=windows', async () => {
      mockSearch = 'tab=windows';
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false, isAdmin: false, role: null,
        cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
      });
      render(<PrintPage />);

      expect(await screen.findByText(/Configurar etiquetas de cajas/i)).toBeInTheDocument();
      expect(screen.queryByText(/Identificaciones para Ventanillas/i)).not.toBeInTheDocument();
    });

    it.each([
      ['an admin', { isAdmin: true, role: null }],
      ['a window volunteer', { isAdmin: false, role: 'window' }],
    ])('keeps the four tabs for %s with a city', async (_name, auth) => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false,
        cityAccess: { kind: 'referrer', city: { id: 7, name: 'Mendoza' } },
        ...auth,
      });
      render(<PrintPage />);

      expect(await screen.findByRole('button', { name: 'Etiquetas de cajas' })).toBeInTheDocument();
      for (const name of EVENT_TABS) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
      }
    });
  });

  describe('label form keeps its data', () => {
    const useTwoInterior = () =>
      mockBoxFetch.mockImplementation(async (path: string) =>
        path === 'logistics/directory/' ? DIRECTORY_TWO_INTERIOR : [],
      );
    const checkbox = (name: RegExp) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

    it('keeps sender, copies and box number after unmount and mount', async () => {
      const first = render(<PrintPage />);
      await screen.findByText(/Configurar etiquetas de cajas/i);
      fireEvent.change(screen.getByPlaceholderText(/Localidad que envía/i), { target: { value: 'Rosario' } });
      fireEvent.change(screen.getByPlaceholderText(/Nombre referente que envía/i), { target: { value: 'Juan' } });
      fireEvent.change(screen.getByPlaceholderText(/DNI referente que envía/i), { target: { value: '123' } });
      fireEvent.change(screen.getByPlaceholderText(/Teléfono referente que envía/i), { target: { value: '456' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } });
      fireEvent.change(screen.getByPlaceholderText(/Vacío = recuadro rellenable/i), { target: { value: '17' } });
      first.unmount();

      render(<PrintPage />);
      await screen.findByText(/Configurar etiquetas de cajas/i);
      expect(screen.getByPlaceholderText(/Localidad que envía/i)).toHaveValue('Rosario');
      expect(screen.getByPlaceholderText(/Nombre referente que envía/i)).toHaveValue('Juan');
      expect(screen.getByPlaceholderText(/DNI referente que envía/i)).toHaveValue('123');
      expect(screen.getByPlaceholderText(/Teléfono referente que envía/i)).toHaveValue('456');
      expect(screen.getByRole('spinbutton')).toHaveValue(4);
      expect(screen.getByPlaceholderText(/Vacío = recuadro rellenable/i)).toHaveValue('17');
    });

    it('keeps interior destinations across route kinds and a remount', async () => {
      useTwoInterior();
      const first = render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Viaja a localidad del interior/i }));
      await waitFor(() => expect(checkbox(/Ciudad Prueba/)).toBeChecked());
      fireEvent.click(checkbox(/Otra Ciudad/));
      fireEvent.click(screen.getByRole('button', { name: /SIGUE A OTRA LOCALIDAD · Vía CABA/i }));
      fireEvent.click(screen.getByRole('button', { name: /Viaja a localidad del interior/i }));
      expect(checkbox(/Ciudad Prueba/)).toBeChecked();
      expect(checkbox(/Otra Ciudad/)).toBeChecked();
      first.unmount();

      render(<PrintPage />);
      // routeKind is persisted too: the interior list shows without clicking.
      await waitFor(() => expect(checkbox(/Otra Ciudad/)).toBeChecked());
      expect(checkbox(/Ciudad Prueba/)).toBeChecked();
    });

    it('does not replace saved destinations with the first city when the directory loads', async () => {
      useTwoInterior();
      sessionStorage.setItem('printForm:v1:routeKind', JSON.stringify('interior'));
      sessionStorage.setItem('printForm:v1:selectedLabelDests', JSON.stringify([35]));
      render(<PrintPage />);

      await waitFor(() => expect(checkbox(/Otra Ciudad/)).toBeChecked());
      expect(checkbox(/Ciudad Prueba/)).not.toBeChecked();
    });

    it('preselects the first interior city when nothing is saved', async () => {
      useTwoInterior();
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Viaja a localidad del interior/i }));

      await waitFor(() => expect(checkbox(/Ciudad Prueba/)).toBeChecked());
      expect(checkbox(/Otra Ciudad/)).not.toBeChecked();
    });
  });

  describe('default sender from the directory', () => {
    const field = (placeholder: RegExp) => screen.getByPlaceholderText(placeholder);
    const withCity = (id: number) =>
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false, isAdmin: false, role: null,
        cityAccess: { kind: 'referrer', city: { id, name: 'X' } },
      });

    it('fills the hub referrer for a user of location 1', async () => {
      withCity(1);
      render(<PrintPage />);

      await waitFor(() => expect(field(/Nombre referente que envía/i)).toHaveValue('Ana Hub'));
      expect(field(/Localidad que envía/i)).toHaveValue('CABA');
      expect(field(/DNI referente que envía/i)).toHaveValue('11111111');
      expect(field(/Teléfono referente que envía/i)).toHaveValue('1100000000');
    });

    it("fills that city's referrer for a user of another city", async () => {
      withCity(34);
      render(<PrintPage />);

      await waitFor(() => expect(field(/Nombre referente que envía/i)).toHaveValue('Beto Interior'));
      expect(field(/Localidad que envía/i)).toHaveValue('Ciudad Prueba');
      expect(field(/DNI referente que envía/i)).toHaveValue('22222222');
      expect(field(/Teléfono referente que envía/i)).toHaveValue('2200000000');
    });

    it('leaves the sender empty without a city', async () => {
      render(<PrintPage />);
      await waitFor(() =>
        expect(mockBoxFetch).toHaveBeenCalledWith('logistics/directory/'),
      );
      await screen.findAllByText(/Ana Hub/);

      expect(field(/Localidad que envía/i)).toHaveValue('');
      expect(field(/Nombre referente que envía/i)).toHaveValue('');
      expect(field(/DNI referente que envía/i)).toHaveValue('');
      expect(field(/Teléfono referente que envía/i)).toHaveValue('');
    });

    it('does not overwrite a sender already saved in this tab', async () => {
      withCity(1);
      sessionStorage.setItem('printForm:v1:senderName', JSON.stringify(''));
      sessionStorage.setItem('printForm:v1:senderCity', JSON.stringify('Mi Pueblo'));
      render(<PrintPage />);
      await screen.findAllByText(/Ana Hub/);

      expect(field(/Localidad que envía/i)).toHaveValue('Mi Pueblo');
      expect(field(/Nombre referente que envía/i)).toHaveValue('');
      expect(field(/DNI referente que envía/i)).toHaveValue('');
    });
  });

  describe('Santa Fe group leaving AMBA (separate_from_hub)', () => {
    const SPLIT_DIRECTORY = [
      ...DIRECTORY,
      { location_id: 50, city: 'Santa Fe', code: 'SFE', address: 'Dir SFE', separate_from_hub: true, pay_on_delivery: false, referrers: [{ name: 'Sofi Fe', dni: '5', telegram: '', phone: '5' }] },
      { location_id: 51, city: 'Rafaela', code: 'RAF', address: 'Dir RAF', send_as: 50, separate_from_hub: true, pay_on_delivery: false, referrers: [] },
      { location_id: 52, city: 'Esperanza', code: 'ESP', address: 'Dir ESP', send_as: 50, separate_from_hub: true, pay_on_delivery: false, referrers: [{ name: 'Eli Esp', dni: '6', telegram: '', phone: '6' }] },
      { location_id: 53, city: 'Paraná', code: 'PAR', address: 'Dir PAR', send_as: 50, separate_from_hub: true, pay_on_delivery: false, referrers: [] },
      { location_id: 60, city: 'Bahía Blanca', code: 'BBL', address: 'Dir BBL', separate_from_hub: false, pay_on_delivery: false, referrers: [] },
      { location_id: 61, city: 'Ingeniero White', code: 'IWH', address: 'Dir IWH', send_as: 60, separate_from_hub: false, pay_on_delivery: false, referrers: [] },
    ];
    const withCity = (id: number) =>
      mockUseAuth.mockReturnValue({
        isAuthenticated: true, isLoading: false, isAdmin: true, role: null,
        cityAccess: { kind: 'referrer', city: { id, name: 'X' } },
      });

    const openLabels = async (chosen: string[]) => {
      mockBoxFetch.mockImplementation(async (path: string) =>
        path === 'logistics/directory/' ? SPLIT_DIRECTORY : [],
      );
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Viaja a localidad del interior/i }));
      await screen.findByRole('checkbox', { name: /Esperanza/ });
      fireEvent.click(screen.getByRole('button', { name: 'Ninguna' }));
      chosen.forEach((city) => fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(city) })));
    };

    it('from AMBA prints each city of the group with its own name, address and referrer', async () => {
      withCity(1);
      await openLabels(['Esperanza']);
      expect(screen.getByRole('heading', { name: 'Esperanza' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Santa Fe' })).not.toBeInTheDocument();
      expect(screen.queryByText(/SIGUE A:/)).not.toBeInTheDocument();
      expect(screen.getAllByText('Dir ESP').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Eli Esp').length).toBeGreaterThan(0);
    });

    it('from AMBA drops the "vía Santa Fe" chip but keeps "vía Bahía Blanca"', async () => {
      withCity(1);
      await openLabels([]);
      expect(screen.queryByText('(vía Santa Fe)')).not.toBeInTheDocument();
      expect(screen.getByText('(vía Bahía Blanca)')).toBeInTheDocument();
    });

    it('from AMBA "Todas" picks the four cities of the group, not Ingeniero White', async () => {
      withCity(1);
      await openLabels([]);
      fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
      // Ciudad Prueba, Santa Fe, Rafaela, Esperanza, Paraná, Bahía Blanca
      expect(screen.getByText('Localidades de destino (6 seleccionadas)')).toBeInTheDocument();
      ['Santa Fe', 'Rafaela', 'Esperanza', 'Paraná'].forEach((city) =>
        expect(screen.getByRole('heading', { name: city })).toBeInTheDocument(),
      );
    });

    it('with no sender and no city of their own (admin at the event) it is from AMBA', async () => {
      await openLabels(['Esperanza']);
      expect(screen.getByRole('heading', { name: 'Esperanza' })).toBeInTheDocument();
    });

    it('a direct box from another city still goes to Santa Fe and continues to Esperanza', async () => {
      withCity(34);
      await openLabels(['Esperanza']);
      expect(screen.getByRole('heading', { name: 'Santa Fe' })).toBeInTheDocument();
      expect(screen.getByText(/SIGUE A:/)).toBeInTheDocument();
      expect(screen.getAllByText('(vía Santa Fe)')).toHaveLength(3);
    });

    const openSectors = async () => {
      mockBoxFetch.mockImplementation(async (path: string) =>
        path === 'logistics/directory/' ? SPLIT_DIRECTORY : [],
      );
      render(<PrintPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Sectores (Localidades)' }));
      await screen.findByRole('checkbox', { name: /Santa Fe/ });
    };

    it('the pack sign comes out per city of the group; the unpack sign stays grouped', async () => {
      await openSectors();
      fireEvent.click(screen.getByRole('button', { name: 'Ninguna' }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Esperanza/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Santa Fe/ }));
      // unpack: Santa Fe with Incluye; pack: Esperanza and Santa Fe, no Incluye.
      expect(screen.getAllByText(/SECTOR DESARMADO DE CAJAS/)).toHaveLength(1);
      expect(screen.getAllByText(/SECTOR ARMADO DE CAJAS/)).toHaveLength(2);
      expect(screen.getAllByRole('heading', { name: 'Santa Fe' })).toHaveLength(2);
      expect(screen.getAllByRole('heading', { name: 'Esperanza' })).toHaveLength(1);
      expect(screen.getAllByText('Incluye: Esperanza, Paraná, Rafaela')).toHaveLength(1);
    });

    it('pack lists the four cities apart and keeps Bahía Blanca grouped', async () => {
      await openSectors();
      fireEvent.click(screen.getByRole('button', { name: 'Solo Armado (Salen)' }));
      ['Esperanza', 'Paraná', 'Rafaela'].forEach((city) =>
        expect(screen.getByRole('checkbox', { name: new RegExp(city) })).toBeInTheDocument(),
      );
      expect(screen.queryByRole('checkbox', { name: /Ingeniero White/ })).not.toBeInTheDocument();
      // Preselected: Ciudad Prueba, Santa Fe, Rafaela, Esperanza, Paraná, Bahía Blanca
      expect(screen.getByText('Localidades (6 seleccionadas)')).toBeInTheDocument();
      expect(screen.getAllByText(/SECTOR ARMADO DE CAJAS/)).toHaveLength(6);
      expect(screen.getByText('Incluye: Ingeniero White')).toBeInTheDocument();
      expect(screen.queryByText(/Incluye: Esperanza/)).not.toBeInTheDocument();
    });

    it('unpack hides the cities of the group and counts only what is listed', async () => {
      await openSectors();
      fireEvent.click(screen.getByRole('button', { name: 'Solo Desarmado (Llegan)' }));
      ['Esperanza', 'Paraná', 'Rafaela'].forEach((city) =>
        expect(screen.queryByRole('checkbox', { name: new RegExp(city) })).not.toBeInTheDocument(),
      );
      expect(screen.getByText('Localidades (3 seleccionadas)')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Ninguna' }));
      fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
      expect(screen.getByText('Localidades (3 seleccionadas)')).toBeInTheDocument();
    });

    it('in pack, searching Esperanza shows Esperanza, not Santa Fe', async () => {
      await openSectors();
      fireEvent.click(screen.getByRole('button', { name: 'Solo Armado (Salen)' }));
      fireEvent.change(screen.getByPlaceholderText('Buscar localidad'), { target: { value: 'Esperanza' } });
      expect(screen.getByRole('checkbox', { name: /Esperanza/ })).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: /Santa Fe/ })).not.toBeInTheDocument();
    });
  });
});

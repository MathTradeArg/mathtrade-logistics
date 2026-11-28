import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import EventProgress from '../EventProgress';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useEventProgress } from '@/hooks/useEventProgress';

jest.mock('@/hooks/useEventProgress', () => ({
  ...jest.requireActual('@/hooks/useEventProgress'),
  useEventProgress: jest.fn(),
}));

jest.mock('@/contexts/EventPhaseContext');

const mockUseEventProgress = useEventProgress as jest.Mock;
const mockUseEventPhase = useEventPhase as jest.Mock;

const sample = {
  reception: {
    games: { done: 1234, total: 3612 },
    users: { done: 100, total: 400 },
    interior_games: { done: 30, total: 300 },
    boxes: { done: 3, total: 12 },
  },
  delivery: {
    games: { done: 50, total: 500 },
    users: { done: 40, total: 200 },
    ready: { done: 60, total: 200 },
  },
};

describe('EventProgress', () => {
  beforeEach(() => {
    mockUseEventProgress.mockReturnValue(sample);
    mockUseEventPhase.mockReturnValue({ eventPhase: 1 });
  });

  it('shows games received inside the bar during reception', () => {
    render(<EventProgress />);
    const strip = screen.getByRole('button', { name: /ver progreso/i });
    expect(within(strip).getByText('Recibidos · 34 %')).toBeInTheDocument();
    expect(within(strip).getByText('1234 / 3612')).toBeInTheDocument();
    expect(within(strip).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '34');
  });

  it('shows games delivered inside the bar during delivery', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 2 });
    render(<EventProgress />);
    const strip = screen.getByRole('button', { name: /ver progreso/i });
    expect(within(strip).getByText('Entregados · 10 %')).toBeInTheDocument();
    expect(within(strip).getByText('50 / 500')).toBeInTheDocument();
    expect(within(strip).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
  });

  it.each([0, null])('shows games received when the phase is %s', (phase) => {
    mockUseEventPhase.mockReturnValue({ eventPhase: phase });
    render(<EventProgress />);
    const strip = screen.getByRole('button', { name: /ver progreso/i });
    expect(within(strip).getByText('Recibidos · 34 %')).toBeInTheDocument();
  });

  it('renders nothing until the first answer', () => {
    mockUseEventProgress.mockReturnValue(null);
    const { container } = render(<EventProgress />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the seven percentages on tap', () => {
    render(<EventProgress />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    const rows: [string, string][] = [
      ['Juegos recibidos', '34 %'],
      ['Usuarios recibidos', '25 %'],
      ['Juegos del interior recibidos', '10 %'],
      ['Cajas abiertas', '25 %'],
      ['Usuarios listos para entregarles sus juegos', '30 %'],
      ['Juegos entregados', '10 %'],
      ['Usuarios entregados', '20 %'],
    ];
    rows.forEach(([label, percent]) => {
      const bar = within(dialog).getByRole('progressbar', { name: label });
      expect(bar).toHaveAttribute('aria-valuenow', percent.replace(' %', ''));
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    });
    expect(within(dialog).getAllByRole('progressbar')).toHaveLength(7);
  });

  it('shows the counts and the scope next to each percentage', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('1234 de 3612 · AMBA y La Plata')).toBeInTheDocument();
    expect(within(dialog).getByText('100 de 400 · AMBA y La Plata')).toBeInTheDocument();
    expect(within(dialog).getByText('30 de 300 · por caja')).toBeInTheDocument();
    expect(within(dialog).getByText('3 de 12 · del interior a AMBA')).toBeInTheDocument();
    expect(within(dialog).getByText('60 de 200 · asistentes')).toBeInTheDocument();
    expect(within(dialog).getByText('50 de 500 · asistentes')).toBeInTheDocument();
    expect(within(dialog).getByText('40 de 200 · asistentes')).toBeInTheDocument();
  });

  it('colors the strip by phase: brand blue for reception, green for delivery', () => {
    const { unmount } = render(<EventProgress />);
    const fill = () => within(screen.getByRole('button', { name: /ver progreso/i })).getByRole('progressbar').firstElementChild;
    expect(fill()).toHaveClass('bg-brand');
    expect(fill()).not.toHaveClass('bg-want');
    unmount();
    mockUseEventPhase.mockReturnValue({ eventPhase: 2 });
    render(<EventProgress />);
    expect(fill()).toHaveClass('bg-want');
    expect(fill()).not.toHaveClass('bg-brand');
  });

  it('colors the panel bars by group', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    const tone = (label: string) =>
      within(dialog).getByRole('progressbar', { name: label }).firstElementChild;
    ['Juegos recibidos', 'Usuarios recibidos', 'Juegos del interior recibidos', 'Cajas abiertas'].forEach((label) => {
      expect(tone(label)).toHaveClass('bg-brand');
    });
    ['Usuarios listos para entregarles sus juegos', 'Juegos entregados', 'Usuarios entregados'].forEach((label) => {
      expect(tone(label)).toHaveClass('bg-want');
    });
  });

  const HINTS: [string, string][] = [
    ['Juegos recibidos', 'Juegos que traen los usuarios de AMBA, más los del interior que quedan en AMBA. No cuenta los entregados mano a mano antes del día del evento.'],
    ['Usuarios recibidos', 'Usuarios de AMBA que traen juegos. Cuenta como recibido cuando llegaron todos sus juegos.'],
    ['Juegos del interior recibidos', 'Juegos que vienen del interior y pasan por el evento (no van directo), los que quedan en AMBA y los que siguen a otra ciudad.'],
    ['Cajas abiertas', 'Cajas del interior que llegan al evento. Cuenta como abierta cuando todos sus juegos ya fueron recibidos.'],
    ['Usuarios listos para entregarles sus juegos', 'Asistentes cuyos juegos ya están todos en el evento y listos para retirar.'],
    ['Juegos entregados', 'Juegos de los asistentes que ya se retiraron. No cuenta los entregados mano a mano antes del día del evento.'],
    ['Usuarios entregados', 'Asistentes que ya retiraron todos sus juegos.'],
  ];
  const RECEIVED_HINT =
    'Juegos que traen los usuarios de AMBA, más los del interior que quedan en AMBA. No cuenta los que ya se entregaron mano a mano antes del día del evento. Se marca recibido cuando llega al evento.';
  const DELIVERED_HINT =
    'Juegos que les corresponden a los asistentes. Se marca entregado cuando el asistente lo retira. No cuenta los entregados mano a mano antes del día del evento.';

  it.each(HINTS)('explains "%s" in the panel when tapping its info icon', (label, text) => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText(text)).not.toBeInTheDocument();
    const icon = within(dialog).getByRole('button', { name: `Qué cuenta ${label}` });
    expect(icon).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(icon);
    expect(icon).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByRole('note')).toHaveTextContent(text);
    fireEvent.click(icon);
    expect(within(dialog).queryByText(text)).not.toBeInTheDocument();
  });

  it('shows one info icon per panel row', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('button', { name: /^Qué cuenta / })).toHaveLength(7);
  });

  it('puts the strip info icon outside the strip button', () => {
    render(<EventProgress />);
    const strip = screen.getByRole('button', { name: /ver progreso/i });
    const icon = screen.getByRole('button', { name: 'Qué cuenta esta barra' });
    expect(strip).not.toContainElement(icon);
    expect(icon).toHaveAttribute('aria-expanded', 'false');
  });

  it('explains the strip according to the phase without opening the panel', () => {
    const { unmount } = render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: 'Qué cuenta esta barra' }));
    expect(screen.getByRole('note')).toHaveTextContent(RECEIVED_HINT);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Qué cuenta esta barra' }));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    unmount();
    mockUseEventPhase.mockReturnValue({ eventPhase: 2 });
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: 'Qué cuenta esta barra' }));
    expect(screen.getByRole('note')).toHaveTextContent(DELIVERED_HINT);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('styles the info icon as a muted brand button with a 44px touch area', () => {
    render(<EventProgress />);
    const icon = screen.getByRole('button', { name: 'Qué cuenta esta barra' });
    expect(icon).toHaveClass('h-5', 'w-5', 'before:-inset-3');
    expect(icon).not.toHaveClass('h-11', 'w-11', '-my-2.5');
    const circle = icon.firstElementChild as HTMLElement;
    expect(circle).toHaveClass('bg-brand/20', 'text-brand-ink', 'border-brand/40');
    expect(circle).not.toHaveClass('bg-brand/40');
    fireEvent.click(icon);
    expect(icon).toHaveAttribute('aria-expanded', 'true');
    expect(icon.firstElementChild).toHaveClass('bg-brand/40');
    expect(icon.firstElementChild).not.toHaveClass('bg-brand/20');
  });

  it('keeps the panel info icon at 18px with a 44px touch area', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const icon = within(screen.getByRole('dialog')).getByRole('button', { name: 'Qué cuenta Juegos recibidos' });
    expect(icon).toHaveClass('h-[18px]', 'w-[18px]', 'before:-inset-3.5');
    expect(icon).not.toHaveClass('h-11', 'w-11', '-my-2.5');
    expect(icon.firstElementChild).toHaveClass('h-full', 'w-full');
  });

  it('keeps each panel percentage on one line', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    const percent = within(dialog).getByText('30 %');
    expect(percent).toHaveClass('whitespace-nowrap', 'shrink-0');
  });

  const RECEPTION_LABELS = ['Juegos recibidos', 'Usuarios recibidos', 'Juegos del interior recibidos', 'Cajas abiertas'];
  const DELIVERY_LABELS = ['Usuarios listos para entregarles sus juegos', 'Juegos entregados', 'Usuarios entregados'];

  const panelOrder = () => {
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    return within(dialog).getAllByRole('progressbar').map((bar) => bar.getAttribute('aria-label'));
  };

  it.each([0, 1, null])('lists reception rows first and delivery rows last when the phase is %s', (phase) => {
    mockUseEventPhase.mockReturnValue({ eventPhase: phase });
    render(<EventProgress />);
    expect(panelOrder()).toEqual([...RECEPTION_LABELS, ...DELIVERY_LABELS]);
  });

  it('lists delivery rows first and reception rows last when the phase is 2', () => {
    mockUseEventPhase.mockReturnValue({ eventPhase: 2 });
    render(<EventProgress />);
    expect(panelOrder()).toEqual([...DELIVERY_LABELS, ...RECEPTION_LABELS]);
  });

  it('closes the dialog', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

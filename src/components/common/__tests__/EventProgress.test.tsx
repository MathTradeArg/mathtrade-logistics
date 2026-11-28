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

  it('closes the dialog', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

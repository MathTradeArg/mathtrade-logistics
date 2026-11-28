import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import EventProgress from '../EventProgress';
import { useEventProgress } from '@/hooks/useEventProgress';

jest.mock('@/hooks/useEventProgress', () => ({
  ...jest.requireActual('@/hooks/useEventProgress'),
  useEventProgress: jest.fn(),
}));

const mockUseEventProgress = useEventProgress as jest.Mock;

const sample = {
  games: { received: 1234, total: 3612 },
  users: { total: 400, ready: 100, received: 40 },
};

describe('EventProgress', () => {
  beforeEach(() => {
    mockUseEventProgress.mockReturnValue(sample);
  });

  it('shows the share of games received in the top strip', () => {
    render(<EventProgress />);
    const strip = screen.getByRole('button', { name: /ver progreso/i });
    expect(within(strip).getByText('Recibidos')).toBeInTheDocument();
    expect(within(strip).getByText('34 %')).toBeInTheDocument();
    expect(within(strip).getByText('1234 / 3612')).toBeInTheDocument();
  });

  it('fills the strip bar according to the percentage', () => {
    render(<EventProgress />);
    const bar = within(screen.getByRole('button', { name: /ver progreso/i })).getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '34');
  });

  it('renders nothing until the first answer', () => {
    mockUseEventProgress.mockReturnValue(null);
    const { container } = render(<EventProgress />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the three percentages on tap', () => {
    render(<EventProgress />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Juegos recibidos')).toBeInTheDocument();
    expect(within(dialog).getByText('34 %')).toBeInTheDocument();
    expect(within(dialog).getByText('Usuarios listos para retirar')).toBeInTheDocument();
    expect(within(dialog).getByText('25 %')).toBeInTheDocument();
    expect(within(dialog).getByText('Usuarios que ya retiraron')).toBeInTheDocument();
    expect(within(dialog).getByText('10 %')).toBeInTheDocument();
  });

  it('shows the counts next to each percentage', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('1234 de 3612')).toBeInTheDocument();
    expect(within(dialog).getByText('100 de 400')).toBeInTheDocument();
    expect(within(dialog).getByText('40 de 400')).toBeInTheDocument();
  });

  it('closes the dialog', () => {
    render(<EventProgress />);
    fireEvent.click(screen.getByRole('button', { name: /ver progreso/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

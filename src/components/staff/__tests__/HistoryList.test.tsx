import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HistoryList, HistorySection } from '../HistoryList';

type Row = { id: number; text: string };

const rows: Row[] = [{ id: 1, text: 'Fila uno' }, { id: 2, text: 'Fila dos' }];

const renderSection = (load: jest.Mock, props: { notice?: string; emptyText?: string } = {}) =>
  render(
    <HistorySection<Row>
      load={load}
      getKey={(row) => row.id}
      renderRow={(row) => <span>{row.text}</span>}
      {...props}
    />,
  );

describe('HistoryList', () => {
  it('renders the rows and the truncated notice', () => {
    render(<HistoryList<Row> rows={rows} truncated getKey={(r) => r.id} renderRow={(r) => r.text} />);
    expect(screen.getByText('Fila uno')).toBeInTheDocument();
    expect(screen.getByText('Fila dos')).toBeInTheDocument();
    expect(screen.getByText('Hay más movimientos. Se muestran los 2 más recientes.')).toBeInTheDocument();
  });

  it('shows the empty text when there are no rows', () => {
    render(<HistoryList<Row> rows={[]} truncated={false} getKey={(r) => r.id} renderRow={(r) => r.text} emptyText="Nada por acá" />);
    expect(screen.getByText('Nada por acá')).toBeInTheDocument();
  });
});

describe('HistorySection', () => {
  it('does not load until opened, then loads once and shows rows and the truncated notice', async () => {
    const load = jest.fn().mockResolvedValue({ results: rows, truncated: true });
    renderSection(load);

    const button = screen.getByRole('button', { name: 'Ver historial' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(load).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(await screen.findByText('Fila uno')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Hay más movimientos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar historial' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows the default empty text', async () => {
    const load = jest.fn().mockResolvedValue({ results: [], truncated: false });
    renderSection(load);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByText('Todavía no hay movimientos registrados.')).toBeInTheDocument();
  });

  it('shows a notice instead of breaking on a 404', async () => {
    const load = jest.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
    renderSection(load);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByText(/El historial todavía no está disponible/)).toBeInTheDocument();
  });

  it('shows other errors and retries', async () => {
    const load = jest.fn()
      .mockRejectedValueOnce(new Error('Se cortó la conexión'))
      .mockResolvedValueOnce({ results: rows, truncated: false });
    renderSection(load);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByText('Se cortó la conexión')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Fila uno')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not reload when closed and reopened with data loaded', async () => {
    const load = jest.fn().mockResolvedValue({ results: rows, truncated: false });
    renderSection(load);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByText('Fila uno')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar historial' }));
    expect(screen.queryByText('Fila uno')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(screen.getByText('Fila uno')).toBeInTheDocument();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  });

  it('shows the notice when opened', async () => {
    const load = jest.fn().mockResolvedValue({ results: rows, truncated: false });
    renderSection(load, { notice: 'Solo se registran los cambios de estado.' });
    expect(screen.queryByText('Solo se registran los cambios de estado.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(screen.getByText('Solo se registran los cambios de estado.')).toBeInTheDocument();
    await screen.findByText('Fila uno');
  });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ReportCard from '../ReportCard';
import { EnrichedReport } from '@/types/index';

const mockExecutes: Record<string, jest.Mock> = {};
jest.mock('@/hooks/useApi', () => ({
  useApi: (endpoint: string) => {
    mockExecutes[endpoint] = mockExecutes[endpoint] || jest.fn();
    return { execute: mockExecutes[endpoint], isLoading: false };
  },
}));
jest.mock('@/hooks/useHapticClick', () => ({
  useHapticClick: (fn: () => void) => fn,
}));
jest.mock('@/contexts/ActionStatusContext', () => ({
  useActionStatus: () => ({ setSuccess: jest.fn(), setError: jest.fn() }),
}));

const report = {
  id: 108,
  user: { id: 971, first_name: 'Belén', last_name: 'Vilaseco' },
  reported_user: null,
  item: 22833,
  item_title: 'Arkham Horror',
  assigned_trade_code: 0,
  images: null,
  comment: 'No coincide la edición',
  created: '06/10/2026 01:53',
  comments: [],
  itemData: {
    id: 22833,
    title: 'Arkham Horror',
    assigned_trade_code: 0,
    first_name: 'Leo',
    last_name: 'Fleitas',
    whatsapp: '+54 9 11 5555-0000',
    telegram: '@leof',
  },
} as EnrichedReport;

describe('ReportCard', () => {
  it('wraps a long comment without spaces instead of widening the page', () => {
    render(<ReportCard report={report} onImageClick={jest.fn()} />);
    expect(screen.getByText('No coincide la edición')).toHaveClass('min-w-0', 'break-words');
  });

  it('shows the item owner with WhatsApp and Telegram links', () => {
    render(<ReportCard report={report} onImageClick={jest.fn()} />);
    expect(screen.getByText(/Leo/)).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toHaveAttribute('href', 'https://wa.me/5491155550000');
    expect(screen.getByText('Telegram')).toHaveAttribute('href', 'https://t.me/leof');
  });

  it('turns a local phone (WhatsApp = phone) into an Argentine wa.me number', () => {
    const local = { ...report, itemData: { ...report.itemData!, whatsapp: '011 5555-0000' } };
    render(<ReportCard report={local} onImageClick={jest.fn()} />);
    expect(screen.getByText('WhatsApp')).toHaveAttribute('href', 'https://wa.me/5491155550000');
  });

  it('keeps a number that already starts with 54', () => {
    const intl = { ...report, itemData: { ...report.itemData!, whatsapp: '541155550000' } };
    render(<ReportCard report={intl} onImageClick={jest.fn()} />);
    expect(screen.getByText('WhatsApp')).toHaveAttribute('href', 'https://wa.me/541155550000');
  });

  it('omits contact links when the owner has none', () => {
    const noContact = { ...report, itemData: { ...report.itemData!, whatsapp: null, telegram: null } };
    render(<ReportCard report={noContact} onImageClick={jest.fn()} />);
    expect(screen.queryByText('WhatsApp')).toBeNull();
    expect(screen.queryByText('Telegram')).toBeNull();
  });

  // Rule: resolving a report closes it for the whole team and notifies the
  // reporter; it cannot be reopened from here, so it asks first.
  describe('Marcar solucionado', () => {
    beforeEach(() => {
      Object.values(mockExecutes).forEach((fn) => fn.mockReset());
    });

    it('opens a confirmation and does not resolve until confirmed', async () => {
      const onReportResolved = jest.fn();
      render(<ReportCard report={report} onImageClick={jest.fn()} onReportResolved={onReportResolved} />);
      const resolve = mockExecutes['reports/108/resolve/'];
      resolve.mockResolvedValue({ ...report, resolved_at: '07/10/2026' });

      fireEvent.click(screen.getByRole('button', { name: 'Marcar solucionado' }));

      expect(resolve).not.toHaveBeenCalled();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent(
        'Vas a cerrar este reporte para todo el equipo y avisarle a quien lo reportó. No se puede reabrir desde acá.',
      );

      fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar solucionado' }));

      await waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onReportResolved).toHaveBeenCalledWith(expect.objectContaining({ id: 108 })));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('Cancelar does not resolve the report', () => {
      render(<ReportCard report={report} onImageClick={jest.fn()} />);
      const resolve = mockExecutes['reports/108/resolve/'];

      fireEvent.click(screen.getByRole('button', { name: 'Marcar solucionado' }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(resolve).not.toHaveBeenCalled();
    });

    it('the delete modal still asks and deletes', async () => {
      const onReportDeleted = jest.fn();
      render(<ReportCard report={report} onImageClick={jest.fn()} onReportDeleted={onReportDeleted} canManage />);
      const del = mockExecutes['reports/108/'];
      del.mockResolvedValue(undefined);

      fireEvent.click(screen.getByTitle('Eliminar reporte'));
      const confirmDelete = screen.getAllByRole('button', { name: 'Eliminar reporte' });
      fireEvent.click(confirmDelete[confirmDelete.length - 1]);

      await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onReportDeleted).toHaveBeenCalledWith(108));
    });
  });
});

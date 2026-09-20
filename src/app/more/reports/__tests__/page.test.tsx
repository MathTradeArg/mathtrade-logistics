import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import MoreReportsPage from '../page';

jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useApi');
jest.mock('@/components/common/ReportCard', () => ({
  __esModule: true,
  default: ({ canManage }: { canManage?: boolean }) => (
    <div data-testid="report-card">{canManage ? 'admin-actions' : 'read-only'}</div>
  ),
}));
jest.mock('@/components/common', () => ({
  FullScreenImageModal: () => null,
  ReportCard: ({ canManage }: { canManage?: boolean }) => (
    <div data-testid="report-card">{canManage ? 'admin-actions' : 'read-only'}</div>
  ),
}));
jest.mock('@/components/common/ui', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => <div>{message}</div>,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseApi = useApi as jest.Mock;

const reportsData = [
  { id: 1, comment: 'x', reported_user: { id: 2, first_name: 'Ana', last_name: 'Perez' }, item: null },
];
const execute = jest.fn();

describe('MoreReportsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApi.mockReturnValue({
      data: reportsData,
      isLoading: false,
      error: null,
      execute,
    });
  });

  it('lets volunteers see reports without delete actions', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false });
    render(<MoreReportsPage />);
    expect(await screen.findByTestId('report-card')).toHaveTextContent('read-only');
    expect(execute).toHaveBeenCalledWith(undefined, '?event=1');
    expect(screen.getByRole('link', { name: /Retiran en AMBA con faltantes/ })).toHaveAttribute('href', '/more/reports/amba-missing');
  });

  it('lets admins manage reports', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, isLoading: false });
    render(<MoreReportsPage />);
    expect(await screen.findByTestId('report-card')).toHaveTextContent('admin-actions');
  });
});

import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../useAuth';

const mockPush = jest.fn();
const mockRouter = { push: mockPush, replace: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/more',
}));
jest.mock('@sentry/nextjs', () => ({ setUser: jest.fn() }));

function Probe() {
  const { role, roleNotice, isAdmin, isAuthenticated, applyRole } = useAuth();
  return (
    <div>
      <p data-testid="role">{role ?? 'none'}</p>
      <p data-testid="notice">{roleNotice ?? ''}</p>
      <p data-testid="admin">{String(isAdmin)}</p>
      <p data-testid="auth">{String(isAuthenticated)}</p>
      <button type="button" onClick={() => applyRole('runner')}>runner</button>
    </div>
  );
}

const meResponse = (body: Record<string, unknown>, status = 200) => ({
  ok: status < 400,
  status,
  statusText: '',
  json: () => Promise.resolve(body),
});

const me = (role: string | null, mathAdmin = false) =>
  meResponse({ id: 1, first_name: 'Ana', last_name: 'G', math_admin: mathAdmin, is_volunteer: true, role });

describe('useAuth refreshMe', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('authToken', 'tok');
    localStorage.setItem('userName', 'Ana G');
    localStorage.setItem('userId', '1');
    localStorage.setItem('isAdmin', 'false');
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('picks up a role changed by an admin, with a notice', async () => {
    localStorage.setItem('logisticsRole', 'window');
    fetchMock.mockResolvedValue(me('boxes'));
    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('boxes'));
    expect(screen.getByTestId('notice')).toHaveTextContent('Un admin cambió tu rol a Cajas.');
    expect(localStorage.getItem('logisticsRole')).toBe('boxes');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('logistics/me/');
  });

  it('takes a first role or a cleared role without a notice', async () => {
    localStorage.setItem('logisticsRole', '');
    fetchMock.mockResolvedValue(me('runner'));
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('runner'));
    expect(screen.getByTestId('notice')).toBeEmptyDOMElement();
    unmount();

    fetchMock.mockResolvedValue(me(null));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(localStorage.getItem('logisticsRole')).toBe(''));
    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(screen.getByTestId('notice')).toBeEmptyDOMElement();
  });

  it('updates isAdmin from /me', async () => {
    fetchMock.mockResolvedValue(me(null, true));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('admin')).toHaveTextContent('true'));
    expect(localStorage.getItem('isAdmin')).toBe('true');
  });

  it('logs out on 403, once', async () => {
    localStorage.setItem('logisticsRole', 'boxes');
    fetchMock.mockResolvedValue(meResponse({ detail: 'No.' }, 403));
    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
    expect(screen.getByTestId('auth')).toHaveTextContent('false');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('logisticsRole')).toBeNull();

    // No token any more: tab focus doesn't ask again.
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the session on a network error', async () => {
    localStorage.setItem('logisticsRole', 'boxes');
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(mockPush).not.toHaveBeenCalledWith('/login');
    expect(localStorage.getItem('authToken')).toBe('tok');
    expect(screen.getByTestId('role')).toHaveTextContent('boxes');
  });

  it('applyRole stores the role without a notice', async () => {
    localStorage.setItem('logisticsRole', '');
    fetchMock.mockResolvedValue(me(null));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'runner' }));
    expect(screen.getByTestId('role')).toHaveTextContent('runner');
    expect(screen.getByTestId('notice')).toBeEmptyDOMElement();
    expect(localStorage.getItem('logisticsRole')).toBe('runner');
  });

  it('refreshes on tab focus and every 30s, and stops after unmount', async () => {
    jest.useFakeTimers();
    try {
      localStorage.setItem('logisticsRole', 'window');
      fetchMock.mockResolvedValue(me('window'));
      const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
      await act(async () => {});
      expect(fetchMock).toHaveBeenCalledTimes(1);

      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await act(async () => { jest.advanceTimersByTime(30_000); });
      expect(fetchMock).toHaveBeenCalledTimes(3);

      unmount();
      await act(async () => {
        jest.advanceTimersByTime(60_000);
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(screen.queryByTestId('notice')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

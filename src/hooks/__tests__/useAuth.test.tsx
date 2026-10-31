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
  const { role, roleKnown, roleNotice, isAdmin, isAuthenticated, applyRole } = useAuth();
  return (
    <div>
      <p data-testid="role">{role ?? 'none'}</p>
      <p data-testid="known">{String(roleKnown)}</p>
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

  it('treats a missing role key as unknown until /me answers', async () => {
    let answer: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('known')).toHaveTextContent('false');

    await act(async () => { answer(me('boxes')); });
    expect(screen.getByTestId('known')).toHaveTextContent('true');
    expect(screen.getByTestId('role')).toHaveTextContent('boxes');
    // First time we learn it: not "an admin changed it".
    expect(screen.getByTestId('notice')).toBeEmptyDOMElement();
    expect(localStorage.getItem('logisticsRole')).toBe('boxes');
  });

  it('stores an explicit null role as known', async () => {
    fetchMock.mockResolvedValue(me(null));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('known')).toHaveTextContent('true'));
    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(localStorage.getItem('logisticsRole')).toBe('');
  });

  it('knows a stored role (even an empty one) right away', () => {
    localStorage.setItem('logisticsRole', '');
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('known')).toHaveTextContent('true');
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

function CityProbe() {
  const { referrer, cityAccess, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="referrer">{referrer ? `${referrer.id}:${referrer.name}` : 'none'}</p>
      <p data-testid="access">{cityAccess ? `${cityAccess.kind}:${cityAccess.city.id}` : 'none'}</p>
      <button
        type="button"
        onClick={() => login('tok2', {
          id: 2, first_name: 'Rita', math_admin: false, is_volunteer: false, role: null,
          referrer: { id: 7, name: 'Mendoza' }, local_city: null,
        })}
      >
        login
      </button>
      <button type="button" onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('useAuth city state', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  const loggedIn = () => {
    localStorage.setItem('authToken', 'tok');
    localStorage.setItem('userName', 'Rita R');
    localStorage.setItem('userId', '2');
    localStorage.setItem('isAdmin', 'false');
    localStorage.setItem('logisticsRole', '');
  };

  it('login stores the referrer city', () => {
    render(<AuthProvider><CityProbe /></AuthProvider>);
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByTestId('referrer')).toHaveTextContent('7:Mendoza');
    expect(screen.getByTestId('access')).toHaveTextContent('referrer:7');
    expect(JSON.parse(localStorage.getItem('logisticsReferrer') as string)).toEqual({ id: 7, name: 'Mendoza' });
    expect(localStorage.getItem('logisticsLocalCity')).toBeNull();
  });

  it('reads the stored city at mount and ignores bad JSON', () => {
    loggedIn();
    localStorage.setItem('logisticsReferrer', '{bad');
    localStorage.setItem('logisticsLocalCity', JSON.stringify({ id: 9, name: 'Salta' }));
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<AuthProvider><CityProbe /></AuthProvider>);
    expect(screen.getByTestId('referrer')).toHaveTextContent('none');
    expect(screen.getByTestId('access')).toHaveTextContent('local:9');
  });

  it('/me updates the city and clears it when null', async () => {
    loggedIn();
    fetchMock.mockResolvedValueOnce(meResponse({
      id: 2, first_name: 'Rita', last_name: 'R', math_admin: false, is_volunteer: false, role: null,
      referrer: { id: 7, name: 'Mendoza' }, local_city: null,
    }));
    const { unmount } = render(<AuthProvider><CityProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('referrer')).toHaveTextContent('7:Mendoza'));
    expect(JSON.parse(localStorage.getItem('logisticsReferrer') as string)).toEqual({ id: 7, name: 'Mendoza' });
    unmount();

    fetchMock.mockResolvedValueOnce(meResponse({
      id: 2, first_name: 'Rita', last_name: 'R', math_admin: false, is_volunteer: true, role: 'boxes',
      referrer: null, local_city: null,
    }));
    render(<AuthProvider><CityProbe /></AuthProvider>);
    await waitFor(() => expect(localStorage.getItem('logisticsReferrer')).toBeNull());
    expect(screen.getByTestId('referrer')).toHaveTextContent('none');
    expect(screen.getByTestId('access')).toHaveTextContent('none');
  });

  it('logout removes the city', async () => {
    loggedIn();
    localStorage.setItem('logisticsReferrer', JSON.stringify({ id: 7, name: 'Mendoza' }));
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<AuthProvider><CityProbe /></AuthProvider>);
    expect(screen.getByTestId('referrer')).toHaveTextContent('7:Mendoza');
    act(() => {
      fireEvent.click(screen.getByText('logout'));
    });
    expect(localStorage.getItem('logisticsReferrer')).toBeNull();
    expect(localStorage.getItem('logisticsLocalCity')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('referrer')).toHaveTextContent('none'));
  });
});

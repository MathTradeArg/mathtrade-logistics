import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EventPhaseProvider, useEventPhase } from '../EventPhaseContext';
import { NETWORK_ERROR_MESSAGE } from '@/utils/fetchWithTimeout';

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const fetchMock = global.fetch as jest.Mock;
const phase = (n: number) => ({ ok: true, status: 200, json: async () => ({ meeting_phase: n, phase_display: `P${n}` }) });
const networkDown = () => Promise.reject(new TypeError('Failed to fetch'));
// A failed GET is retried twice by useApi (500 ms + 1000 ms of backoff).
const RETRIES_MS = 2_000;

function Consumer() {
  const { eventPhase, errorEventPhase, isLoadingEventPhase, refetchEventPhase } = useEventPhase();
  return (
    <div>
      <p data-testid="phase">{eventPhase === null ? 'none' : String(eventPhase)}</p>
      <p data-testid="error">{errorEventPhase ?? ''}</p>
      <p data-testid="loading">{String(isLoadingEventPhase)}</p>
      <button type="button" onClick={refetchEventPhase}>Reintentar</button>
    </div>
  );
}

const flush = () => act(async () => { await jest.advanceTimersByTimeAsync(0); });
const advance = (ms: number) => act(async () => { await jest.advanceTimersByTimeAsync(ms); });

async function mount() {
  const utils = render(<EventPhaseProvider><Consumer /></EventPhaseProvider>);
  await flush();
  return utils;
}

describe('event phase stays current on every open phone', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    localStorage.setItem('authToken', 'tok');
    process.env.NEXT_PUBLIC_MT_API_HOST = 'http://x/';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refetches phase every 30s: switching Recepción to Entrega reaches open phones in <=30 s', async () => {
    fetchMock.mockResolvedValueOnce(phase(1)).mockResolvedValueOnce(phase(2));
    await mount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('phase')).toHaveTextContent('1');

    await advance(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('phase')).toHaveTextContent('2');
  });

  it('refetches when tab becomes visible', async () => {
    fetchMock.mockResolvedValueOnce(phase(1)).mockResolvedValueOnce(phase(2));
    await mount();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('phase')).toHaveTextContent('2');
  });

  it('keeps last phase on failure: a network drop does not erase the known phase', async () => {
    fetchMock.mockResolvedValueOnce(phase(1)).mockImplementation(networkDown);
    await mount();

    await advance(30_000 + RETRIES_MS);
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + one poll with its 2 retries
    expect(screen.getByTestId('phase')).toHaveTextContent('1');
    expect(screen.getByTestId('error')).toHaveTextContent(NETWORK_ERROR_MESSAGE);
  });

  it('clears the warning once the network is back', async () => {
    fetchMock.mockResolvedValueOnce(phase(1)).mockImplementationOnce(networkDown)
      .mockImplementationOnce(networkDown).mockImplementationOnce(networkDown)
      .mockResolvedValue(phase(1));
    await mount();
    await advance(30_000 + RETRIES_MS);
    expect(screen.getByTestId('error')).toHaveTextContent(NETWORK_ERROR_MESSAGE);

    await advance(30_000);
    expect(screen.getByTestId('error')).toHaveTextContent('');
    expect(screen.getByTestId('phase')).toHaveTextContent('1');
  });

  it('does not overlap requests', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    await mount();

    await advance(90_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not flip isLoadingEventPhase on polling (no full-screen spinners every 30 s)', async () => {
    fetchMock.mockResolvedValueOnce(phase(1)).mockImplementation(() => new Promise(() => {}));
    await mount();
    expect(screen.getByTestId('loading')).toHaveTextContent('false');

    await advance(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('offers retry when the phase never loaded instead of "El evento no empezó"', async () => {
    fetchMock.mockImplementation(networkDown);
    await mount();
    await advance(RETRIES_MS);
    expect(screen.getByTestId('phase')).toHaveTextContent('none');
    expect(screen.getByTestId('error')).toHaveTextContent(NETWORK_ERROR_MESSAGE);
    expect(screen.getByTestId('loading')).toHaveTextContent('false');

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(phase(1));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('phase')).toHaveTextContent('1');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('stops polling after unmount', async () => {
    fetchMock.mockResolvedValue(phase(1));
    const { unmount } = await mount();
    unmount();

    await advance(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

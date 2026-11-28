import { act, renderHook } from '@testing-library/react';
import { progressPercent, useEventProgress } from '../useEventProgress';
import { useApi } from '../useApi';

jest.mock('../useApi');

const mockUseApi = useApi as jest.Mock;

const sample = {
  reception: { games: { done: 50, total: 200 }, users: { done: 20, total: 80 } },
  delivery: {
    games: { done: 10, total: 100 },
    users: { done: 4, total: 40 },
    ready: { done: 10, total: 40 },
  },
};

describe('progressPercent', () => {
  it('rounds to a whole percent', () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(2, 3)).toBe(67);
  });

  it('is 0 when there is nothing to receive', () => {
    expect(progressPercent(0, 0)).toBe(0);
  });

  it('caps at 100', () => {
    expect(progressPercent(5, 4)).toBe(100);
  });
});

describe('useEventProgress', () => {
  let execute: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    execute = jest.fn().mockResolvedValue(sample);
    mockUseApi.mockReturnValue({ data: null, execute });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('asks for the progress endpoint', () => {
    renderHook(() => useEventProgress(true));
    expect(mockUseApi).toHaveBeenCalledWith('logistics/progress/');
  });

  it('loads right away and then every interval', async () => {
    renderHook(() => useEventProgress(true, 30000));
    await act(async () => {});
    expect(execute).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not fetch when disabled', async () => {
    renderHook(() => useEventProgress(false));
    await act(async () => {
      jest.advanceTimersByTime(120000);
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('stops polling on unmount', async () => {
    const { unmount } = renderHook(() => useEventProgress(true, 30000));
    await act(async () => {});
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(90000);
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('keeps going after a failed refresh', async () => {
    execute.mockRejectedValueOnce(new Error('sin red'));
    renderHook(() => useEventProgress(true, 30000));
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('returns the data of the endpoint', () => {
    mockUseApi.mockReturnValue({ data: sample, execute });
    const { result } = renderHook(() => useEventProgress(true));
    expect(result.current).toEqual(sample);
  });
});

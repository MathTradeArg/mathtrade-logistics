import React from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiceLoader } from '../DiceLoader';

type AnimateMock = jest.Mock;

const installAnimate = () => {
  const cancel = jest.fn();
  const animate: AnimateMock = jest.fn(() => ({ cancel, finished: Promise.resolve() }));
  Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true, writable: true });
  return { animate, cancel };
};

const removeAnimate = () => {
  delete (Element.prototype as unknown as Record<string, unknown>).animate;
};

const mockMatchMedia = (reduced: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn().mockReturnValue({ matches: reduced, addEventListener: jest.fn(), removeEventListener: jest.fn() }),
    configurable: true,
    writable: true,
  });
};

const poseOf = (call: unknown[]) => {
  const frames = call[0] as { transform: string }[];
  return frames[frames.length - 1].transform;
};

describe('DiceLoader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    removeAnimate();
  });

  it('renders six faces with one to six pips and is aria-hidden', () => {
    const { container } = render(<DiceLoader />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    const faces = container.querySelectorAll('[data-dice-face]');
    expect(faces).toHaveLength(6);
    const counts = Array.from(faces).map((face) => face.querySelectorAll('[data-pip]').length);
    expect([...counts].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('lays the pips out like a real right-handed die', () => {
    const { container } = render(<DiceLoader />);
    const faces = Array.from(container.querySelectorAll('[data-dice-face]'));
    const [front, right, back, left, top, bottom] = faces.map(
      (face) => face.querySelectorAll('[data-pip]').length,
    );
    expect(front + back).toBe(7);
    expect(right + left).toBe(7);
    expect(top + bottom).toBe(7);
    expect(top).toBe(1);
    expect(front).toBe(2);
    expect(right).toBe(3);
  });

  it('does not throw when Element.prototype.animate is missing', () => {
    removeAnimate();
    expect(() => {
      const { unmount } = render(<DiceLoader />);
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      unmount();
    }).not.toThrow();
  });

  it('does not animate when the user prefers reduced motion', () => {
    const { animate } = installAnimate();
    mockMatchMedia(true);
    render(<DiceLoader />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(animate).not.toHaveBeenCalled();
  });

  it('animates the die, the hop and the shadow on the first roll', () => {
    const { animate } = installAnimate();
    render(<DiceLoader />);
    expect(animate).toHaveBeenCalledTimes(3);
    const options = animate.mock.calls.map((call) => call[1]);
    expect(options.every((o) => o.duration === 1100)).toBe(true);
    expect(options.some((o) => o.easing === 'cubic-bezier(.3,.1,.3,1)')).toBe(true);
  });

  it('rolls again after the pause landing on a different face', async () => {
    const { animate } = installAnimate();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    render(<DiceLoader />);
    const first = poseOf(animate.mock.calls[0]);
    await act(async () => {
      jest.advanceTimersByTime(1100 + 450);
    });
    expect(animate.mock.calls.length).toBeGreaterThanOrEqual(6);
    const second = poseOf(animate.mock.calls[3]);
    expect(second).not.toEqual(first);
  });

  it('cancels animations and timers on unmount', async () => {
    const { animate, cancel } = installAnimate();
    const { unmount } = render(<DiceLoader />);
    unmount();
    expect(cancel).toHaveBeenCalledTimes(3);
    const calls = animate.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(animate.mock.calls.length).toBe(calls);
  });
});

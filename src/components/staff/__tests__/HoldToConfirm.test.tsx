import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HoldToConfirm from '../HoldToConfirm';

describe('HoldToConfirm', () => {
  let onConfirm: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    onConfirm = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const button = () => screen.getByRole('button', { name: 'Mantené para cambiar' });
  const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

  it('does not confirm when released after 1s, and empties the fill', () => {
    render(<HoldToConfirm label="Mantené para cambiar" onConfirm={onConfirm} />);
    fireEvent.pointerDown(button(), { pointerType: 'touch' });
    advance(1000);
    expect(screen.getByTestId('hold-fill').style.width).not.toBe('0%');
    fireEvent.pointerUp(button());
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('hold-fill')).toHaveStyle({ width: '0%' });
  });

  it('confirms once after a 2s hold', () => {
    render(<HoldToConfirm label="Mantené para cambiar" onConfirm={onConfirm} />);
    fireEvent.pointerDown(button(), { pointerType: 'touch' });
    advance(1999);
    expect(onConfirm).not.toHaveBeenCalled();
    advance(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    advance(5000);
    fireEvent.pointerUp(button());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels when the pointer leaves or is cancelled', () => {
    render(<HoldToConfirm label="Mantené para cambiar" onConfirm={onConfirm} />);
    fireEvent.pointerDown(button(), { pointerType: 'touch' });
    advance(500);
    fireEvent.pointerLeave(button());
    fireEvent.pointerDown(button(), { pointerType: 'touch' });
    advance(500);
    fireEvent.pointerCancel(button());
    advance(3000);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('never confirms on a plain click', () => {
    render(<HoldToConfirm label="Mantené para cambiar" onConfirm={onConfirm} />);
    fireEvent.click(button());
    advance(3000);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms when Enter is held for 2s, not when tapped', () => {
    render(<HoldToConfirm label="Mantené para cambiar" onConfirm={onConfirm} />);
    fireEvent.keyDown(button(), { key: 'Enter' });
    advance(300);
    fireEvent.keyUp(button(), { key: 'Enter' });
    advance(3000);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.keyDown(button(), { key: 'Enter' });
    advance(1000);
    // Auto-repeat doesn't restart the hold.
    fireEvent.keyDown(button(), { key: 'Enter', repeat: true });
    advance(1000);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ignores holds while disabled and describes itself with the helper line', () => {
    render(<HoldToConfirm label="Mantené para cambiar" onConfirm={onConfirm} disabled />);
    fireEvent.pointerDown(button(), { pointerType: 'touch' });
    advance(3000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button()).toHaveAccessibleDescription('Mantené apretado');
  });
});

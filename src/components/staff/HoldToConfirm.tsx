"use client";

import { triggerHaptic } from '@/utils/haptics';
import clsx from 'clsx';
import {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

interface HoldToConfirmProps {
  label: string;
  onConfirm: () => void;
  durationMs?: number;
  variant?: 'primary' | 'danger';
  disabled?: boolean;
}

const HOLD_KEYS = ['Enter', ' '];

/** A button that only confirms after being held down for `durationMs`
 *  (pointer, or Enter/Space). A plain click or tap never confirms. */
export default function HoldToConfirm({
  label,
  onConfirm,
  durationMs = 2000,
  variant = 'primary',
  disabled = false,
}: HoldToConfirmProps) {
  const helperId = useId();
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const stop = useCallback(() => {
    start.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) clearTimeout(timer.current);
    frame.current = null;
    timer.current = null;
    setProgress(0);
  }, []);

  const begin = useCallback(() => {
    if (disabled || start.current !== null) return;
    start.current = performance.now();
    const tick = () => {
      if (start.current === null) return;
      setProgress(Math.min((performance.now() - start.current) / durationMs, 1));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    // The timer decides; the animation frames only paint the fill.
    timer.current = setTimeout(() => {
      stop();
      triggerHaptic(40);
      onConfirmRef.current();
    }, durationMs);
  }, [disabled, durationMs, stop]);

  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    begin();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!HOLD_KEYS.includes(e.key)) return;
    // No native click from Enter/Space: only the hold counts.
    e.preventDefault();
    if (!e.repeat) begin();
  };

  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!HOLD_KEYS.includes(e.key)) return;
    e.preventDefault();
    stop();
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        aria-describedby={helperId}
        onPointerDown={onPointerDown}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={stop}
        onClick={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        className={clsx(
          'staff-btn relative touch-none select-none overflow-hidden',
          variant === 'danger' ? 'staff-btn-danger' : 'staff-btn-primary',
        )}
      >
        <span
          aria-hidden
          data-testid="hold-fill"
          className="absolute inset-y-0 left-0 bg-black/25"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="relative">{label}</span>
      </button>
      <p id={helperId} className="mt-2 text-center text-xs text-gray-500">
        Mantené apretado
      </p>
    </div>
  );
}

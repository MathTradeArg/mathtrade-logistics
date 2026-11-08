"use client";

import { EmptyState } from '@/components/common/ui/EmptyState';
import { StaffHeading } from '@/components/common/ui/StaffHeading';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import Link from 'next/link';
import type { Icon } from 'phosphor-react';
import { ReactNode } from 'react';

export function StaffPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`mx-auto w-full max-w-lg px-4 py-main text-gray-900 ${className}`}>
      {children}
    </main>
  );
}

export function StaffEmpty({ children, icon, ctaText, ctaHref }: {
  children: ReactNode;
  icon?: Icon;
  ctaText?: string;
  ctaHref?: string;
}) {
  return <EmptyState message={children} icon={icon} ctaText={ctaText} ctaHref={ctaHref} />;
}

export function StaffError({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-body text-danger">{children}</p>;
}

/** Persistent error banner that leaves the content below it usable. */
export function StaffBanner({ children, onRetry, retrying = false }: {
  children: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div role="alert" className="my-4 flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-danger">
      <p className="flex-1 text-body">{children}</p>
      {onRetry && (
        <button type="button" className="staff-btn staff-btn-outline staff-btn-sm shrink-0" onClick={onRetry} disabled={retrying}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function PhaseBlocked() {
  const { eventPhase, errorEventPhase } = useEventPhase();
  // Phase unknown because the request failed: StaffChrome shows the retry.
  if (eventPhase === null && errorEventPhase) return null;
  return (
    <StaffPage className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <StaffHeading level={1}>El evento no empezó</StaffHeading>
      <p className="mt-3 max-w-sm text-gray-600">
        Esta tarea está deshabilitada hasta que un admin abra la recepción.
      </p>
      <Link
        href="/more"
        className="staff-btn staff-btn-primary mt-8 max-w-sm"
      >
        Ir a Más
      </Link>
    </StaffPage>
  );
}

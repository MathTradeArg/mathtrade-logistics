"use client";

import Link from 'next/link';
import { ReactNode } from 'react';

export function StaffPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`mx-auto w-full max-w-lg px-4 py-main text-gray-900 ${className}`}>
      {children}
    </main>
  );
}

export function StaffEmpty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-gray-500">{children}</p>;
}

export function StaffError({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-danger">{children}</p>;
}

export function PhaseBlocked() {
  return (
    <StaffPage className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <h1 className="text-xl font-bold">El evento no empezó</h1>
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

"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function LandingPageContent() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const router = useRouter();

  useEffect(() => {
    if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) return;
    if (!isAuthenticated) return;
    if (eventPhase === 1) router.replace('/boxes/in');
    if (eventPhase === 2) router.replace('/deliver');
  }, [authIsLoading, isAuthenticated, isLoadingEventPhase, eventPhase, router]);

  if (
    authIsLoading ||
    isAuthenticated === null ||
    isLoadingEventPhase ||
    eventPhase === 1 ||
    eventPhase === 2
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <LoadingSpinner message="Cargando aplicación..." />
      </div>
    );
  }

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center text-gray-900">
      <h1 className="text-xl font-bold">El evento no empezó</h1>
      <p className="mt-3 max-w-sm text-gray-600">
        Esperá a que un admin abra la recepción. Mientras tanto podés entrar a Más.
      </p>
      <Link
        href="/more"
        className="staff-btn staff-btn-primary mt-8 max-w-sm"
      >
        Ir a Más
      </Link>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingSpinner message="Cargando..." /></div>}>
      <LandingPageContent />
    </Suspense>
  );
}

"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { roleHome } from '@/config/roles';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function LandingPageContent() {
  const { isAuthenticated, isLoading: authIsLoading, isAdmin, role, cityAccess } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const router = useRouter();

  // Where this user goes from the landing, or null to stay on it. A volunteer
  // without a role is sent to /select-role by StaffChrome's guard.
  let redirectTo: string | null = null;
  if (isAdmin) {
    if (eventPhase === 1) redirectTo = '/boxes/in';
    if (eventPhase === 2) redirectTo = '/deliver';
  } else if (role) {
    const home = roleHome(role, eventPhase);
    if (home !== '/') redirectTo = home;
  } else if (!role && cityAccess) {
    redirectTo = '/city';
  }
  const waitingForGuard = !isAdmin && role === null && !cityAccess;

  useEffect(() => {
    if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) return;
    if (!isAuthenticated) return;
    if (redirectTo) router.replace(redirectTo);
  }, [authIsLoading, isAuthenticated, isLoadingEventPhase, redirectTo, router]);

  if (
    authIsLoading ||
    isAuthenticated === null ||
    isLoadingEventPhase ||
    (isAuthenticated && (redirectTo !== null || waitingForGuard))
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

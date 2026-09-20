"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { PhaseBlocked } from '@/components/staff';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BoxesPage() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const router = useRouter();

  useEffect(() => {
    if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) return;
    if (!isAuthenticated) return;
    if (eventPhase === 1) router.replace('/boxes/in');
    if (eventPhase === 2) router.replace('/boxes/out');
  }, [authIsLoading, isAuthenticated, isLoadingEventPhase, eventPhase, router]);

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase || eventPhase === 1 || eventPhase === 2) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <LoadingSpinner message="Abriendo cajas..." />
      </div>
    );
  }

  return <PhaseBlocked />;
}

"use client";

import { AlertTriangle, Archive, ArrowRightCircle, QrCode } from 'lucide-react';
import { Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import LandingPageLink from '@/components/LandingPageLink'; 
import { LoadingSpinner } from '@/components/ui'; 
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';

function LandingPageContent() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase, eventPhaseDisplay } = useEventPhase();


  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner message="Cargando aplicación..." />
      </div>
    );
  }

  const isReceivingEnabled = eventPhase === 1 || eventPhase === 2;
  const isDeliveringEnabled = eventPhase === 2;
  const isBoxesEnabled = eventPhase === 1 || eventPhase === 2;

  return (
    <main className="flex flex-col items-center min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {isAuthenticated && (
        <AppHeader
          showBackButton={false}
        />
      )}

      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-4 mt-4 mb-4 px-4 sm:px-6 flex-grow items-stretch">

        <LandingPageLink
          href="/receive-games"
          icon={<QrCode size={48} className="text-secondary-blue dark:text-sky-400 md:mb-4" />}
          title="Recibir Juegos"
          description="Recibí los juegos de un usuario escaneando su QR."
          titleClassName="text-secondary-blue dark:text-sky-400"
          disabled={!isReceivingEnabled}
          disabledText="La recepción de juegos no está habilitada en la fase actual del evento."
        />
        <LandingPageLink
          href="/deliver-to-user"
          icon={<ArrowRightCircle size={48} className="text-accent-green dark:text-green-400 md:mb-4" />}
          title="Entregar Juegos"
          description="Entregale sus juegos a un usuario escaneando su QR."
          titleClassName="text-accent-green dark:text-green-400"
          disabled={!isDeliveringEnabled}
          disabledText="La entrega de juegos no está habilitada en la fase actual del evento."
        />
        <LandingPageLink
          href="/boxes"
          icon={<Archive size={48} className="text-teal-600 dark:text-teal-400 md:mb-4" />}
          title="Gestión de Cajas"
          description="Gestioná el armado y desarmado de cajas."
          titleClassName="text-teal-600 dark:text-teal-400"
          disabled={!isBoxesEnabled}
          disabledText="La gestión de cajas no está habilitada en la fase actual del evento."
        />
        <LandingPageLink
          href="/reports"
          icon={<AlertTriangle size={48} className="text-orange-500 dark:text-orange-400 md:mb-4" />}
          title="Reportar"
          description="Reportá un ítem o un usuario."
          titleClassName="text-orange-500 dark:text-orange-400"
          disabled={false}
          disabledText=""
        />

      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando..." /></div>}>
      <LandingPageContent />
    </Suspense>
  );
}

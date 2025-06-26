"use client";

import AppHeader from '@/components/AppHeader';
import AssembleBoxSection from '@/components/boxes/AssembleBoxSection';
import CreatedBoxesSection from '@/components/boxes/CreatedBoxesSection';
import IncomingBoxesSection from '@/components/boxes/IncomingBoxesSection';
import { LoadingSpinner } from '@/components/ui';
import { ActionStatusProvider, useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useCreatedBoxes } from '@/hooks/boxes/useCreatedBoxes';
import { useIncomingBoxes } from '@/hooks/boxes/useIncomingBoxes';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, Archive, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

export default function BoxesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando gestión de cajas..." /></div>}>
      <ActionStatusProvider>
        <BoxesPageContent />
      </ActionStatusProvider>
    </Suspense>
  );
}

function BoxesPageContent() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { actionSuccess, actionError } = useActionStatus();
  const { eventPhase, eventPhaseDisplay, isLoadingEventPhase, errorEventPhase } = useEventPhase();

  const [activeTab, setActiveTab] = useState<'review' | 'assemble' | 'created'>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('boxesPageActiveTab');
      if (savedTab === 'assemble' || savedTab === 'created') return savedTab;
    }
    return 'review';
  });

  const {
    incomingBoxes,
    isLoadingIncoming,
    errorIncoming,
    selectedLocation,
    setSelectedLocation,
    selectedBoxId,
    setSelectedBoxId,
    fetchIncomingBoxes,
    handleToggleItemSelectionInBox,
    handleDeliverSelectedItemsInBox,
    handleClearAllSelections,
  } = useIncomingBoxes();

  const {
    createdBoxes,
    isLoadingCreated,
    errorCreated,
    fetchCreatedBoxes
  } = useCreatedBoxes();

  useEffect(() => {
    localStorage.setItem('boxesPageActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isAuthenticated) {
      if (eventPhase !== null) {
        const isTabEnabled = eventPhase === 1 || eventPhase === 2;

        if (!isTabEnabled) return;

        if (activeTab === 'review') {
          fetchIncomingBoxes();
        } else if (activeTab === 'assemble' && isTabEnabled) {
        } else if (activeTab === 'created' && isTabEnabled) {
          fetchCreatedBoxes();
        }
      }
    }
  }, [isAuthenticated, activeTab, eventPhase, fetchIncomingBoxes, fetchCreatedBoxes]);

  useEffect(() => {
    if (!authIsLoading && isAuthenticated === false) {
      router.push('/');
    }
  }, [isAuthenticated, authIsLoading, router]);

  if (authIsLoading || isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner message="Verificando acceso..." />
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-dvh bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <AppHeader
        pageIcon={Archive as any}
        pageTitle="Cajas"
        showBackButton={true}
      />

      <div className="container mx-auto py-8 w-full flex flex-col flex-grow">

        {isLoadingEventPhase && <div className="mb-4"><LoadingSpinner message="Cargando fase del evento..." /></div>}
        {actionSuccess && <div className="mb-4 p-3 bg-green-100 dark:bg-green-700/30 text-green-700 dark:text-green-300 rounded-md text-sm flex items-center"><CheckCircle2 size={18} className="mr-2" />{actionSuccess}</div>}
        {actionError && <div className="mb-4 p-3 bg-red-100 dark:bg-red-700/30 text-red-700 dark:text-red-300 rounded-md text-sm flex items-center"><AlertCircle size={18} className="mr-2" />{actionError}</div>}

        <div className="mb-0">
          <nav className="flex justify-center border-b border-gray-200 dark:border-gray-700" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('review')}
              disabled={eventPhase === 0 || isLoadingEventPhase || eventPhase === null}
              className={`py-3 px-6 sm:px-8 font-semibold text-sm focus:outline-none rounded-t-lg transition-colors duration-150 ease-in-out text-center
                ${activeTab === 'review' && (eventPhase === 1 || eventPhase === 2)
                  ? 'bg-white dark:bg-gray-800 text-secondary-blue dark:text-sky-400 border-l border-t border-r border-white dark:border-gray-800 relative -mb-px z-20'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-750 border-b border-gray-200 dark:border-gray-700'
                } ${eventPhase === 0 || eventPhase === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cajas Entrantes
            </button>
            <button
              onClick={() => setActiveTab('assemble')}
              disabled={eventPhase === 0 || isLoadingEventPhase || eventPhase === null}
              className={`py-3 px-6 sm:px-8 font-semibold text-sm focus:outline-none rounded-t-lg transition-colors duration-150 ease-in-out text-center
                ${activeTab === 'assemble' && (eventPhase === 1 || eventPhase === 2)
                  ? 'bg-white dark:bg-gray-800 text-secondary-blue dark:text-sky-400 border-l border-t border-r border-white dark:border-gray-800 relative -mb-px z-20'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-750 border-b border-gray-200 dark:border-gray-700'
                } ${eventPhase === 0 || eventPhase === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Crear Cajas
            </button>
            <button
              onClick={() => setActiveTab('created')}
              disabled={eventPhase === 0 || isLoadingEventPhase || eventPhase === null}
              className={`py-3 px-6 sm:px-8 font-semibold text-sm focus:outline-none rounded-t-lg transition-colors duration-150 ease-in-out text-center
                ${activeTab === 'created' && (eventPhase === 1 || eventPhase === 2)
                  ? 'bg-white dark:bg-gray-800 text-secondary-blue dark:text-sky-400 border-l border-t border-r border-white dark:border-gray-800 relative -mb-px z-20'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-750 border-b border-gray-200 dark:border-gray-700'
                } ${eventPhase === 0 || eventPhase === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cajas Creadas
            </button>
          </nav>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-b-lg shadow-lg flex flex-col flex-grow min-h-0">
          {activeTab === 'review' && (eventPhase === 1 || eventPhase === 2) && (
            <IncomingBoxesSection
              allIncomingBoxes={incomingBoxes}
              isLoadingIncoming={isLoadingIncoming}
              errorIncoming={errorIncoming}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              selectedBoxId={selectedBoxId}
              setSelectedBoxId={setSelectedBoxId}
              handleToggleItemSelectionInBox={handleToggleItemSelectionInBox}
              handleDeliverSelectedItemsInBox={handleDeliverSelectedItemsInBox}
              onClearAllSelections={handleClearAllSelections}
            />
          )}
          {activeTab === 'assemble' && (eventPhase === 1 || eventPhase === 2) && (
            <AssembleBoxSection />
          )}
          {activeTab === 'created' && (eventPhase === 1 || eventPhase === 2) && (
            <CreatedBoxesSection
              createdBoxes={createdBoxes}
              isLoadingCreated={isLoadingCreated}
              errorCreated={errorCreated}
            />
          )}
          {eventPhase === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              La sección de {activeTab === 'review' ? 'Cajas Entrantes' : activeTab === 'assemble' ? 'Armar Caja Saliente' : 'Cajas Creadas'} está deshabilitada en la fase actual del evento ({eventPhaseDisplay}).
            </p>
          )}
          {eventPhase === null && !isLoadingEventPhase && !errorEventPhase && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Cargando la fase del evento... (Asegúrate de que el EventPhaseProvider esté correctamente configurado en el layout raíz)
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

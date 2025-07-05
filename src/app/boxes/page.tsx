"use client";

import AppHeader from '@/components/common/AppHeader';
import AssembleBoxSection from '@/components/boxes/AssembleBoxSection';
import CreatedBoxesSection from '@/components/boxes/CreatedBoxesSection';
import IncomingBoxesSection from '@/components/boxes/IncomingBoxesSection';
import { LoadingSpinner } from '@/components/common/ui';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useCreatedBoxes } from '@/hooks/boxes/useCreatedBoxes';
import { useIncomingBoxes } from '@/hooks/boxes/useIncomingBoxes';
import { useAuth } from '@/hooks/useAuth';
import { ArchiveBox } from 'phosphor-react';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import '@/styles/neumorphism.css';
import { useHapticClick } from '@/hooks/useHapticClick'; 

export default function BoxesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando gestión de cajas..." /></div>}>
      <BoxesPageContent />
    </Suspense>
  );
}

function BoxesPageContent() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { eventPhase, eventPhaseDisplay, isLoadingEventPhase, errorEventPhase } = useEventPhase();

  const [activeTab, setActiveTab] = useState<'review' | 'assemble' | 'created'>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('boxesPageActiveTab');
      if (savedTab === 'assemble' || savedTab === 'created') return savedTab;
    }
    return 'review';
  });

  const handleTabChange = useHapticClick((tab: 'review' | 'assemble' | 'created') => {
    setActiveTab(tab);
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
      <div className="flex justify-center items-center min-h-screen nm-surface">
        <LoadingSpinner message="Verificando acceso..." />
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-dvh nm-surface text-gray-900 nm-font nm-text-shadow">
      <AppHeader
        pageIcon={ArchiveBox as any}
        pageTitle="Cajas"
        showBackButton={true}
      />

      <div className="container mx-auto py-2 w-full flex flex-col flex-grow nm-font nm-text-shadow">
        <div className="mb-0 sticky top-[64px] z-30 bg-transparent">
          <nav className="flex justify-center nm-surface rounded-b-lg pt-1 pb-1" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('review')}
              disabled={eventPhase === 0 || isLoadingEventPhase || eventPhase === null}
              className={`nm-btn mx-1 ${activeTab === 'review' ? 'nm-pressed' : ''} ${eventPhase === 0 || eventPhase === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cajas Entrantes
            </button>
            <button
              onClick={() => handleTabChange('assemble')}
              disabled={eventPhase === 0 || isLoadingEventPhase || eventPhase === null}
              className={`nm-btn mx-1 ${activeTab === 'assemble' ? 'nm-pressed' : ''} ${eventPhase === 0 || eventPhase === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Crear Cajas
            </button>
            <button
              onClick={() => handleTabChange('created')}
              disabled={eventPhase === 0 || isLoadingEventPhase || eventPhase === null}
              className={`nm-btn mx-1 ${activeTab === 'created' ? 'nm-pressed' : ''} ${eventPhase === 0 || eventPhase === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cajas Creadas
            </button>
          </nav>
        </div>

        <div className="p-1 sm:p-2 rounded-b-lg flex flex-col flex-grow min-h-0 mt-1">
          {isLoadingEventPhase && (
            <div className="flex justify-center items-center min-h-[120px]">
              <LoadingSpinner message="Cargando fase del evento..." />
            </div>
          )}
          {!isLoadingEventPhase && (
            <>
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
                <p className="text-center text-gray-500 py-8 nm-font nm-text-shadow">
                  La sección de {activeTab === 'review' ? 'Cajas Entrantes' : activeTab === 'assemble' ? 'Armar Caja Saliente' : 'Cajas Creadas'} está deshabilitada en la fase actual del evento ({eventPhaseDisplay}).
                </p>
              )}
              {eventPhase === null && !errorEventPhase && (
                <p className="text-center text-gray-500 py-8 nm-font nm-text-shadow">
                  Cargando la fase del evento... (Asegúrate de que el EventPhaseProvider esté correctamente configurado en el layout raíz)
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useApi } from '@/hooks/useApi';
import { createContext, useCallback, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface EventPhaseContextType {
  eventPhase: number | null;
  eventPhaseDisplay: string | null;
  isLoadingEventPhase: boolean;
  errorEventPhase: string | null;
  refetchEventPhase: () => void;
  updateEventPhase: (newPhase: number) => Promise<{ success: boolean; message: string }>;
}

const EventPhaseContext = createContext<EventPhaseContextType | undefined>(undefined);

export const EventPhaseProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  const {
    data: phaseData,
    isLoading: isLoadingFetch,
    error: fetchError,
    execute: fetchPhaseApi,
    setData: setPhaseData,
  } = useApi<{ meeting_phase: number; phase_display: string }>('mathtrades/event-phases/');

  const {
    execute: updatePhaseApi,
    isLoading: isLoadingUpdate,
    error: updateError,
  } = useApi<{ meeting_phase: number; phase_display: string }>('mathtrades/event-phases/', { method: 'PATCH' });

  const refetchEventPhase = useCallback(() => {
    if (isAuthenticated) {
      fetchPhaseApi();
    }
  }, [isAuthenticated, fetchPhaseApi]);

  useEffect(() => {
    refetchEventPhase();
  }, [refetchEventPhase]);

  const updateEventPhase = useCallback(async (newPhase: number) => {
    if (!isAuthenticated) {
      return { success: false, message: "No autenticado." };
    }
    try {
      const updatedData = await updatePhaseApi({ meeting_phase: newPhase });
      if (updatedData) {
        setPhaseData(updatedData);
      } else {
        await fetchPhaseApi();
      }
      return { success: true, message: "Fase del evento actualizada correctamente." };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al actualizar la fase.";
      return { success: false, message: errorMessage };
    }
  }, [isAuthenticated, updatePhaseApi, fetchPhaseApi, setPhaseData]);

  const value = {
    eventPhase: phaseData?.meeting_phase ?? null,
    eventPhaseDisplay: phaseData?.phase_display ?? null,
    isLoadingEventPhase: isLoadingFetch || isLoadingUpdate,
    errorEventPhase: fetchError || updateError,
    refetchEventPhase,
    updateEventPhase,
  };

  return <EventPhaseContext.Provider value={value}>{children}</EventPhaseContext.Provider>;
};

export const useEventPhase = (): EventPhaseContextType => {
  const context = useContext(EventPhaseContext);
  if (context === undefined) {
    throw new Error('useEventPhase must be used within an EventPhaseProvider');
  }
  return context;
};
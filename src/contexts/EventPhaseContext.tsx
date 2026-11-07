"use client";

import { useApi } from '@/hooks/useApi';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface EventPhaseContextType {
  eventPhase: number | null;
  eventPhaseDisplay: string | null;
  isLoadingEventPhase: boolean;
  errorEventPhase: string | null;
  refetchEventPhase: () => void;
  updateEventPhase: (newPhase: number) => Promise<{ success: boolean; message: string }>;
}

const POLL_INTERVAL_MS = 30_000;

const EventPhaseContext = createContext<EventPhaseContextType | undefined>(undefined);

export const EventPhaseProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  const {
    data: phaseData,
    isLoading: isLoadingFetch,
    execute: fetchPhaseApi,
    setData: setPhaseData,
  } = useApi<{ meeting_phase: number; phase_display: string }>('mathtrades/event-phases/');

  const {
    execute: updatePhaseApi,
    isLoading: isLoadingUpdate,
    error: updateError,
    clearError: clearUpdateError,
  } = useApi<{ meeting_phase: number; phase_display: string }>('mathtrades/event-phases/', { method: 'PATCH' });

  // Own copy of the last fetch failure: useApi clears its error when a request
  // starts, which would make the warning blink on every poll while offline.
  const [fetchFailure, setFetchFailure] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refetchEventPhase = useCallback(async () => {
    if (!isAuthenticated || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await fetchPhaseApi();
      setFetchFailure(null);
      clearUpdateError();
    } catch (err) {
      // Keep the last phase; the failure is exposed through errorEventPhase.
      setFetchFailure(err instanceof Error ? err.message : 'No se pudo cargar la fase del evento.');
    } finally {
      inFlightRef.current = false;
    }
  }, [isAuthenticated, fetchPhaseApi, clearUpdateError]);

  useEffect(() => {
    refetchEventPhase();
  }, [refetchEventPhase]);

  // Every 30s and whenever the tab comes back (same pattern as useAuth.refreshMe).
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(refetchEventPhase, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetchEventPhase();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, refetchEventPhase]);

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
    // Only the first load (or a retry while no phase is known) shows spinners;
    // background polls never do.
    isLoadingEventPhase: (isLoadingFetch && phaseData === null) || isLoadingUpdate,
    errorEventPhase: fetchFailure || updateError,
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
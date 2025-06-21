"use client";

import AppHeader from '@/components/AppHeader';
import AssembleBoxSection from '@/components/AssembleBoxSection';
import CreatedBoxesSection from '@/components/CreatedBoxesSection';
import IncomingBoxesSection from '@/components/IncomingBoxesSection';
import NonPackableDestinationsModal from '@/components/NonPackableDestinationsModal';
import { LoadingSpinner } from '@/components/ui';
import { ActionStatusProvider, useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from "@/contexts/EventPhaseContext";
import { useAuth } from '@/hooks/useAuth';
import type { Box, Box as ImportedBox, Item } from '@/types/logistics';
import { AlertCircle, Archive, CheckCircle2 } from 'lucide-react';
import router from "next/router";
import { Suspense, useCallback, useEffect, useState } from 'react';

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
  const { isAuthenticated, userId, isLoading: authIsLoading } = useAuth();

  const [incomingBoxes, setIncomingBoxes] = useState<Box[]>([]);
  const [isLoadingIncoming, setIsLoadingIncoming] = useState(false);
  const [errorIncoming, setErrorIncoming] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'review' | 'assemble' | 'created'>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('boxesPageActiveTab');
      if (savedTab === 'assemble' || savedTab === 'created') {
        return savedTab;
      }
    }
    return 'review';
  });
  const [itemsReadyForPacking, setItemsReadyForPacking] = useState<Item[]>([]);
  const [createdBoxes, setCreatedBoxes] = useState<ImportedBox[]>([]);
  const [isLoadingCreated, setIsLoadingCreated] = useState(false);
  const [errorCreated, setErrorCreated] = useState<string | null>(null);
  const [nonPackableDestinations, setNonPackableDestinations] = useState<{
    fullyPacked: { id: number; name: string }[];
    notReady: { id: number; name: string }[];
  }>({ fullyPacked: [], notReady: [] });
  const [isNonPackableModalOpen, setIsNonPackableModalOpen] = useState(false);
  const [isLoadingPackingItems, setIsLoadingPackingItems] = useState(false);
  const [errorPackingItems, setErrorPackingItems] = useState<string | null>(null);
  const [recentlyCreatedBoxes, setRecentlyCreatedBoxes] = useState<Box[]>([]);

  const { isProcessingAction, actionError, actionSuccess, setIsProcessing, setError, setSuccess, clearMessages } = useActionStatus();
  const { eventPhase, eventPhaseDisplay, isLoadingEventPhase, errorEventPhase, refetchEventPhase } = useEventPhase();

  useEffect(() => {
    localStorage.setItem('boxesPageActiveTab', activeTab);
  }, [activeTab]);

  const fetchItemsForPacking = useCallback(async () => {
    setIsLoadingPackingItems(true);
    setErrorPackingItems(null);
    if (!isAuthenticated) {
      setErrorPackingItems("No autenticado. No se pueden cargar los items.");
      setIsLoadingPackingItems(false);
      return;
    }
    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(`${MT_API_HOST}logistics/items?exclude_amba=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al cargar los items para empaquetar.' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      const data: Item[] = await response.json();
      setItemsReadyForPacking(data);
    } catch (err) {
      setErrorPackingItems(err instanceof Error ? err.message : "Error desconocido al cargar items.");
    } finally {
      setIsLoadingPackingItems(false);
    }
  }, [isAuthenticated, setErrorPackingItems]);

  useEffect(() => {
    if (itemsReadyForPacking.length > 0) {
      const destinationsMap = new Map<number, {
        id: number;
        name: string;
        totalItems: number;
        itemsInBoxCount: number;
        itemsReadyCount: number;
      }>();

      itemsReadyForPacking.forEach(item => {
        if (item.location && item.location_name) {
          if (!destinationsMap.has(item.location)) {
            destinationsMap.set(item.location, { id: item.location, name: item.location_name, totalItems: 0, itemsInBoxCount: 0, itemsReadyCount: 0 });
          }
          const dest = destinationsMap.get(item.location)!;
          dest.totalItems++;

          if (item.box_number != null) {
            dest.itemsInBoxCount++;
          } else if (item.status === 5) {
            dest.itemsReadyCount++;
          }
        }
      });

      const fullyPacked: { id: number; name: string }[] = [];
      const notReady: { id: number; name: string }[] = [];

      destinationsMap.forEach(dest => {
        if (dest.totalItems > 0 && dest.totalItems === dest.itemsInBoxCount) {
          fullyPacked.push({ id: dest.id, name: dest.name });
        } else if (dest.totalItems > 0 && dest.itemsReadyCount === 0 && dest.itemsInBoxCount < dest.totalItems) {
          notReady.push({ id: dest.id, name: dest.name });
        }
      });

      setNonPackableDestinations({ fullyPacked, notReady });
    } else {
      setNonPackableDestinations({ fullyPacked: [], notReady: [] });
    }
  }, [itemsReadyForPacking]);

  const fetchCreatedBoxes = useCallback(async () => {
    setIsLoadingCreated(true);
    setErrorCreated(null);
    if (!isAuthenticated) {
      setErrorCreated("No autenticado. No se pueden cargar las cajas creadas.");
      setIsLoadingCreated(false);
      return;
    }
    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(`${MT_API_HOST}logistics/boxes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al cargar las cajas creadas.' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      const data: ImportedBox[] = await response.json();
      setCreatedBoxes(data);
    } catch (err) {
      setErrorCreated(err instanceof Error ? err.message : "Error desconocido al cargar cajas creadas.");
    } finally {
      setIsLoadingCreated(false);
    }
  }, [isAuthenticated]);

  const fetchIncomingBoxes = useCallback(async () => {
    setIsLoadingIncoming(true);
    setErrorIncoming(null);
    clearMessages();
    if (!isAuthenticated) {
      setErrorIncoming("No autenticado. No se puede cargar cajas.");
      setIsLoadingIncoming(false);
      return;
    }
    try {

      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(MT_API_HOST + 'logistics/boxes?destination=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al cargar las cajas entrantes.' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      const data = await response.json();
      const rawBoxes: Omit<Box, 'selectedItemIds'>[] = data;

      const boxesToReview = rawBoxes.filter(box => {
        if (box.math_items.length === 0) {
          return true;
        }

        return box.math_items.some(item => item.status !== 5 && item.status !== 6);
      }).map(box => ({
        ...box,
        selectedItemIds: new Set<number>(),
      }));
      setIncomingBoxes(boxesToReview);
    } catch (err) {
      setErrorIncoming(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setIsLoadingIncoming(false);
    }
  }, [isAuthenticated, clearMessages, setErrorIncoming]);

  useEffect(() => {
    if (incomingBoxes.length > 0) {
      const uniqueLocations = Array.from(new Set(incomingBoxes.map(b => b.origin_name).filter(Boolean))).sort();

      let nextLocationToSelect = selectedLocation;
      const currentSelectionHasBoxes = incomingBoxes.some(box => box.origin_name === selectedLocation);

      if (selectedLocation && !currentSelectionHasBoxes) {
        const currentIndex = uniqueLocations.indexOf(selectedLocation);
        if (currentIndex !== -1 && currentIndex < uniqueLocations.length - 1) {
          nextLocationToSelect = uniqueLocations[currentIndex + 1];
        } else {
          nextLocationToSelect = uniqueLocations.length > 0 ? uniqueLocations[0] : '';
        }
      } else if ((!selectedLocation || selectedLocation === '') && uniqueLocations.length > 0) {
        nextLocationToSelect = uniqueLocations[0];
      }
      setSelectedLocation(nextLocationToSelect);

      const boxesForFinalLocation = nextLocationToSelect
        ? incomingBoxes.filter(box => box.origin_name === nextLocationToSelect)
        : incomingBoxes;

      const sortedBoxes = [...boxesForFinalLocation].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
      const currentBoxSelectionExists = selectedBoxId && sortedBoxes.some(b => b.id.toString() === selectedBoxId);

      if (!currentBoxSelectionExists && sortedBoxes.length > 0) {
        setSelectedBoxId(sortedBoxes[0].id.toString());
      } else if (sortedBoxes.length === 0) {
        setSelectedBoxId('');
      }
    } else {
      setSelectedLocation('');
      setSelectedBoxId('');
    }
  }, [incomingBoxes, selectedLocation, selectedBoxId]);

  useEffect(() => {
    if (isAuthenticated) {
      if (eventPhase !== null) {
        const isTabEnabled = eventPhase === 1 || eventPhase === 2;

        if (!isTabEnabled) return;

        if (activeTab === 'review') {
          fetchIncomingBoxes();
        } else if (activeTab === 'assemble' && isTabEnabled) {
          fetchItemsForPacking();
        } else if (activeTab === 'created' && isTabEnabled) {
          fetchCreatedBoxes();
        }
      }
    }
  }, [isAuthenticated, activeTab, eventPhase, fetchIncomingBoxes, fetchItemsForPacking, fetchCreatedBoxes]);

  useEffect(() => {
    if (!authIsLoading && isAuthenticated === false) {
      router.push('/');
    }
  }, [isAuthenticated, authIsLoading]);

  const handleToggleItemSelectionInBox = useCallback((boxId: number, itemId: number, origin: number | null) => {
    setIncomingBoxes(prevBoxes =>
      prevBoxes.map(box => {
        if (box.id !== boxId || box.origin !== origin) return box;
        const newSelectedIds = new Set(box.selectedItemIds);
        if (newSelectedIds.has(itemId)) newSelectedIds.delete(itemId);
        else newSelectedIds.add(itemId);
        return { ...box, selectedItemIds: newSelectedIds };
      })
    );
  }, []);

  const handleClearAllSelections = useCallback(() => {
    setIncomingBoxes(prevBoxes =>
      prevBoxes.map(box => {
        if (box.selectedItemIds.size > 0) {
          return { ...box, selectedItemIds: new Set<number>() };
        }
        return box;
      })
    );
  }, []);

  const handleDeliverSelectedItemsInBox = useCallback(async (boxId: number, origin: number | null) => {
    const box = incomingBoxes.find(b => b.id === boxId && b.origin === origin);
    if (!box || box.selectedItemIds.size === 0) {
      setError("No hay ítems seleccionados en esta caja para entregar.");
      return;
    }
    setIsProcessing(true);
    clearMessages();

    const itemsToDeliver = Array.from(box.selectedItemIds);
    const assignedTradeCodesToDeliver = box.math_items
      .filter(item => itemsToDeliver.includes(item.assigned_trade_code))
      .map(item => item.assigned_trade_code)

    if (assignedTradeCodesToDeliver.length === 0) {
      setError("No se pudieron mapear los ítems seleccionados a códigos de trade.");
      setIsProcessing(false);
      return;
    }

    console.log(`Entregando items de caja ${boxId}: ${assignedTradeCodesToDeliver.join(', ')} por usuario ${userId}`);

    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;

      const response = await fetch(`${MT_API_HOST}logistics/games/bulk-update-status/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          status: 5,
          assigned_trade_codes: assignedTradeCodesToDeliver,
          change_by_id: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al marcar ítems como recibidos por la organización.' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      const boxIdentifier = box.number !== null ? `la caja #${box.number}` : 'la caja';
      setSuccess(`Ítems seleccionados de ${boxIdentifier} marcados como recibidos por la organización.`);
      fetchIncomingBoxes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al entregar ítems.');
    } finally {
      setIsProcessing(false);
    }
  }, [incomingBoxes, userId, fetchIncomingBoxes, setIsProcessing, setError, setSuccess, clearMessages]);

  const handleCreateBoxSubmit = useCallback(async (destinationId: number, itemIds: Set<number>) => {
    if (itemIds.size === 0 || !destinationId) {
      setError("Seleccioná items y un destino para la nueva caja válidos.");
      return;
    }
    setIsProcessing(true);
    clearMessages();

    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${MT_API_HOST}logistics/boxes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${token}`
        },
        body: JSON.stringify({
          number: Math.floor(Math.random() * 100) + 1,
          math_items: Array.from(itemIds),
          destiny: destinationId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al crear la caja.' }));
        throw new Error(errorData.detail || errorData.message || `Error ${response.status}`);
      }

      const createdBoxRaw: ImportedBox = await response.json();
      const clientSideCreatedBox: Box = {
        ...createdBoxRaw,
        selectedItemIds: new Set<number>(),
      };
      const boxIdentifier = clientSideCreatedBox.number !== null ? `Caja #${clientSideCreatedBox.number}` : 'Una nueva caja';
      setSuccess(`${boxIdentifier} creada con destino a ${clientSideCreatedBox.destination_name}.`);
      fetchItemsForPacking();
      setRecentlyCreatedBoxes(prev => [clientSideCreatedBox, ...prev]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al crear la caja.');
    } finally {
      setIsProcessing(false);
    }
  }, [fetchItemsForPacking, setIsProcessing, setError, setSuccess, clearMessages]);

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

      <div className="container mx-auto py-8">

        {isLoadingEventPhase && <div className="mb-4"><LoadingSpinner message="Cargando fase del evento..." /></div>}
        {actionSuccess && <p className="mb-4 p-3 bg-green-100 dark:bg-green-700/30 text-green-700 dark:text-green-300 rounded-md text-sm flex items-center"><CheckCircle2 size={18} className="mr-2" />{actionSuccess}</p>}
        {actionError && <p className="mb-4 p-3 bg-red-100 dark:bg-red-700/30 text-red-700 dark:text-red-300 rounded-md text-sm flex items-center"><AlertCircle size={18} className="mr-2" />{actionError}</p>}

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
              Armar Caja Saliente
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

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-b-lg shadow-lg relative z-10">
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
            <>
              {isLoadingPackingItems ? (
                <div className="flex justify-center items-center p-4"><LoadingSpinner message="Cargando ítems para armar caja..." /></div>
              ) : (
                <AssembleBoxSection
                  isLoading={isLoadingPackingItems}
                  error={errorPackingItems}
                  itemsReadyForPacking={itemsReadyForPacking}
                  onCreateBox={handleCreateBoxSubmit}
                  nonPackableDestinationsCount={nonPackableDestinations.fullyPacked.length + nonPackableDestinations.notReady.length}
                  onOpenNonPackableModal={() => setIsNonPackableModalOpen(true)}
                  recentlyCreatedBoxes={recentlyCreatedBoxes}
                />
              )}
            </>
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

      <NonPackableDestinationsModal
        isOpen={isNonPackableModalOpen}
        onClose={() => setIsNonPackableModalOpen(false)}
        destinations={nonPackableDestinations}
      />
    </main>
  );
}

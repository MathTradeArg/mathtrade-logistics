"use client";

import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { Box } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export const useIncomingBoxes = () => {
  const { isAuthenticated, userId } = useAuth();
  const { setIsProcessing, setError, setSuccess, clearMessages } = useActionStatus();

  const { data: fetchedIncomingBoxes, isLoading: isLoadingIncoming, error: errorIncoming, execute: fetchIncomingBoxesApi } = useApi<Omit<Box, 'selectedItemIds'>[]>('logistics/boxes?destination=1');
  const { execute: bulkUpdateStatusApi } = useApi<any>('logistics/games/bulk-update-status/', { method: 'PATCH' });

  const [incomingBoxes, setIncomingBoxes] = useState<Box[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');

  const fetchIncomingBoxes = useCallback(async () => {
    clearMessages();
    try {
      const rawBoxes = await fetchIncomingBoxesApi();
      if (!rawBoxes) { 
        setIncomingBoxes([]);
        return;
      }

      const boxesToReview = rawBoxes.filter(box => {
        if (box.math_items.length === 0) return true;
        return box.math_items.some(item => item.status !== 5 && item.status !== 6);
      }).map(box => ({
        ...box,
        selectedItemIds: new Set<number>(),
      }));
      setIncomingBoxes(boxesToReview); 
    } catch (err) {
      console.error("Error fetching incoming boxes:", err);
    }
  }, [clearMessages, fetchIncomingBoxesApi]);

  useEffect(() => {
    if (incomingBoxes.length > 0) {
      const uniqueLocations = Array.from(new Set(incomingBoxes.map(b => b.origin_name).filter(Boolean))).sort();
      let nextLocationToSelect = selectedLocation;
      const currentSelectionHasBoxes = incomingBoxes.some(box => box.origin_name === selectedLocation);

      if (selectedLocation && !currentSelectionHasBoxes) {
        const currentIndex = uniqueLocations.indexOf(selectedLocation);
        nextLocationToSelect = (currentIndex !== -1 && currentIndex < uniqueLocations.length - 1) ? uniqueLocations[currentIndex + 1] : (uniqueLocations.length > 0 ? uniqueLocations[0] : '');
      } else if (!selectedLocation && uniqueLocations.length > 0) {
        nextLocationToSelect = uniqueLocations[0];
      }
      setSelectedLocation(nextLocationToSelect);

      const boxesForFinalLocation = nextLocationToSelect ? incomingBoxes.filter(box => box.origin_name === nextLocationToSelect) : incomingBoxes;
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
  }, [incomingBoxes, selectedLocation, selectedBoxId, fetchedIncomingBoxes]); 

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
      prevBoxes.map(box => box.selectedItemIds.size > 0 ? { ...box, selectedItemIds: new Set<number>() } : box)
    );
  }, []);

  const handleDeliverSelectedItemsInBox = useCallback(async (boxId: number, origin: number | null) => {
    const box = incomingBoxes.find(b => b.id === boxId && b.origin === origin);
    if (!box || box.selectedItemIds.size === 0) {
      setError("No hay ítems seleccionados en esta caja para entregar.");
      return;
    }
    setIsProcessing(true);

    const itemsToDeliver = Array.from(box.selectedItemIds);
    const assignedTradeCodesToDeliver = box.math_items.filter(item => itemsToDeliver.includes(item.assigned_trade_code)).map(item => item.assigned_trade_code);

    if (assignedTradeCodesToDeliver.length === 0) {
      setError("No se pudieron mapear los ítems seleccionados a códigos de trade.");
      setIsProcessing(false);
      return;
    }

    clearMessages(); 
    try {
      await bulkUpdateStatusApi({ status: 5, assigned_trade_codes: assignedTradeCodesToDeliver, change_by_id: userId });
      const boxIdentifier = box.number !== null ? `la caja #${box.number}` : 'la caja';
      setSuccess(`Ítems seleccionados de ${boxIdentifier} marcados como recibidos por la organización.`);
      fetchIncomingBoxes();
    } catch (err) {
      const errorMessage = (err instanceof Error && (err as any).body?.detail) ? (err as any).body.detail : (err instanceof Error ? err.message : 'Error al entregar ítems.');
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [incomingBoxes, userId, fetchIncomingBoxes, bulkUpdateStatusApi, setIsProcessing, setError, setSuccess, clearMessages]);

  return {
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
  };
};

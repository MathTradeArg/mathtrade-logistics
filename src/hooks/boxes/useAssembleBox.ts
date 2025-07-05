"use client";

import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { Box, Item } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export const useAssembleBox = () => {
  const { isAuthenticated } = useAuth();
  const { setIsProcessing, setError, setSuccess, clearMessages } = useActionStatus();

  const { data: itemsReadyForPacking, isLoading: isLoadingPackingItems, error: errorPackingItems, execute: fetchItemsForPackingApi } = useApi<Item[]>('logistics/items?exclude_amba=1');
  const { execute: createBoxApi } = useApi<Box>('logistics/boxes/', { method: 'POST' });

  const [nonPackableDestinations, setNonPackableDestinations] = useState<{ fullyPacked: { id: number; name: string }[]; notReady: { id: number; name: string }[]; }>({ fullyPacked: [], notReady: [] });
  const [recentlyCreatedBoxes, setRecentlyCreatedBoxes] = useState<Box[]>([]);

  const fetchItemsForPacking = useCallback(async () => {
    try {
      const data = await fetchItemsForPackingApi();
      return data;
    } catch (err) {
      console.error("Error fetching items for packing:", err);
      throw err;
    }
  }, [fetchItemsForPackingApi]);

  useEffect(() => {
    if (itemsReadyForPacking && itemsReadyForPacking.length > 0) {
      const destinationsMap = new Map<number, {
        id: number; name: string; totalItems: number; itemsInBoxCount: number; itemsReadyCount: number;
      }>();

      itemsReadyForPacking.forEach(item => {
        if (item.location && item.location_name) {
          if (!destinationsMap.has(item.location)) {
            destinationsMap.set(item.location, { id: item.location, name: item.location_name, totalItems: 0, itemsInBoxCount: 0, itemsReadyCount: 0 });
          }
          const dest = destinationsMap.get(item.location)!;
          dest.totalItems++;
          if (item.box_number != null) dest.itemsInBoxCount++;
          else if (item.status === 5) dest.itemsReadyCount++;
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

  const handleCreateBoxSubmit = useCallback(async (destinationId: number, itemIds: Set<number>) => {
    if (itemIds.size === 0 || !destinationId) {
      setError("Seleccioná items y un destino para la nueva caja válidos.");
      return;
    }
    setIsProcessing(true);
    clearMessages();

    try {
      const createdBox = await createBoxApi({ math_items: Array.from(itemIds), destiny: destinationId });
      if (!createdBox) {
        setError("Error: No se recibió la caja creada.");
        return;
      }
      const boxIdentifier = createdBox.number !== null ? `Caja #${createdBox.number}` : 'Una nueva caja';
      setSuccess(`${boxIdentifier} creada con destino a ${createdBox.destination_name}.`);
      
      await fetchItemsForPacking();
      
      setRecentlyCreatedBoxes(prev => [{ ...createdBox, selectedItemIds: new Set() }, ...prev]);
    } catch (err) {
      const errorMessage = (err instanceof Error && (err as any).body?.detail) ? (err as any).body.detail : (err instanceof Error ? err.message : 'Error desconocido al crear la caja.');
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [fetchItemsForPacking, createBoxApi, setIsProcessing, setError, setSuccess, clearMessages]);

  return {
    itemsReadyForPacking: itemsReadyForPacking || [],
    isLoadingPackingItems,
    errorPackingItems,
    nonPackableDestinations,
    recentlyCreatedBoxes,
    fetchItemsForPacking,
    handleCreateBoxSubmit,
  };
};

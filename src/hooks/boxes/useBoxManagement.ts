"use client";

import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { Box, Item } from '@/types';
import { useCallback, useEffect, useState } from 'react';

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export interface BoxManagementState {
  boxes: Box[];
  isLoadingBoxes: boolean;
  errorBoxes: string | null;
  
  availableItems: Item[];
  isLoadingItems: boolean;
  errorItems: string | null;
  
  destinationFilter: string;
  searchFilter: string;
  
  createEmptyBox: (destinationId: number) => Promise<Box | null>;
  deleteBox: (boxId: number) => Promise<void>;
  addItemToBox: (boxId: number, itemId: number) => Promise<Box | null>;
  addMultipleItemsToBox: (boxId: number, itemIds: number[]) => Promise<{ success: number; errors: number }>;
  removeItemFromBox: (boxId: number, itemId: number) => Promise<Box | null>;
  
  getAvailableDestinations: () => { id: number; name: string }[];
  getCategorizedDestinations: () => {
    fullyAvailable: { id: number; name: string }[];
    partiallyAvailable: { id: number; name: string }[];
  };
  getDestinationAvailabilityInfo: (destinationId: number) => {
    totalItems: number;
    availableItems: number;
    boxedItems: number;
    deliverableItems: number;
    isFullyAvailable: boolean;
  };
  getDestinationsWithBoxes: () => string[];
  getFilteredBoxes: () => Box[];
  getItemsAvailableForBox: (boxId: number) => Item[];
  getAllItemsForBox: (boxId: number) => Item[];

  getLocationsWithAllItemsBoxed: () => { id: number; name: string }[];
  getLocationsWithNoDeliverableItems: () => { id: number; name: string }[];
  getItemsGroupedByNoDeliverableLocations: () => { [key: string]: Item[] };
  
  setDestinationFilter: (filter: string) => void;
  setSearchFilter: (filter: string) => void;
  
  fetchBoxes: () => Promise<void>;
  fetchItems: () => Promise<void>;
}

export const useBoxManagement = (): BoxManagementState => {
  const { isAuthenticated } = useAuth();
  const { setIsProcessing, setError, setSuccess, clearMessages } = useActionStatus();

  const [boxes, setBoxes] = useState<Box[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [destinationFilter, setDestinationFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const { data: boxesData, isLoading: isLoadingBoxes, error: errorBoxes, execute: fetchBoxesApi } = useApi<Box[]>('logistics/boxes/');
  const { data: itemsData, isLoading: isLoadingItems, error: errorItems, execute: fetchItemsApi } = useApi<Item[]>('logistics/items?exclude_amba=1');
  const { execute: createEmptyBoxApi } = useApi<Box>('logistics/boxes/', { method: 'POST' });
  const { execute: deleteBoxApi } = useApi<any>('logistics/boxes/', { method: 'DELETE' });
  const { execute: updateBoxApi } = useApi<Box>('logistics/boxes/', { method: 'PATCH' }); 

  useEffect(() => {
    if (boxesData) {
      setBoxes(boxesData.map(box => ({ ...box, selectedItemIds: new Set() })));
    }
  }, [boxesData]);

  useEffect(() => {
    if (itemsData) {
      setAvailableItems(itemsData);
    }
  }, [itemsData]);

  useEffect(() => {
    if (isInitialLoading && (!isLoadingBoxes && !isLoadingItems)) {
      setIsInitialLoading(false);
    }
  }, [isLoadingBoxes, isLoadingItems, isInitialLoading]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isInitialLoading) {
        console.warn('Timeout alcanzado para carga inicial, deshabilitando spinner');
        setIsInitialLoading(false);
      }
    }, 3000); // 3 segundos timeout

    return () => clearTimeout(timeout);
  }, [isInitialLoading]);

  useEffect(() => {
    if (errorBoxes || errorItems) {
      setIsInitialLoading(false);
    }
  }, [errorBoxes, errorItems]);

  useEffect(() => {
    if (boxesData !== null || itemsData !== null) {
      setIsInitialLoading(false);
    }
  }, [boxesData, itemsData]);

  const fetchBoxes = useCallback(async () => {
    try {
      await fetchBoxesApi();
    } catch (err) {
      console.error("Error fetching boxes:", err);
    }
  }, [fetchBoxesApi]);

  const fetchItems = useCallback(async () => {
    try {
      await fetchItemsApi();
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  }, [fetchItemsApi]);

  const createEmptyBox = useCallback(async (destinationId: number): Promise<Box | null> => {
    setIsProcessing(true);
    clearMessages();

    try {
      const createdBox = await createEmptyBoxApi({ 
        destiny: destinationId, 
        math_items: [] 
      });
      
      if (!createdBox) {
        setError("Error: No se recibió la caja creada.");
        return null;
      }
      
      const boxIdentifier = createdBox.number !== null ? `Caja #${createdBox.number}` : 'Nueva caja';
      
      const destinationName = availableItems.find(item => item.location === destinationId)?.location_name || 'destino desconocido';
      
      setSuccess(`${boxIdentifier} creada con destino a ${destinationName}.`);
      
      const enrichedBox: Box = {
        ...createdBox,
        destination_name: destinationName,
        selectedItemIds: new Set<number>()
      };
      
      setBoxes(prevBoxes => [...prevBoxes, enrichedBox]);
      
      fetchBoxesApi().catch(err => console.error("Background refresh failed:", err));
      fetchItemsApi().catch(err => console.error("Background refresh failed:", err));
      
      return enrichedBox;
    } catch (err) {
      const errorMessage = (err instanceof Error && (err as any).body?.detail) ? (err as any).body.detail : (err instanceof Error ? err.message : 'Error desconocido al crear la caja.');
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [createEmptyBoxApi, fetchBoxesApi, fetchItemsApi, setIsProcessing, setError, setSuccess, clearMessages, availableItems]);

  const deleteBox = useCallback(async (boxId: number) => {
    setIsProcessing(true);
    clearMessages();

    try {
      await deleteBoxApi(undefined, `${boxId}/`);
      setSuccess("Caja eliminada correctamente.");
      
      await fetchBoxes();
      await fetchItems();
    } catch (err) {
      const errorMessage = (err instanceof Error && (err as any).body?.detail) ? (err as any).body.detail : (err instanceof Error ? err.message : 'Error desconocido al eliminar la caja.');
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [deleteBoxApi, fetchBoxes, fetchItems, setIsProcessing, setError, setSuccess, clearMessages]);

  const addItemToBox = useCallback(async (boxId: number, itemId: number): Promise<Box | null> => {

    try {
      const currentBox = boxes.find(b => b.id === boxId);
      if (!currentBox) {
        setError("Caja no encontrada.");
        return null;
      }

      const itemToAdd = availableItems.find(item => item.id === itemId);
      if (!itemToAdd) {
        setError("Ítem no encontrado.");
        return null;
      }

      const updatedMathItems = [...currentBox.math_items.map(item => item.id), itemId];

      await updateBoxApi({
        number: currentBox.number,
        destiny: currentBox.destiny,
        math_items: updatedMathItems
      }, `${boxId}/`);

      const boxIdentifier = currentBox.number !== null ? `Caja #${currentBox.number}` : 'La caja';
      setSuccess(`Ítem "${itemToAdd.title}" agregado a ${boxIdentifier} correctamente.`);
      
      const updatedBox: Box = {
        ...currentBox,
        math_items: [...currentBox.math_items, itemToAdd]
      };
      
      setBoxes(prevBoxes => prevBoxes.map(box => 
        box.id === boxId ? updatedBox : box
      ));
      
      setAvailableItems(prevItems => prevItems.map(item => 
        item.id === itemId ? { ...item, box_number: currentBox.number } : item
      ));
      
      fetchBoxesApi().catch(err => console.error("Background refresh failed:", err));
      fetchItemsApi().catch(err => console.error("Background refresh failed:", err));
      
      return updatedBox;
    } catch (err) {
      const errorMessage = (err instanceof Error && (err as any).body?.detail) ? (err as any).body.detail : (err instanceof Error ? err.message : 'Error desconocido al agregar el ítem.');
      setError(errorMessage);
      return null;
    }
  }, [updateBoxApi, fetchBoxesApi, fetchItemsApi, setError, setSuccess, boxes, availableItems]);

  const addMultipleItemsToBox = useCallback(async (boxId: number, itemIds: number[]): Promise<{ success: number; errors: number }> => {
    let success = 0;
    let errors = 0;

    const currentBox = boxes.find(b => b.id === boxId);
    if (!currentBox) {
      setError("Caja no encontrada.");
      return { success, errors: itemIds.length };
    }

    const itemsToAdd = availableItems.filter(item => itemIds.includes(item.id));
    const updatedMathItems = [...currentBox.math_items.map(item => item.id), ...itemIds];

    try {
      await updateBoxApi({
        number: currentBox.number,
        destiny: currentBox.destiny,
        math_items: updatedMathItems
      }, `${boxId}/`);

      success = itemIds.length;

      const boxIdentifier = currentBox.number !== null ? `Caja #${currentBox.number}` : 'La caja';
      const itemsText = itemIds.length === 1 ? 'juego' : 'juegos';
      setSuccess(`${itemIds.length} ${itemsText} agregados a ${boxIdentifier} correctamente.`);
      
      const updatedBox: Box = {
        ...currentBox,
        math_items: [...currentBox.math_items, ...itemsToAdd]
      };
      
      setBoxes(prevBoxes => prevBoxes.map(box => 
        box.id === boxId ? updatedBox : box
      ));
      
      setAvailableItems(prevItems => prevItems.map(item => 
        itemIds.includes(item.id) ? { ...item, box_number: currentBox.number } : item
      ));
      
      fetchBoxesApi().catch(err => console.error("Background refresh failed:", err));
      fetchItemsApi().catch(err => console.error("Background refresh failed:", err));
      
    } catch (err) {
      errors = itemIds.length;
      const errorMessage = (err instanceof Error && (err as any).body?.detail) ? (err as any).body.detail : (err instanceof Error ? err.message : 'Error desconocido al agregar los ítems.');
      setError(errorMessage);
    }

    return { success, errors };
  }, [updateBoxApi, fetchBoxesApi, fetchItemsApi, setError, setSuccess, boxes, availableItems]);

  const removeItemFromBox = useCallback(async (boxId: number, itemId: number): Promise<Box | null> => {
    try {
      const currentBox = boxes.find(b => b.id === boxId);
      if (!currentBox) {
        setError("Caja no encontrada.");
        return null;
      }

      const itemToRemove = currentBox.math_items.find(item => item.id === itemId);
      const updatedMathItems = currentBox.math_items
        .filter(item => item.id !== itemId)
        .map(item => item.id);

      await updateBoxApi({
        number: currentBox.number,
        destiny: currentBox.destiny,
        math_items: updatedMathItems
      }, `${boxId}/`);

      const boxIdentifier = currentBox.number !== null ? `Caja #${currentBox.number}` : 'La caja';
      const itemName = itemToRemove?.title || 'Ítem';
      setSuccess(`"${itemName}" removido de ${boxIdentifier} correctamente.`);
      
      const updatedBox: Box = {
        ...currentBox,
        math_items: currentBox.math_items.filter(item => item.id !== itemId)
      };
      
      setBoxes(prevBoxes => prevBoxes.map(box => 
        box.id === boxId ? updatedBox : box
      ));
      
      setAvailableItems(prevItems => prevItems.map(item => 
        item.id === itemId ? { ...item, box_number: null } : item
      ));
      
      fetchBoxesApi().catch(err => console.error("Background refresh failed:", err));
      fetchItemsApi().catch(err => console.error("Background refresh failed:", err));
      
      return updatedBox;
    } catch (err) {
      const errorMessage = (err instanceof Error && (err as any).body?.detail) ? (err as any).body.detail : (err instanceof Error ? err.message : 'Error desconocido al remover el ítem.');
      setError(errorMessage);
      return null;
    }
  }, [updateBoxApi, fetchBoxesApi, fetchItemsApi, setError, setSuccess, boxes]);

  const getAvailableDestinations = useCallback(() => {
    const destinations = new Map<number, string>();
    availableItems.forEach(item => {
      if (
        item.location &&
        item.location_name &&
        item.status === 5 &&
        !item.box_number
      ) {
        destinations.set(item.location, item.location_name);
      }
    });
    return Array.from(destinations.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableItems]);

  const getCategorizedDestinations = useCallback(() => {
    const fullyAvailable: { id: number; name: string }[] = [];
    const partiallyAvailable: { id: number; name: string }[] = [];

    const destinationMap = new Map<number, { 
      totalItems: number; 
      itemsInState5: number;
      availableForPacking: number; 
      alreadyBoxed: number; 
      name: string 
    }>();

    availableItems.forEach(item => {
      if (item.location && item.location_name) {
        const entry = destinationMap.get(item.location) || { 
          totalItems: 0,
          itemsInState5: 0,
          availableForPacking: 0, 
          alreadyBoxed: 0,
          name: item.location_name 
        };
        
        entry.totalItems += 1;
        
        if (item.status === 5) {
          entry.itemsInState5 += 1;
          if (item.box_number) {
            entry.alreadyBoxed += 1;
          } else {
            entry.availableForPacking += 1;
          }
        }
        
        destinationMap.set(item.location, entry);
      }
    });

    destinationMap.forEach((value, key) => {
      if (value.availableForPacking > 0) {
        if (value.totalItems === value.itemsInState5 && value.availableForPacking > 0) {
          fullyAvailable.push({ id: key, name: value.name });
        } else {
          partiallyAvailable.push({ id: key, name: value.name });
        }
      }
    });

    fullyAvailable.sort((a, b) => a.name.localeCompare(b.name));
    partiallyAvailable.sort((a, b) => a.name.localeCompare(b.name));

    return { fullyAvailable, partiallyAvailable };
  }, [availableItems]);

  const getDestinationAvailabilityInfo = useCallback((destinationId: number) => {
    const allDestinationItems = availableItems.filter(item => item.location === destinationId);
    const totalItems = allDestinationItems.length;
    const itemsInState5 = allDestinationItems.filter(item => item.status === 5).length;
    const availableItemsCount = allDestinationItems.filter(item => item.status === 5 && !item.box_number).length;
    const alreadyBoxedItems = allDestinationItems.filter(item => item.status === 5 && item.box_number).length;
    
    const isFullyAvailable = totalItems > 0 && totalItems === itemsInState5 && availableItemsCount > 0;

    return {
      totalItems: totalItems, 
      availableItems: availableItemsCount, 
      boxedItems: alreadyBoxedItems, 
      deliverableItems: itemsInState5,
      isFullyAvailable
    };
  }, [availableItems]);

  const getLocationsWithAllItemsBoxed = useCallback(() => {
    const locationMap = new Map<number, { name: string; totalDeliverable: number; boxed: number }>();
    availableItems.forEach(item => {
      if (item.location && item.location_name) {
        const entry = locationMap.get(item.location) || { name: item.location_name, totalDeliverable: 0, boxed: 0 };
        if (item.status === 5) {
          entry.totalDeliverable += 1;
          if (item.box_number) {
            entry.boxed += 1;
          }
        }
        locationMap.set(item.location, entry);
      }
    });
    return Array.from(locationMap.entries())
      .filter(([_, entry]) => {
        return entry.totalDeliverable > 0 && entry.boxed === entry.totalDeliverable;
      })
      .map(([id, entry]) => ({ id, name: entry.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableItems]);

  const getLocationsWithNoDeliverableItems = useCallback(() => {
    const locationMap = new Map<number, { name: string; hasItemsInState5: boolean }>();
    availableItems.forEach(item => {
      if (item.location && item.location_name) {
        const entry = locationMap.get(item.location) || { name: item.location_name, hasItemsInState5: false };
        if (item.status === 5) {
          entry.hasItemsInState5 = true;
        }
        locationMap.set(item.location, entry);
      }
    });
    return Array.from(locationMap.entries())
      .filter(([_, entry]) => !entry.hasItemsInState5)
      .map(([id, entry]) => ({ id, name: entry.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableItems]);

  const getDestinationsWithBoxes = useCallback(() => {
    const destinations = new Set<string>();
    
    boxes.forEach(box => {
      if (box.destination_name) {
        destinations.add(box.destination_name);
      }
    });
    
    return Array.from(destinations).sort((a, b) => a.localeCompare(b));
  }, [boxes]);

  const getFilteredBoxes = useCallback(() => {
    return boxes.filter(box => {
      const matchesDestination = !destinationFilter || box.destination_name === destinationFilter;
      const matchesSearch = !searchFilter || 
        normalizeText(box.destination_name || '').includes(normalizeText(searchFilter)) ||
        box.math_items.some(item => 
          normalizeText(item.title || '').includes(normalizeText(searchFilter)) ||
          normalizeText(item.first_name || '').includes(normalizeText(searchFilter)) ||
          normalizeText(item.last_name || '').includes(normalizeText(searchFilter))
        );
      
      return matchesDestination && matchesSearch;
    });
  }, [boxes, destinationFilter, searchFilter]);

  const getItemsAvailableForBox = useCallback((boxId: number) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return [];
    
    const destinationId = availableItems.find(item => item.location_name === box.destination_name)?.location;
    if (!destinationId) return [];
    
    return availableItems.filter(item => 
      item.location === destinationId && 
      item.status === 5 && 
      !item.box_number
    );
  }, [availableItems, boxes]);

  const getAllItemsForBox = useCallback((boxId: number) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return [];
    
    const destinationId = availableItems.find(item => item.location_name === box.destination_name)?.location;
    if (!destinationId) return [];
    
    return availableItems.filter(item => 
      item.location === destinationId
    );
  }, [availableItems, boxes]);

  const getItemsGroupedByNoDeliverableLocations = useCallback(() => {
    const locationsWithNoDeliverables = getLocationsWithNoDeliverableItems();
    const locationIds = new Set(locationsWithNoDeliverables.map(loc => loc.id));
    
    const groupedItems: { [key: string]: Item[] } = {};
    
    availableItems.forEach(item => {
      if (item.location && item.location_name && locationIds.has(item.location)) {
        const locationName = item.location_name;
        if (!groupedItems[locationName]) {
          groupedItems[locationName] = [];
        }
        groupedItems[locationName].push(item);
      }
    });
    
    return groupedItems;
  }, [availableItems, getLocationsWithNoDeliverableItems]);

  return {
    boxes,
    isLoadingBoxes: isInitialLoading && isLoadingBoxes,
    errorBoxes,
    availableItems,
    isLoadingItems: isInitialLoading && isLoadingItems,
    errorItems,
    destinationFilter,
    searchFilter,
    
    createEmptyBox,
    deleteBox,
    addItemToBox,
    addMultipleItemsToBox,
    removeItemFromBox,
    
    getAvailableDestinations,
    getCategorizedDestinations,
    getDestinationAvailabilityInfo,
    getDestinationsWithBoxes,
    getFilteredBoxes,
    getItemsAvailableForBox,
    getAllItemsForBox,

    getLocationsWithAllItemsBoxed,
    getLocationsWithNoDeliverableItems,
    getItemsGroupedByNoDeliverableLocations,
    
    setDestinationFilter,
    setSearchFilter,
    
    fetchBoxes,
    fetchItems,
  };
};

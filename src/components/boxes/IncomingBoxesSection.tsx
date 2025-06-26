"use client";

import { LoadingSpinner } from '@/components/ui';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import type { Box } from '@/types/logistics';
import React, { useCallback, useMemo } from 'react';
import BoxCard from './BoxCard';

interface IncomingBoxesSectionProps {
  allIncomingBoxes: Box[];
  isLoadingIncoming: boolean;
  errorIncoming: string | null;
  handleToggleItemSelectionInBox: (boxId: number, itemId: number, origin: number | null) => void;
  handleDeliverSelectedItemsInBox: (boxId: number, origin: number | null) => Promise<void>;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  selectedBoxId: string;
  setSelectedBoxId: (boxId: string) => void;
  onClearAllSelections: () => void;
}

const IncomingBoxesSection: React.FC<IncomingBoxesSectionProps> = ({
  allIncomingBoxes,
  isLoadingIncoming,
  errorIncoming,
  handleToggleItemSelectionInBox,
  handleDeliverSelectedItemsInBox,
  selectedLocation,
  setSelectedLocation,
  selectedBoxId,
  setSelectedBoxId,
  onClearAllSelections,
}) => {
  const { isProcessingAction } = useActionStatus();

  const actualUniqueLocations = useMemo(() => {
    const locationNames = new Set(
      allIncomingBoxes
        .map(box => box.origin_name)
        .filter(name => typeof name === 'string' && name.trim() !== '')
    );
    return Array.from(locationNames).sort();
  }, [allIncomingBoxes]);

  const handleLocationChange = useCallback((newLocation: string) => {
    onClearAllSelections();
    setSelectedLocation(newLocation);
    const boxesForNewLocation = allIncomingBoxes.filter(box => box.origin_name === newLocation);

    const sortedBoxes = [...boxesForNewLocation].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

    if (sortedBoxes.length > 0) {
      setSelectedBoxId(sortedBoxes[0].id.toString());
    } else {
      setSelectedBoxId('');
    }
  }, [allIncomingBoxes, setSelectedLocation, setSelectedBoxId, onClearAllSelections]);

  const availableBoxesForDropdown = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }
    const sourceBoxes = allIncomingBoxes.filter(box => box.origin_name === selectedLocation);
    return sourceBoxes
      .map(box => ({ id: box.id.toString(), number: box.number, itemCount: box.math_items.length }))
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  }, [allIncomingBoxes, selectedLocation]);

  const displayedBoxes = useMemo(() => {
    return allIncomingBoxes
      .filter(box => {
        return selectedLocation ? box.origin_name === selectedLocation : true;
      })
      .filter(box => {
        return selectedBoxId ? box.id.toString() === selectedBoxId : true;
      });
  }, [allIncomingBoxes, selectedLocation, selectedBoxId]);

  const selectedBoxToDisplayNumber = useMemo(() => {
    if (!selectedBoxId) return 'Todas';
    const box = allIncomingBoxes.find(b => b.id.toString() === selectedBoxId);
    return box && box.number !== null ? box.number.toString() : 'Todas';
  }, [selectedBoxId, allIncomingBoxes]);

  return (
    <section className="w-full mb-8 pt-2">
      {allIncomingBoxes.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filtros:</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <select
                id="locationFilter"
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={actualUniqueLocations.length === 0}
              >
                {actualUniqueLocations.length === 0 && <option value="">Sin Orígenes Disponibles</option>}
                {actualUniqueLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                id="boxFilter"
                value={selectedBoxId}
                onChange={(e) => setSelectedBoxId(e.target.value)}
                disabled={availableBoxesForDropdown.length === 0}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400"
              >
                <option value="">{selectedLocation ? `Todas las cajas de ${selectedLocation}` : 'Todas las Cajas'}</option>
                {availableBoxesForDropdown.map(box => (
                  <option key={box.id} value={box.id}>
                    {box.number !== null ? `Caja #${box.number}` : 'Caja sin número'} ({box.itemCount} items)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {isLoadingIncoming && <LoadingSpinner message="Cargando cajas entrantes..." />}

      {!isLoadingIncoming && (
        <>
          {errorIncoming && <p className="text-red-500 dark:text-red-400">{errorIncoming}</p>}
          {!errorIncoming && allIncomingBoxes.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No hay cajas entrantes pendientes de revisión.</p>
          )}
          {!errorIncoming && allIncomingBoxes.length > 0 && displayedBoxes.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">
              No hay cajas que coincidan con los filtros seleccionados (Origen: {selectedLocation || 'Todos'}, Caja: #{selectedBoxToDisplayNumber}).
            </p>
          )}
          {!errorIncoming && displayedBoxes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedBoxes.map(box => (
                <BoxCard key={`${box.origin}-${box.id}`} box={box} onToggleItemSelection={(boxId, itemId) => handleToggleItemSelectionInBox(boxId, itemId, box.origin)} onDeliverSelected={() => handleDeliverSelectedItemsInBox(box.id, box.origin)} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default IncomingBoxesSection;

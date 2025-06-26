"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import type { Box } from '@/types';
import React, { useCallback, useMemo, useRef } from 'react';
import { triggerHaptic } from '@/utils/haptics';
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
  const locationSelectRef = useRef<HTMLSelectElement>(null);
  const boxSelectRef = useRef<HTMLSelectElement>(null);

  const actualUniqueLocations = useMemo(() => {
    const locationNames = new Set(
      allIncomingBoxes
        .map(box => box.origin_name)
        .filter(name => typeof name === 'string' && name.trim() !== '')
    );
    return Array.from(locationNames).sort();
  }, [allIncomingBoxes]);

  const handleLocationChange = useCallback((newLocation: string) => {
    triggerHaptic();
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
    <section className="w-full flex flex-col flex-grow min-h-0">
      {allIncomingBoxes.length > 0 && (
        <div className="mb-3 flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filtros:</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <select
                id="locationFilter"
                ref={locationSelectRef}
                value={selectedLocation}
                onChange={(e) => {
                  handleLocationChange(e.target.value);
                  if (locationSelectRef.current) {
                    locationSelectRef.current.style.boxShadow = '';
                  }
                }}
                onClick={() => triggerHaptic()}
                onBlur={e => { e.currentTarget.style.boxShadow = ''; }}
                className="w-full nm-select"
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
                ref={boxSelectRef}
                value={selectedBoxId}
                onChange={(e) => {
                  triggerHaptic();
                  setSelectedBoxId(e.target.value);
                  if (boxSelectRef.current) {
                    boxSelectRef.current.style.boxShadow = '';
                  }
                }}
                onClick={() => triggerHaptic()}
                onBlur={e => { e.currentTarget.style.boxShadow = ''; }}
                disabled={availableBoxesForDropdown.length === 0}
                className="w-full nm-select"
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

      <div className="flex-grow min-h-0 overflow-y-auto">
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
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-0 flex-1 w-full bg-transparent p-0">
                {displayedBoxes.map(box => (
                  <li key={`${box.origin}-${box.id}`} className="list-none w-full">
                    <BoxCard box={box} onToggleItemSelection={(boxId, itemId) => handleToggleItemSelectionInBox(boxId, itemId, box.origin)} onDeliverSelected={() => handleDeliverSelectedItemsInBox(box.id, box.origin)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default IncomingBoxesSection;

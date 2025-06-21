"use client";

import { LoadingSpinner } from '@/components/ui';
import { Loader2 } from 'lucide-react';
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useActionStatus } from '../contexts/ActionStatusContext';
import type { Box, Item as PackingItem } from '../types/logistics';
import GameRowItem from './GameRowItem';

interface AssembleBoxSectionProps {
  itemsReadyForPacking: PackingItem[];
  onCreateBox: (destinationId: number, itemIds: Set<number>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  nonPackableDestinationsCount: number;
  onOpenNonPackableModal: () => void;
  recentlyCreatedBoxes: Box[];
}

const AssembleBoxSection: React.FC<AssembleBoxSectionProps> = ({
  itemsReadyForPacking,
  onCreateBox,
  isLoading,
  error,
  nonPackableDestinationsCount,
  onOpenNonPackableModal,
  recentlyCreatedBoxes,
}) => {
  const [newBoxDestination, setNewBoxDestination] = useState<string>('');
  const [selectedItemsToPack, setSelectedItemsToPack] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const { isProcessingAction } = useActionStatus();

  const packableItems = useMemo(() =>
    itemsReadyForPacking.filter(item => item.status === 5 && item.box_number == null),
    [itemsReadyForPacking]
  );

  const destinations = useMemo(() => {
    const locationMap = new Map<number, string>();
    packableItems.forEach(item => {
      if (item.location && item.location_name) {
        locationMap.set(item.location, item.location_name);
      }
    });
    return Array.from(locationMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [packableItems]);

  const emptyStateMessage = useMemo(() => {
    if (destinations.length > 0 || isLoading || error) {
      return null;
    }
    if (itemsReadyForPacking.length === 0) {
      return "No hay items disponibles en este momento.";
    }

    const allItemsHaveBoxId = itemsReadyForPacking.every(item => item.box_number != null);
    if (allItemsHaveBoxId) {
      return "¡Excelente! Ya se han armado todas las cajas para los destinos disponibles.";
    }

    return "Las ubicaciones restantes no tienen juegos para empacar aún.";
  }, [itemsReadyForPacking, destinations.length, isLoading, error]);

  const filteredItemsForDisplay = useMemo(() => {
    const selectedDestId = parseInt(newBoxDestination, 10);
    if (isNaN(selectedDestId)) {
      return [];
    }

    let items = itemsReadyForPacking
      .filter(item => item.location === selectedDestId);

    if (searchTerm.trim()) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.assigned_trade_code.toString().includes(lowerCaseSearchTerm)
      );
    }

    return items.sort((a, b) => {
      const statusA = a.status === 5 ? 0 : 1;
      const statusB = b.status === 5 ? 0 : 1;
      if (statusA !== statusB) { return statusA - statusB; }
      return a.assigned_trade_code - b.assigned_trade_code;
    });
  }, [itemsReadyForPacking, newBoxDestination, searchTerm]);

  const toggleItemForPacking = useCallback((itemId: number) => {
    setSelectedItemsToPack(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        const item = itemsReadyForPacking.find(i => i.id === itemId);
        if (item && item.status === 5 && item.box_number == null) {
          newSet.add(itemId);
        }
      }
      return newSet;
    });
  }, [itemsReadyForPacking]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newBoxDestination) return;
    onCreateBox(parseInt(newBoxDestination, 10), selectedItemsToPack);
    setNewBoxDestination('');
    setSelectedItemsToPack(new Set());
  };

  useEffect(() => {
    setSelectedItemsToPack(new Set());
    setSearchTerm('');
  }, [newBoxDestination]);

  useEffect(() => {
    if (isProcessingAction) {
      return;
    }
    const currentAvailableAndFilteredIds = new Set(
      filteredItemsForDisplay
        .filter(item => item.status === 5 && item.box_number == null)
        .map(i => i.id)
    );
    setSelectedItemsToPack(prev => new Set([...prev].filter(id => currentAvailableAndFilteredIds.has(id))));
  }, [filteredItemsForDisplay, isProcessingAction]);

  useEffect(() => {
    if (destinations.length > 0 && newBoxDestination === '') {
      setNewBoxDestination(destinations[0].id.toString());
    } else if (destinations.length === 0 && newBoxDestination !== '') {
      setNewBoxDestination('');
    }
  }, [destinations, newBoxDestination]);


  return (
    <section>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1 min-h-[28px]">
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Destino:</label>
            <button
              type="button"
              onClick={onOpenNonPackableModal}
              className="py-1 px-2 text-xs font-semibold text-secondary-blue dark:text-sky-400 bg-gray-100 dark:bg-gray-900 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150 ease-in-out"
              disabled={nonPackableDestinationsCount === 0}
            >
              Destinos no empaquetables aún ({nonPackableDestinationsCount})
            </button>
          </div>
          {destinations.length > 0 ? (
            <select
              id="destination"
              value={newBoxDestination}
              onChange={(e) => setNewBoxDestination(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
              disabled={isLoading}
            >
              <option value="" disabled>Seleccioná un destino</option>
              {destinations.map(dest => (
                <option key={dest.id} value={dest.id}>{dest.name}</option>
              ))}
            </select>
          ) : (
            !isLoading && !error && (
              <div className="mt-1 p-3 text-center bg-gray-50 dark:bg-gray-750 rounded-md">
                <p className="text-sm text-gray-500 dark:text-gray-400">{emptyStateMessage}</p>
              </div>
            )
          )}
        </div>
        {destinations.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">Items para Empaquetar:</h4>
              <input
                type="text"
                placeholder="Buscar por título o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full sm:w-64 pl-3 pr-4 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            {isLoading ? (
              <LoadingSpinner message="Cargando items..." />
            ) : error ? (
              <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-1 space-y-2 bg-gray-50 dark:bg-gray-800">
                {filteredItemsForDisplay.length > 0 ? (
                  filteredItemsForDisplay.map(item => {
                    const isAvailable = item.status === 5 && item.box_number == null;
                    return (
                      <GameRowItem
                        key={item.assigned_trade_code}
                        id={item.assigned_trade_code}
                        title={item.title}
                        ownerName={`${item.first_name} ${item.last_name}`}
                        variant={isAvailable ? 'actionable' : 'pendingOther'}
                        isSelected={selectedItemsToPack.has(item.id)}
                        onRowClick={isAvailable ? () => toggleItemForPacking(item.id) : undefined}
                      />
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No se encontraron ítems que coincidan.
                  </p>
                )}
              </ul>
            )}
          </div>
        )}
        <button type="submit" disabled={isProcessingAction || selectedItemsToPack.size === 0 || !newBoxDestination.trim() || destinations.length === 0} className="w-full px-4 py-2 text-sm bg-accent-green hover:bg-green-700 text-white font-semibold rounded-md shadow-sm transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
          {isProcessingAction ? <Loader2 size={20} className="animate-spin mx-auto" /> : `Crear Caja (${selectedItemsToPack.size} items)`}
        </button>
      </form>

      {recentlyCreatedBoxes.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Cajas Recientemente Creadas
          </h3>
          <div className="space-y-6">
            {recentlyCreatedBoxes.map(box => (
              <div key={box.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-secondary-blue dark:text-sky-400">
                    {box.number !== null ? `Caja #${box.number}` : 'Caja sin número'}
                  </h4>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Destino: <span className="font-semibold">{box.destination_name}</span>
                  </span>
                </div>
                <ul className="space-y-2">
                  {box.math_items.map(item => (
                    <GameRowItem
                      key={item.assigned_trade_code}
                      id={item.assigned_trade_code}
                      title={item.title}
                      variant="default"
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default AssembleBoxSection;

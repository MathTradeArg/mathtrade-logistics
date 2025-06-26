"use client";

import NonPackableDestinationsModal from "@/components/NonPackableDestinationsModal";
import RecentlyCreatedBox from "@/components/boxes/RecentlyCreatedBox";
import { LoadingSpinner } from "@/components/ui";
import { useAssembleBox } from "@/hooks/boxes/useAssembleBox";
import { Info, PackagePlus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import GameRowItem from "../GameRowItem";

const normalizeSearchString = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export default function AssembleBoxSection() {
  const {
    itemsReadyForPacking,
    isLoadingPackingItems,
    errorPackingItems,
    nonPackableDestinations,
    recentlyCreatedBoxes,
    fetchItemsForPacking,
    handleCreateBoxSubmit,
  } = useAssembleBox();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [isNonPackableModalOpen, setIsNonPackableModalOpen] = useState(false);

  useEffect(() => {
    fetchItemsForPacking();
  }, [fetchItemsForPacking]);

  const availableDestinations = useMemo(() => {
    const packableItems = itemsReadyForPacking.filter(
      item => item.status === 5 && item.box_number === null
    );
    const destinations = new Map<number, string>();
    packableItems.forEach(item => {
      if (item.location && item.location_name) {
        destinations.set(item.location, item.location_name);
      }
    });
    return Array.from(destinations.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsReadyForPacking]);

  const filteredItems = useMemo(() => {
    const selectedDestId = parseInt(selectedDestination, 10);
    if (isNaN(selectedDestId)) {
      return [];
    }

    let itemsForDestination = itemsReadyForPacking.filter(item => item.location === selectedDestId);

    if (searchTerm.trim()) {
      const normalizedSearch = normalizeSearchString(searchTerm);
      itemsForDestination = itemsForDestination.filter(item => {
        const ownerName = `${item.first_name || ''} ${item.last_name || ''}`;
        return (
          normalizeSearchString(item.title).includes(normalizedSearch) ||
          normalizeSearchString(ownerName).includes(normalizedSearch) ||
          item.assigned_trade_code.toString().includes(normalizedSearch)
        );
      });
    }

    itemsForDestination.sort((a, b) => {
      const aIsInBox = a.box_number !== null;
      const bIsInBox = b.box_number !== null;

      if (aIsInBox && !bIsInBox) return 1;
      if (!aIsInBox && bIsInBox) return -1;

      const aIsPackable = a.status === 5;
      const bIsPackable = b.status === 5;

      if (aIsPackable && !bIsPackable) return -1;
      if (!aIsPackable && bIsPackable) return 1;

      return a.assigned_trade_code - b.assigned_trade_code;
    });

    return itemsForDestination;
  }, [itemsReadyForPacking, searchTerm, selectedDestination]);

  const handleToggleItem = (itemId: number) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) newSet.delete(itemId);
      else newSet.add(itemId);
      return newSet;
    });
  };

  const handleSubmit = () => {
    if (selectedDestination) {
      const destinationId = Number(selectedDestination);

      const remainingPackableItems = itemsReadyForPacking.filter(item =>
        item.location === destinationId &&
        item.status === 5 &&
        item.box_number === null &&
        !selectedItemIds.has(item.id)
      );

      handleCreateBoxSubmit(destinationId, selectedItemIds);
      setSelectedItemIds(new Set());

      if (remainingPackableItems.length === 0) {
        setSelectedDestination('');
      }
    }
  };

  useEffect(() => {
    if (availableDestinations.length > 0 && !selectedDestination) {
      setSelectedDestination(availableDestinations[0].id.toString());
    }
  }, [availableDestinations, selectedDestination]);

  if (isLoadingPackingItems) {
    return <div className="flex justify-center items-center p-4"><LoadingSpinner message="Cargando ítems para armar caja..." /></div>;
  }

  if (errorPackingItems) {
    return <p className="text-center text-red-500 dark:text-red-400">Error: {errorPackingItems}</p>;
  }

  return (
    <>
      <div style={{ maxHeight: '75dvh' }} className="flex flex-col bg-white dark:bg-gray-800">
        <div className="flex-grow min-h-0 overflow-y-auto p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-2/3 flex flex-col space-y-4 lg:min-h-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por título, dueño o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div className="rounded-lg flex-grow overflow-y-auto">
                {filteredItems.length > 0 ? (
                  <ul className="divide-y space-y-3 divide-gray-200 dark:divide-gray-700">
                    {filteredItems.map(item => (
                      <GameRowItem
                        key={item.id}
                        id={item.assigned_trade_code}
                        title={item.title}
                        ownerName={`${item.first_name || ''} ${item.last_name || ''}`}
                        isSelected={selectedItemIds.has(item.id)}
                        onRowClick={item.status === 5 && item.box_number === null ? () => handleToggleItem(item.id) : undefined}
                        variant={item.box_number !== null ? 'delivered' : (item.status === 5 ? 'actionable' : 'pendingOther')}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-center p-4 text-gray-500">No hay ítems listos para empaquetar que coincidan con la búsqueda.</p>
                )}
              </div>
            </div>
            <div className="lg:w-1/3 flex flex-col space-y-4">
              <div className="hidden lg:block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-semibold mb-2">Crear Caja Saliente</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{selectedItemIds.size} ítems seleccionados.</p>
                <select value={selectedDestination} onChange={(e) => setSelectedDestination(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 mb-3">
                  {availableDestinations.length === 0 && <option value="">No hay destinos con ítems para empaquetar</option>}
                  {availableDestinations.map(dest => <option key={dest.id} value={dest.id}>{dest.name}</option>)}
                </select>
                <button onClick={handleSubmit} disabled={selectedItemIds.size === 0 || !selectedDestination} className="w-full flex items-center justify-center gap-2 p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  <PackagePlus size={18} /> Crear Caja
                </button>
              </div>
              <div className="hidden lg:block">
                {(nonPackableDestinations.fullyPacked.length > 0 || nonPackableDestinations.notReady.length > 0) && (
                  <button onClick={() => setIsNonPackableModalOpen(true)} className="w-full text-sm text-secondary-blue dark:text-sky-400 hover:underline flex items-center justify-center gap-1">
                    <Info size={16} /> Ver destinos no disponibles para empaquetar
                  </button>
                )}
              </div>
              {recentlyCreatedBoxes.length > 0 && (
                <div className="space-y-3 lg:flex-grow lg:overflow-y-auto">
                  <h3 className="font-semibold">Cajas Recientemente Creadas</h3>
                  {recentlyCreatedBoxes.map(box => <RecentlyCreatedBox key={box.id} box={box} />)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="lg:hidden flex flex-col space-y-4 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-semibold mb-2">Crear Caja Saliente</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{selectedItemIds.size} ítems seleccionados.</p>
            <select value={selectedDestination} onChange={(e) => setSelectedDestination(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 mb-3">
              {availableDestinations.length === 0 && <option value="">No hay destinos con ítems para empaquetar</option>}
              {availableDestinations.map(dest => <option key={dest.id} value={dest.id}>{dest.name}</option>)}
            </select>
            <button onClick={handleSubmit} disabled={selectedItemIds.size === 0 || !selectedDestination} className="w-full flex items-center justify-center gap-2 p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">
              <PackagePlus size={18} /> Crear Caja
            </button>
          </div>
          {(nonPackableDestinations.fullyPacked.length > 0 || nonPackableDestinations.notReady.length > 0) && (
            <button onClick={() => setIsNonPackableModalOpen(true)} className="w-full text-sm text-secondary-blue dark:text-sky-400 hover:underline flex items-center justify-center gap-1">
              <Info size={16} /> Ver destinos no disponibles para empaquetar
            </button>
          )}
        </div>
      </div>
      <NonPackableDestinationsModal isOpen={isNonPackableModalOpen} onClose={() => setIsNonPackableModalOpen(false)} destinations={nonPackableDestinations} />
    </>
  );
}
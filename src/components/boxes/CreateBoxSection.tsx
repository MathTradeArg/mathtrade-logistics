"use client";

import { GameRowItem } from "@/components/common";
import { LoadingSpinner } from "@/components/common/ui";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useBoxManagement } from "@/hooks/boxes/useBoxManagement";
import { useHapticClick } from '@/hooks/useHapticClick';
import {
  CaretUp,
  List,
  MagnifyingGlass,
  Package,
  Plus,
  PlusCircle,
  Trash,
  X
} from "phosphor-react";
import { useEffect, useState } from "react";

export default function CreateBoxSection() {
  const {
    boxes,
    isLoadingBoxes,
    errorBoxes,
    availableItems,
    isLoadingItems,
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
    getLocationsWithNoDeliverableItems,
    getLocationsWithAllItemsBoxed,
    getItemsGroupedByNoDeliverableLocations,
    setDestinationFilter,
    setSearchFilter,
    fetchBoxes,
    fetchItems,
  } = useBoxManagement();

  const [isBoxesMenuOpen, setIsBoxesMenuOpen] = useState(false);
  const [currentBox, setCurrentBox] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDestinationForNewBox, setSelectedDestinationForNewBox] = useState<string>('');
  const [showAvailableItems, setShowAvailableItems] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ boxId: number; boxName: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ boxId: number; itemId: number; itemTitle: string } | null>(null);
  
  const [itemSearchFilter, setItemSearchFilter] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [isAddingMultipleItems, setIsAddingMultipleItems] = useState(false);
  const [showPartialAvailabilityWarning, setShowPartialAvailabilityWarning] = useState(false);

  const availableDestinations = getAvailableDestinations();
  const categorizedDestinations = getCategorizedDestinations();
  const destinationsWithBoxes = getDestinationsWithBoxes();
  const filteredBoxes = getFilteredBoxes();

  const [showInfoModal, setShowInfoModal] = useState(false);
  const locationsNoDeliverable = getLocationsWithNoDeliverableItems();
  const locationsAllBoxed = getLocationsWithAllItemsBoxed();
  const itemsGroupedByNoDeliverableLocations = getItemsGroupedByNoDeliverableLocations();
  const shouldShowInfoButton = (locationsNoDeliverable.length > 0 || locationsAllBoxed.length > 0);

  useEffect(() => {
    fetchBoxes();
    fetchItems();
  }, [fetchBoxes, fetchItems]);

  useEffect(() => {
    if (currentBox && boxes.length > 0) {
      const updatedBox = boxes.find(box => box.id === currentBox.id);
      if (updatedBox && JSON.stringify(updatedBox) !== JSON.stringify(currentBox)) {
        setCurrentBox(updatedBox);
      }
    }
  }, [boxes, currentBox]);

  const handleCreateBox = async () => {
    if (!selectedDestinationForNewBox) return;

    const createdBox = await createEmptyBox(parseInt(selectedDestinationForNewBox));
    if (createdBox) {
      setCurrentBox(createdBox);
      setShowCreateForm(false);
      setSelectedDestinationForNewBox('');
      setShowPartialAvailabilityWarning(false);
    }
  };

  const handleDeleteBox = async (boxId: number) => {
    await deleteBox(boxId);
    setConfirmDelete(null);
    if (currentBox?.id === boxId) {
      setCurrentBox(null);
    }
  };

  const handleAddItem = async (boxId: number, itemId: number) => {
    const updatedBox = await addItemToBox(boxId, itemId);
    if (updatedBox) {
      setCurrentBox(updatedBox);
    }
  };

  const handleRemoveItem = async (boxId: number, itemId: number) => {
    const updatedBox = await removeItemFromBox(boxId, itemId);
    if (updatedBox) {
      setCurrentBox(updatedBox);
    }
  };

  const handleAddMultipleItems = async (boxId: number) => {
    if (selectedItemIds.size === 0) return;
    
    setIsAddingMultipleItems(true);
    
    try {
      const itemIds = Array.from(selectedItemIds);
      const result = await addMultipleItemsToBox(boxId, itemIds);
      
      if (result.success > 0) {
        await fetchBoxes();
        await fetchItems();
      }
      
      setSelectedItemIds(new Set());
      setItemSearchFilter('');
      setShowAvailableItems(false);
      
    } finally {
      setIsAddingMultipleItems(false);
    }
  };

  const getFilteredAvailableItems = (boxId: number) => {
    const availableItems = getItemsAvailableForBox(boxId);
    
    if (!itemSearchFilter) return availableItems;
    
    const normalizedSearch = itemSearchFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return availableItems.filter(item => 
      (item.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearch) ||
      (item.first_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearch) ||
      (item.last_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearch) ||
      item.assigned_trade_code.toString().includes(itemSearchFilter)
    );
  };

  const handleItemSelection = (itemId: number) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleCloseAvailableItemsModal = () => {
    setShowAvailableItems(false);
    setSelectedItemIds(new Set());
    setItemSearchFilter('');
  };

  const handleSelectBox = (box: any) => {
    setCurrentBox(box);
    setIsBoxesMenuOpen(false);
  };

  const toggleBoxesMenu = () => {
    setIsBoxesMenuOpen(!isBoxesMenuOpen);
  };

  const showCreateFormClick = useHapticClick(() => setShowCreateForm(true));
  const hideCreateFormClick = useHapticClick(() => {
    setShowCreateForm(false);
    setSelectedDestinationForNewBox('');
    setShowPartialAvailabilityWarning(false);
  });
  const createBoxClick = useHapticClick(handleCreateBox);
  const closeAndShowCreateFormClick = useHapticClick(() => {
    setCurrentBox(null);
    setShowCreateForm(true);
  });
  const showAvailableItemsClick = useHapticClick(() => setShowAvailableItems(true));
  const hideAvailableItemsClick = useHapticClick(handleCloseAvailableItemsModal);
  const toggleBoxesMenuClick = useHapticClick(toggleBoxesMenu);
  const selectBoxClick = useHapticClick(handleSelectBox);
  const deleteBoxClick = useHapticClick((boxId: number, boxName: string) => {
    setConfirmDelete({ boxId, boxName });
  });
  const closeDeleteModalClick = useHapticClick(() => setConfirmDelete(null));
  const closeRemoveModalClick = useHapticClick(() => setConfirmRemove(null));
  const confirmDeleteClick = useHapticClick(() => {
    if (confirmDelete) {
      handleDeleteBox(confirmDelete.boxId);
    }
  });
  const confirmRemoveClick = useHapticClick(() => {
    if (confirmRemove) {
      handleRemoveItem(confirmRemove.boxId, confirmRemove.itemId);
    }
  });

  const handleItemSelectionWithHaptic = useHapticClick(handleItemSelection);
  const handleAddMultipleItemsWithHaptic = useHapticClick(handleAddMultipleItems);

  const getItemStatusText = (item: any) => {
    if (item.status === 5) return null; 
    switch (item.status) {
      case 1: 
      case 2: 
      case 3:
      case 4: return "Pendiente";
      default: return `Estado ${item.status}`;
    }
  };

  const getFilteredAllItems = (boxId: number) => {
    const allItems = getAllItemsForBox(boxId);
    
    if (!itemSearchFilter) return allItems;
    
    const normalizedSearch = itemSearchFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return allItems.filter(item => 
      (item.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearch) ||
      (item.first_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearch) ||
      (item.last_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearch) ||
      item.assigned_trade_code.toString().includes(itemSearchFilter)
    );
  };

  const handleDestinationChange = (destinationId: string) => {
    setSelectedDestinationForNewBox(destinationId);
    setShowPartialAvailabilityWarning(false);
    
    if (destinationId) {
      const availabilityInfo = getDestinationAvailabilityInfo(parseInt(destinationId));
      if (!availabilityInfo.isFullyAvailable) {
        setShowPartialAvailabilityWarning(true);
      }
    }
  };

  if (isLoadingBoxes || isLoadingItems) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner message="Cargando gestión de cajas..." />
      </div>
    );
  }

  if (errorBoxes || errorItems) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400">
        Error: {errorBoxes || errorItems}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 p-4 pb-20 overflow-y-auto">
        {!currentBox && (
          <div className="space-y-4">
            <div className="text-center">

              {!showCreateForm ? (
                <button
                  onClick={showCreateFormClick}
                  className="flex items-center gap-2 px-6 py-3 nm-btn-primary mx-auto"
                >
                  <Plus size={20} />
                  Crear Caja Vacía
                </button>
              ) : (
                <div className="nm-surface rounded-lg p-6 max-w-md mx-auto">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Seleccionar destino para la nueva caja
                  </h3>
                  <div className="space-y-4">
                    <select
                      value={selectedDestinationForNewBox}
                      onChange={(e) => handleDestinationChange(e.target.value)}
                      className="w-full nm-select"
                    >
                      <option value="">Seleccionar destino...</option>
                      {categorizedDestinations.fullyAvailable.length > 0 && (
                        <optgroup label="📦 Todos los juegos disponibles">
                          {categorizedDestinations.fullyAvailable.map(dest => (
                            <option key={dest.id} value={dest.id}>
                              {dest.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {categorizedDestinations.partiallyAvailable.length > 0 && (
                        <optgroup label="⚠️ Juegos parcialmente disponibles">
                          {categorizedDestinations.partiallyAvailable.map(dest => (
                            <option key={dest.id} value={dest.id}>
                              {dest.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {showPartialAvailabilityWarning && selectedDestinationForNewBox && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              Esta ubicación no tiene todos sus juegos disponibles aún
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                              {(() => {
                                const destinationId = parseInt(selectedDestinationForNewBox);
                                const info = getDestinationAvailabilityInfo(destinationId);
                                const totalItems = info.totalItems;
                                const deliverableItems = info.deliverableItems;
                                const available = info.availableItems;
                                const boxed = info.boxedItems;
                                const notAvailable = totalItems - available - boxed;
                                
                                console.log('Debug warning:', {
                                  destinationId,
                                  selectedDestinationForNewBox,
                                  info,
                                  totalItems,
                                  deliverableItems,
                                  available,
                                  boxed,
                                  notAvailable
                                });
                                
                                let message = ""
                                if (notAvailable > 0) {
                                  message += `${notAvailable} juegos no disponibles`;
                                }
                                message += ` de ${totalItems} juegos totales.`;
                                
                                return message;
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={createBoxClick}
                        disabled={!selectedDestinationForNewBox}
                        className="nm-btn-primary flex-1 disabled:opacity-50"
                      >
                        Crear Caja
                      </button>
                      <button
                        onClick={hideCreateFormClick}
                        className="nm-btn-secondary flex-1"
                      >
                        Cancelar
                      </button>
                    </div>
                    {shouldShowInfoButton && (
                      <div className="flex justify-center mt-3">
                        <button
                          type="button"
                          className="text-xs px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline transition-colors"
                          onClick={() => setShowInfoModal(true)}
                        >
                          ¿Por qué no veo todas las ubicaciones?
                        </button>
                      </div>
                    )}
                  </div>
                  {showInfoModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className="nm-surface rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            Ubicaciones no disponibles
                          </h3>
                          <button
                            onClick={() => setShowInfoModal(false)}
                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            aria-label="Cerrar"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="overflow-y-auto flex-1 space-y-6">
                          {locationsNoDeliverable.length > 0 && (
                            <div>
                              <div className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
                                Ningún juego listo para empacar:
                              </div>
                              <div className="space-y-2">
                                {locationsNoDeliverable.map((location) => (
                                  <div key={location.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Package size={16} className="text-orange-600 dark:text-orange-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-800 dark:text-gray-200 text-left">
                                          {location.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 text-left">
                                          {(() => {
                                            const items = itemsGroupedByNoDeliverableLocations[location.name] || [];
                                            return `${items.length} juego${items.length !== 1 ? 's' : ''} no listo${items.length !== 1 ? 's' : ''}`;
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {locationsAllBoxed.length > 0 && (
                            <div>
                              <div className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
                                Todos los juegos ya están en cajas:
                              </div>
                              <div className="space-y-2">
                                {locationsAllBoxed.map((location) => (
                                  <div key={location.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Package size={16} className="text-green-600 dark:text-green-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-800 dark:text-gray-200 text-left">
                                          {location.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 text-left">
                                          Todos los juegos están en cajas
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {(locationsNoDeliverable.length === 0 && locationsAllBoxed.length === 0) && (
                            <div className="text-sm text-gray-500 text-center py-4">
                              No hay ubicaciones ocultas.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {currentBox && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Package size={24} className="text-blue-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                        {currentBox.number ? `Caja #${currentBox.number}` : `Caja ${currentBox.id}`}
                      </h2>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {currentBox.math_items.length} juegos
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      Destino: {currentBox.destination_name}
                    </p>
                    {(currentBox.created_by_first_name || currentBox.created_by_last_name) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Última modificación: {currentBox.created_by_first_name} {currentBox.created_by_last_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={closeAndShowCreateFormClick}
                    className="px-3 py-2 nm-btn-primary text-sm flex items-center gap-2 whitespace-nowrap"
                    title="Crear nueva caja"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Nueva Caja</span>
                    <span className="sm:hidden">Nueva</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={showAvailableItemsClick}
                  className="px-3 py-2 nm-btn-secondary text-sm flex items-center gap-2 whitespace-nowrap"
                  title="Agregar juegos"
                >
                  <PlusCircle size={16} />
                  <span>Agregar juegos</span>
                </button>
                <button
                  onClick={() => deleteBoxClick(currentBox.id, currentBox.number ? `Caja #${currentBox.number}` : `Caja ${currentBox.id}`)}
                  className="px-3 py-2 nm-btn-danger text-sm flex items-center gap-2 whitespace-nowrap"
                  title="Eliminar caja"
                >
                  <Trash size={16} />
                  <span className="hidden sm:inline">Borrar caja</span>
                  <span className="sm:hidden">Borrar</span>
                </button>
              </div>
            </div>

            <div className={`nm-surface rounded-lg p-6 min-h-[400px] relative ${currentBox.math_items.length === 0 ? 'empty-box-container' : ''
              }`}>
              {currentBox.math_items.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Caja vacía</p>
                    <p className="text-sm">Usa el botón + para agregar juegos</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentBox.math_items.map((item: any, index: number) => (
                    <GameRowItem
                      key={item.id}
                      id={item.assigned_trade_code}
                      title={item.title}
                      ownerName={`${item.first_name || ''} ${item.last_name || ''}`}
                      isSelected={false}
                      variant="box-item"
                      onRemoveItem={() => setConfirmRemove({ boxId: currentBox.id, itemId: item.id, itemTitle: item.title })}
                    />
                  ))}
                </div>
              )}
            </div>

            {showAvailableItems && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="nm-surface rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      Agregar juegos a la caja
                      {selectedItemIds.size > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 ml-2">
                          ({selectedItemIds.size} seleccionados)
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={hideAvailableItemsClick}
                      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="relative nm-input-with-icon">
                      <div className="search-icon-container">
                        <MagnifyingGlass size={20} className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar juegos por título, usuario o código..."
                        value={itemSearchFilter}
                        onChange={(e) => setItemSearchFilter(e.target.value)}
                        className="w-full pr-4 py-2 nm-input text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {(() => {
                      const allFilteredItems = getFilteredAllItems(currentBox.id);
                      const availableItems = allFilteredItems.filter(item => item.status === 5);
                      const unavailableItems = allFilteredItems.filter(item => item.status !== 5);
                      
                      if (allFilteredItems.length === 0) {
                        const totalItems = getAllItemsForBox(currentBox.id).length;
                        return (
                          <div className="text-center py-12">
                            <Package size={48} className="mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                              {totalItems === 0 
                                ? "No hay juegos en este destino."
                                : "No se encontraron juegos que coincidan con la búsqueda."
                              }
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-4">
                          {availableItems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Disponibles para agregar ({availableItems.length})
                                </p>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                Tocá un juego para seleccionarlo o deseleccionarlo
                              </p>
                              <div className="space-y-2">
                                {availableItems.map(item => (
                                  <GameRowItem
                                    key={item.id}
                                    id={item.assigned_trade_code}
                                    title={item.title}
                                    ownerName={`${item.first_name || ''} ${item.last_name || ''}`}
                                    isSelected={selectedItemIds.has(item.id)}
                                    variant="actionable"
                                    onRowClick={() => handleItemSelectionWithHaptic(item.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {unavailableItems.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  No disponibles ({unavailableItems.length})
                                </p>
                              </div>
                              <div className="space-y-2">
                                {unavailableItems.map(item => {
                                  const statusText = getItemStatusText(item);
                                  return (
                                    <div key={item.id} className="relative">
                                      <div className="opacity-50 pointer-events-none">
                                        <GameRowItem
                                          id={item.assigned_trade_code}
                                          title={item.title}
                                          ownerName={`${item.first_name || ''} ${item.last_name || ''}`}
                                          statusDisplay={statusText || undefined}
                                          isSelected={false}
                                          variant="default"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {availableItems.length === 0 && unavailableItems.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                                Todos los juegos de este destino están pendientes de procesamiento.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleAddMultipleItemsWithHaptic(currentBox.id)}
                      disabled={selectedItemIds.size === 0 || isAddingMultipleItems}
                      className="w-full px-4 py-3 nm-btn-primary disabled:opacity-50 font-medium"
                    >
                      {isAddingMultipleItems 
                        ? 'Agregando...' 
                        : selectedItemIds.size > 0 
                          ? `Agregar ${selectedItemIds.size} juegos seleccionados`
                          : 'Selecciona juegos para agregar'
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40 nm-surface">
        <button
          onClick={toggleBoxesMenuClick}
          className="w-full p-4 flex items-center justify-center gap-2 nm-btn-secondary hover:scale-105 transition-all duration-200"
        >
          <List size={20} />
          <span className="font-medium">Cajas Existentes ({boxes.length})</span>
          <div className={`transition-transform duration-200 ${isBoxesMenuOpen ? 'rotate-180' : ''}`}>
            <CaretUp size={16} />
          </div>
        </button>
      </div>

      <div
        className={`fixed inset-0 bg-white dark:bg-gray-800 z-50 transition-all duration-300 ease-in-out transform ${isBoxesMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        style={{
          visibility: isBoxesMenuOpen ? 'visible' : 'hidden',
          transitionDelay: isBoxesMenuOpen ? '0ms' : '300ms'
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Cajas Existentes
            </h2>
            <button
              onClick={toggleBoxesMenuClick}
              className="p-2 rounded-top hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative nm-input-with-icon">
                <div className="search-icon-container">
                  <MagnifyingGlass size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por destino o contenido..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pr-4 py-2 nm-input"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  className="w-full nm-select"
                >
                  <option value="">Todos los destinos</option>
                  {destinationsWithBoxes.map(dest => (
                    <option key={dest} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredBoxes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {boxes.length === 0 ? "No hay cajas creadas aún." : "No se encontraron cajas que coincidan con los filtros."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBoxes.map(box => (
                  <div
                    key={box.id}
                    onClick={() => selectBoxClick(box)}
                    className={`p-4 nm-surface rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 ${currentBox?.id === box.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Package size={20} className={currentBox?.id === box.id ? 'text-blue-600' : 'text-blue-500'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium ${currentBox?.id === box.id ? 'text-blue-800 dark:text-blue-200' : 'text-gray-800 dark:text-gray-200'
                            }`}>
                            {box.number ? `Caja #${box.number}` : `Caja ${box.id}`}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {box.math_items.length} juegos
                          </span>
                        </div>
                        <p className={`text-sm ${currentBox?.id === box.id ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                          {box.destination_name}
                        </p>
                        {(box.created_by_first_name || box.created_by_last_name) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            Última modificación: {box.created_by_first_name} {box.created_by_last_name}
                          </p>
                        )}
                      </div>
                      {currentBox?.id === box.id && (
                        <div className="text-blue-500">
                          <Package size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmationModal
          isOpen={true}
          onClose={closeDeleteModalClick}
          onConfirm={confirmDeleteClick}
          itemsToDeliver={[]}
          actionType="all"
          modalTitle={`Eliminar ${confirmDelete.boxName}`}
          mode="delete-box"
          customMessage={`¿Estás seguro de que querés eliminar esta caja? Esta acción no se puede deshacer.`}
          confirmButtonText="Eliminar caja"
        />
      )}

      {confirmRemove && (
        <ConfirmationModal
          isOpen={true}
          onClose={closeRemoveModalClick}
          onConfirm={confirmRemoveClick}
          itemsToDeliver={[]}
          actionType="all"
          modalTitle={`${confirmRemove.itemTitle}`}
          mode="delete-box"
          customMessage={`¿Estás seguro de que querés sacar este item de la caja?`}
          confirmButtonText="Eliminar item"
        />
      )}
    </div>
  );
}

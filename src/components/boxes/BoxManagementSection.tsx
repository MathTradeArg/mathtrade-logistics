"use client";

import { GameRowItem } from "@/components/common";
import { LoadingSpinner } from "@/components/common/ui";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useBoxManagement } from "@/hooks/boxes/useBoxManagement";
import { useHapticClick } from "@/hooks/useHapticClick";
import { triggerHaptic } from "@/utils/haptics";
import { 
  Package, 
  MagnifyingGlass, 
  Plus, 
  Trash, 
  X,
  PlusCircle,
  MinusCircle
} from "phosphor-react";
import { useEffect, useState, useRef } from "react";

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

interface BoxManagementSectionProps {
  hideCreateButton?: boolean;
  hideTitle?: boolean;
}

export default function BoxManagementSection({ 
  hideCreateButton = false, 
  hideTitle = false 
}: BoxManagementSectionProps = {}) {
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
    getFilteredBoxes,
    getItemsAvailableForBox,
    setDestinationFilter,
    setSearchFilter,
    fetchBoxes,
    fetchItems,
  } = useBoxManagement();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDestinationForNewBox, setSelectedDestinationForNewBox] = useState<string>('');
  const [expandedBoxId, setExpandedBoxId] = useState<number | null>(null);
  const [showAddItemsToBox, setShowAddItemsToBox] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ boxId: number; boxName: string } | null>(null);
  const [confirmRemoveItem, setConfirmRemoveItem] = useState<{ boxId: number; itemId: number, itemTitle: string } | null>(null);
  const [recentlyModifiedBoxes, setRecentlyModifiedBoxes] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollToBoxId, setScrollToBoxId] = useState<number | null>(null);
  const boxRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  const [itemSearchFilter, setItemSearchFilter] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [isAddingMultipleItems, setIsAddingMultipleItems] = useState(false);

  const availableDestinations = getAvailableDestinations();
  const filteredBoxes = getFilteredBoxes();

  useEffect(() => {
    fetchBoxes();
    fetchItems();
  }, [fetchBoxes, fetchItems]);

  useEffect(() => {
    if (scrollToBoxId) {
      const attemptScroll = (attempts = 0) => {
        const boxRef = boxRefs.current.get(scrollToBoxId);
        if (boxRef) {
          boxRef.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
          setScrollToBoxId(null);
          return;
        }
        
        const boxElement = document.querySelector(`[data-box-id="${scrollToBoxId}"]`);
        if (boxElement) {
          boxElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
          setScrollToBoxId(null);
        } else if (attempts < 5) {
          setTimeout(() => attemptScroll(attempts + 1), 100);
        } else {
          console.warn('No se pudo encontrar la caja después de 5 intentos');
          setScrollToBoxId(null);
        }
      };
      
      setTimeout(() => attemptScroll(), 100);
    }
  }, [scrollToBoxId, boxes]);

  const handleCreateBox = async () => {
    if (!selectedDestinationForNewBox) return;
    
    await createEmptyBox(parseInt(selectedDestinationForNewBox));
    setShowCreateForm(false);
    setSelectedDestinationForNewBox('');
  };

  const handleDeleteBox = async (boxId: number) => {
    await deleteBox(boxId);
    setConfirmDelete(null);
  };

  const handleAddItem = async (boxId: number, itemId: number) => {
    setRecentlyModifiedBoxes(prev => new Set(prev).add(boxId));
    
    await addItemToBox(boxId, itemId);
    
    setExpandedBoxId(boxId);
    
    setScrollToBoxId(boxId);
    
    setTimeout(() => {
      setRecentlyModifiedBoxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(boxId);
        return newSet;
      });
    }, 2000);
    
  };

  const handleRemoveItem = async (boxId: number, itemId: number) => {
    setRecentlyModifiedBoxes(prev => new Set(prev).add(boxId));
    
    await removeItemFromBox(boxId, itemId);
    
    setScrollToBoxId(boxId);
    
    setTimeout(() => {
      setRecentlyModifiedBoxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(boxId);
        return newSet;
      });
    }, 2000);
  };

  const toggleBoxExpansion = (boxId: number) => {
    setExpandedBoxId(expandedBoxId === boxId ? null : boxId);
  };

  const handleAddMultipleItems = async (boxId: number) => {
    if (selectedItemIds.size === 0) return;
    
    setIsAddingMultipleItems(true);
    
    try {
      const itemIds = Array.from(selectedItemIds);
      const result = await addMultipleItemsToBox(boxId, itemIds);
      
      if (result.success > 0) {
        setRecentlyModifiedBoxes(prev => new Set(prev).add(boxId));
        
        setExpandedBoxId(boxId);
        
        setScrollToBoxId(boxId);
        
        setTimeout(() => {
          setRecentlyModifiedBoxes(prev => {
            const newSet = new Set(prev);
            newSet.delete(boxId);
            return newSet;
          });
        }, 2000);
      }
      
      setSelectedItemIds(new Set());
      setItemSearchFilter('');
      setShowAddItemsToBox(null);
      
    } finally {
      setIsAddingMultipleItems(false);
    }
  };

  const getFilteredAvailableItems = (boxId: number) => {
    const availableItems = getItemsAvailableForBox(boxId);
    
    if (!itemSearchFilter) return availableItems;
    
    const normalizedSearch = normalizeText(itemSearchFilter);
    return availableItems.filter(item => 
      normalizeText(item.title || '').includes(normalizedSearch) ||
      normalizeText(item.first_name || '').includes(normalizedSearch) ||
      normalizeText(item.last_name || '').includes(normalizedSearch) ||
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

  const handleSelectAll = (boxId: number) => {
    const filteredItems = getFilteredAvailableItems(boxId);
    setSelectedItemIds(new Set(filteredItems.map(item => item.id)));
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
  };

  const handleCloseAddItemsModal = () => {
    setShowAddItemsToBox(null);
    setSelectedItemIds(new Set());
    setItemSearchFilter('');
  };

  const createBoxClick = useHapticClick(handleCreateBox, { hapticType: 'medium' });
  const showCreateFormClick = useHapticClick(() => setShowCreateForm(!showCreateForm), { hapticType: 'light' });
  const cancelCreateFormClick = useHapticClick(() => {
    setShowCreateForm(false);
    setSelectedDestinationForNewBox('');
  }, { hapticType: 'light' });
  const closeDeleteModalClick = useHapticClick(() => setConfirmDelete(null), { hapticType: 'light' });
  const closeRemoveItemModalClick = useHapticClick(() => setConfirmRemoveItem(null), { hapticType: 'light' });
  const confirmRemoveItemClick = useHapticClick(() => {
    if (confirmRemoveItem) {
      handleRemoveItem(confirmRemoveItem.boxId, confirmRemoveItem.itemId);
    }
  }, { hapticType: 'heavy' });
  const confirmDeleteClick = useHapticClick(() => {
    if (confirmDelete) {
      handleDeleteBox(confirmDelete.boxId);
    }
  }, { hapticType: 'heavy' });

  const handleToggleAddItems = (boxId: number) => {
    triggerHaptic(10); 
    setShowAddItemsToBox(showAddItemsToBox === boxId ? null : boxId);
  };

  const handleToggleExpansion = (boxId: number) => {
    triggerHaptic(15); 
    toggleBoxExpansion(boxId);
  };

  const handleShowDeleteConfirmation = (boxId: number, boxName: string) => {
    triggerHaptic(30); 
    setConfirmDelete({ boxId, boxName });
  };

  const handleAddItemWithHaptic = (boxId: number, itemId: number) => {
    triggerHaptic(20); 
    handleAddItem(boxId, itemId);
  };

  const handleRemoveItemWithHaptic = (boxId: number, itemId: number) => {
    triggerHaptic(30); 
    handleRemoveItem(boxId, itemId);
  };

  const handleCloseAddItemsPanel = () => {
    triggerHaptic(10); 
    handleCloseAddItemsModal();
  };

  const handleItemSelectionWithHaptic = (itemId: number) => {
    triggerHaptic(15); 
    handleItemSelection(itemId);
  };

  const handleSelectAllWithHaptic = (boxId: number) => {
    triggerHaptic(20); 
    handleSelectAll(boxId);
  };

  const handleClearSelectionWithHaptic = () => {
    triggerHaptic(20);
    handleClearSelection();
  };

  const handleAddMultipleItemsWithHaptic = (boxId: number) => {
    triggerHaptic(30); 
    handleAddMultipleItems(boxId);
  };

  if (isLoadingBoxes || isLoadingItems) {
    return (
      <div className="flex justify-center items-center p-8">
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
    <div>
      <div className="flex-shrink-0 mb-4 space-y-3">
        {!hideCreateButton && (
          <div className="flex justify-between items-center">
            {!hideTitle && (
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Gestión de Cajas
              </h2>
            )}
            <button
              onClick={showCreateFormClick}
              className="flex items-center gap-2 px-4 py-2 nm-btn-primary text-sm"
            >
              <Plus size={16} />
              Crear Caja Vacía
            </button>
          </div>
        )}

        {!hideCreateButton && showCreateForm && (
          <div className="p-4 nm-surface rounded-lg space-y-3">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">
              Crear nueva caja vacía
            </h3>
            <div className="flex gap-2">
              <select
                value={selectedDestinationForNewBox}
                onChange={(e) => setSelectedDestinationForNewBox(e.target.value)}
                className="flex-1 nm-select"
              >
                <option value="">Seleccionar destino...</option>
                {availableDestinations.map(dest => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name}
                  </option>
                ))}
              </select>
              <button
                onClick={createBoxClick}
                disabled={!selectedDestinationForNewBox}
                className="px-4 py-2 nm-btn-primary text-sm disabled:opacity-50"
              >
                Crear
              </button>
              <button
                onClick={cancelCreateFormClick}
                className="px-4 py-2 nm-btn-secondary text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pr-4 py-2 nm-input text-sm"
                style={{ paddingLeft: '3rem' }}
              />
            </div>
          </div>
          <div className="flex-1">
            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              className="w-full nm-select text-sm"
            >
              <option value="">Todos</option>
              {availableDestinations.map(dest => (
                <option key={dest.id} value={dest.name}>
                  {dest.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef}>
        {filteredBoxes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {boxes.length === 0 ? "No hay cajas creadas aún." : "No se encontraron cajas que coincidan con los filtros."}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBoxes.map(box => {
              const isRecentlyModified = recentlyModifiedBoxes.has(box.id);
              return (
                <div 
                  key={box.id} 
                  data-box-id={box.id} 
                  ref={(el) => {
                    if (el) {
                      boxRefs.current.set(box.id, el);
                    } else {
                      boxRefs.current.delete(box.id);
                    }
                  }}
                  className={`nm-surface rounded-lg p-4 transition-all duration-300 ${
                    isRecentlyModified ? 'ring-2 ring-blue-400 shadow-lg scale-[1.02]' : ''
                  }`}
                >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Package size={20} className="text-blue-500" />
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-gray-200">
                        {box.number ? `Caja #${box.number}` : `Caja ${box.id}`}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Destino: {box.destination_name} • {box.math_items.length} juegos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAddItems(box.id)}
                      className="p-2 nm-btn-secondary rounded-full"
                      title={showAddItemsToBox === box.id ? "Cancelar agregar juegos" : "Agregar juegos"}
                    >
                      <PlusCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleExpansion(box.id)}
                      className="p-2 nm-btn-secondary rounded-full"
                      title={expandedBoxId === box.id ? "Ocultar contenido" : "Ver contenido"}
                    >
                      <Package size={16} />
                    </button>
                    <button
                      onClick={() => handleShowDeleteConfirmation(box.id, box.number ? `Caja #${box.number}` : `Caja ${box.id}`)}
                      className="p-2 nm-btn-danger rounded-full"
                      title="Eliminar caja"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {expandedBoxId === box.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {box.math_items.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        Esta caja está vacía. Usa el botón + para agregar juegos.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {box.math_items.map(item => (
                          <div key={item.id} className="min-w-0">
                            <GameRowItem
                              id={item.assigned_trade_code}
                              title={item.title}
                              ownerName={`${item.first_name || ''} ${item.last_name || ''}`}
                              isSelected={false}
                              variant="box-item"
                              onRemoveItem={() => setConfirmRemoveItem({ boxId: box.id, itemId: item.id, itemTitle: item.title })}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showAddItemsToBox === box.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">
                        Agregar juegos a la caja ({selectedItemIds.size} seleccionados)
                      </h4>
                      <button
                        onClick={handleCloseAddItemsPanel}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    
                    <div className="mb-3">
                      <div className="relative">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar juegos..."
                          value={itemSearchFilter}
                          onChange={(e) => setItemSearchFilter(e.target.value)}
                          className="w-full pr-4 py-2 nm-input text-sm"
                          style={{ paddingLeft: '3rem' }}
                        />
                      </div>
                    </div>

                    {(() => {
                      const filteredItems = getFilteredAvailableItems(box.id);
                      
                      return filteredItems.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => handleAddMultipleItemsWithHaptic(box.id)}
                            disabled={selectedItemIds.size === 0 || isAddingMultipleItems}
                            className="px-3 py-1 text-xs nm-btn-primary disabled:opacity-50"
                          >
                            {isAddingMultipleItems ? 'Agregando...' : `Agregar ${selectedItemIds.size} juegos`}
                          </button>
                        </div>
                      );
                    })()}

                    <div className="max-h-60 overflow-y-auto">
                      {(() => {
                        const filteredItems = getFilteredAvailableItems(box.id);
                        if (filteredItems.length === 0) {
                          const totalItems = getItemsAvailableForBox(box.id).length;
                          return (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                              {totalItems === 0 
                                ? "No hay juegos disponibles para este destino."
                                : "No se encontraron juegos que coincidan con la búsqueda."
                              }
                            </p>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            {filteredItems.map(item => (
                              <div key={item.id} className="min-w-0">
                                <GameRowItem
                                  id={item.assigned_trade_code}
                                  title={item.title}
                                  ownerName={`${item.first_name || ''} ${item.last_name || ''}`}
                                  isSelected={selectedItemIds.has(item.id)}
                                  variant="add-to-box"
                                  showCheckbox={true}
                                  onRowClick={() => handleItemSelectionWithHaptic(item.id)}
                                  onAddItem={() => handleAddItemWithHaptic(box.id, item.id)}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
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
          customMessage={`¿Estás seguro de que querés eliminar ${confirmDelete.boxName}? Esta acción no se puede deshacer.`}
        />
      )}

      {confirmRemoveItem && (
        <ConfirmationModal
          isOpen={true}
          onClose={closeRemoveItemModalClick}
          onConfirm={confirmRemoveItemClick}
          itemsToDeliver={[]}
          actionType="all"
          modalTitle={`${confirmRemoveItem.itemTitle}`}
          mode="delete-box"
          customMessage={`¿Estás seguro de que querés sacar este item de la caja?`}
        />
      )}
    </div>
  );
}

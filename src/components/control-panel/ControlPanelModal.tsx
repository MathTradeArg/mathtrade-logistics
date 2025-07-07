"use client";
import AdminSection from '@/components/control-panel/AdminSection';
import { GameDetailsDisplay } from '@/components/control-panel/GameDetailsDisplay';
import { LoadingSpinner } from '@/components/common/ui';
import { useControlPanel } from '@/contexts/ControlPanelContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useAuth } from '@/hooks/useAuth';
import { GameStatusCode } from '@/types';
import { X, MagnifyingGlass } from 'phosphor-react';
import React, { useEffect, useState, FormEvent, useRef } from 'react';
import { triggerHaptic } from '@/utils/haptics';
import '@/styles/glassmorphism.css';
import { useHapticClick } from '@/hooks/useHapticClick';

interface ControlPanelModalProps {
  isOpen: boolean;
  onClose: (actionWasSuccessful?: boolean) => void;
  isAdmin: boolean;
}

const ControlPanelModal: React.FC<ControlPanelModalProps> = ({ isOpen, onClose, isAdmin }) => {
  const {
    gameDetail,
    isLoading: isSearching,
    error: searchError,
    updateGameStatus,
    gameActionLoading,
    gameActionError,
    clearGameDetail,
    openPanel,
  } = useControlPanel();
  const { eventPhase, updateEventPhase } = useEventPhase();
  const { setSuccess, setError } = useActionStatus();

  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const handleModalClose = useHapticClick(() => {
    onClose(hasAnyActionSucceededThisSession);
  });
  
  const handleClearGameDetail = useHapticClick(clearGameDetail);
  
  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    triggerHaptic(20); 
    if (searchValue.trim()) {
      await openPanel(searchValue.trim());
      setSearchValue('');
      searchInputRef.current?.blur();
    }
  };

  const [isUpdatingPhase, setIsUpdatingPhase] = useState(false);
  const [hasAnyActionSucceededThisSession, setHasAnyActionSucceededThisSession] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasAnyActionSucceededThisSession(false);
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleGameAction = async (gameId: number, newStatus: GameStatusCode) => {
    try {
      await updateGameStatus(gameId, newStatus);
      setHasAnyActionSucceededThisSession(true);
    } catch (error) {
      console.error("Error al actualizar el estado del juego:", error);
    }
  };

  const handlePhaseChange = async (newPhase: number) => {
    setIsUpdatingPhase(true);
    const result = await updateEventPhase(newPhase);
    if (result.success) {
      setSuccess(result.message);
      setHasAnyActionSucceededThisSession(true);
    } else {
      setError(result.message);
    }
    setIsUpdatingPhase(false);
  };

  const actionsDisabledByPhase = (eventPhase ?? 0) === 0;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-center p-4 bg-white/10 dark:bg-black/20 backdrop-blur-xl glass-bg">
      <div className="nm-surface dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-secondary-blue dark:text-sky-400">Panel de Control</h2>
            <button onClick={handleModalClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150 ease-in-out active:scale-90">
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full">
            <div className="relative w-full nm-input-with-icon">
              <div className="search-icon-container">
                <MagnifyingGlass size={20} className="text-gray-500" />
              </div>
              <input
                ref={searchInputRef}
                type="number"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onFocus={() => triggerHaptic()}
                placeholder="Buscar juego por ID..."
                className="w-full bg-transparent focus:outline-none focus:ring-0 focus:border-transparent active:outline-none active:ring-0 active:border-transparent text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-600 py-2 rounded-none pr-4"
              />
            </div>
            <button type="submit" className="hidden">Buscar</button>
          </form>
        </div>

        <div className="overflow-y-auto flex-grow">
          {isSearching && <div className="flex justify-center items-center p-4"><LoadingSpinner message="Buscando juego..." /></div>}
          {searchError && <p className="text-sm text-red-500 dark:text-red-400 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">{searchError}</p>}

          {gameDetail && !isSearching && (
            <>
              <button
                onClick={handleClearGameDetail}
                className="mb-4 flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium shadow transition-all"
                aria-label="Volver al panel principal"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                Volver
              </button>
              <GameDetailsDisplay
                gameDetail={gameDetail}
                isAdmin={isAdmin}
                isPerformingGameAction={gameActionLoading}
                actionsDisabledByPhase={actionsDisabledByPhase}
                gameActionSuccess={null}
                gameActionError={gameActionError}
                onGameAction={handleGameAction}
              />
            </>
          )}
        </div>

        {isAdmin && (
          <div className="border-t border-gray-200 dark:border-gray-700 my-4 py-4">
            <AdminSection
              isUpdatingPhase={isUpdatingPhase}
              eventPhase={eventPhase ?? 0}
              onPhaseChange={handlePhaseChange}
              hideTVViews={!!gameDetail}
              hideAdminActions={!!gameDetail}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ControlPanelModal;

"use client";
import { GameDetailsDisplay } from '@/components/control-panel/GameDetailsDisplay';
import { LoadingSpinner } from '@/components/common/ui';
import { useControlPanel } from '@/contexts/ControlPanelContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { GameStatusCode } from '@/types';
import { X, MagnifyingGlass } from 'phosphor-react';
import React, { useEffect, useState, FormEvent, useRef } from 'react';
import { triggerHaptic } from '@/utils/haptics';
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
  const { eventPhase } = useEventPhase();

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

  const actionsDisabledByPhase = (eventPhase ?? 0) === 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(213,220,226,0.7)] p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 text-gray-900">
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Detalle del juego</h2>
            <button onClick={handleModalClose} className="rounded-full p-1 hover:bg-gray-100">
              <X size={24} className="text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex w-full items-center">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <MagnifyingGlass size={20} className="text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="number"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onFocus={() => triggerHaptic()}
                placeholder="Buscar juego por ID..."
                className="min-h-14 w-full rounded-lg border border-gray-200 bg-white py-2 pr-4 pl-10 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none"
              />
            </div>
            <button type="submit" className="hidden">Buscar</button>
          </form>
        </div>

        <div className="overflow-y-auto flex-grow">
          {isSearching && <div className="flex justify-center items-center p-4"><LoadingSpinner message="Buscando juego..." /></div>}
          {searchError && <p className="text-sm text-red-500 dark:text-red-400 mb-3 p-2 bg-danger/10 dark:bg-red-900/20 rounded-md">{searchError}</p>}

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
      </div>
    </div>
  );
};

export default ControlPanelModal;

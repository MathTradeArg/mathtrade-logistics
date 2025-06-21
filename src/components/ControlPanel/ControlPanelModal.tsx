"use client";
import { AdminSection } from '@/components/ControlPanel/AdminSection';
import { GameDetailsDisplay } from '@/components/ControlPanel/GameDetailsDisplay';
import { LoadingSpinner } from '@/components/ui';
import { useControlPanel } from '@/contexts/ControlPanelContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { GameStatusCode } from '@/types';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  } = useControlPanel();
  const { eventPhase, updateEventPhase } = useEventPhase();
  const { isHighContrast, toggleHighContrast } = useAuth();

  const [isUpdatingPhase, setIsUpdatingPhase] = useState(false);
  const [phaseUpdateError, setPhaseUpdateError] = useState<string | null>(null);
  const [phaseUpdateSuccess, setPhaseUpdateSuccess] = useState<string | null>(null);
  const [hasAnyActionSucceededThisSession, setHasAnyActionSucceededThisSession] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasAnyActionSucceededThisSession(false);
      setPhaseUpdateError(null);
      setPhaseUpdateSuccess(null);
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleGameAction = async (gameId: number, newStatus: GameStatusCode) => {
    await updateGameStatus(gameId, newStatus);
    setHasAnyActionSucceededThisSession(true);
  };

  const handlePhaseChange = async (newPhase: number) => {
    setIsUpdatingPhase(true);
    const result = await updateEventPhase(newPhase);
    if (result.success) {
      setPhaseUpdateSuccess(result.message);
      setHasAnyActionSucceededThisSession(true);
    } else {
      setPhaseUpdateError(result.message);
    }
    setIsUpdatingPhase(false);
  };

  const actionsDisabledByPhase = eventPhase === 0;

  const handleModalClose = () => {
    onClose(hasAnyActionSucceededThisSession);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-blue dark:text-sky-400">Panel de Control</h2>
          <button onClick={handleModalClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150 ease-in-out active:scale-90">
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow">
          {isSearching && <div className="flex justify-center items-center p-4"><LoadingSpinner message="Buscando juego..." /></div>}
          {searchError && <p className="text-sm text-red-500 dark:text-red-400 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">{searchError}</p>}

          {gameDetail && !isSearching && (
            <GameDetailsDisplay
              gameDetail={gameDetail}
              isAdmin={isAdmin}
              isPerformingGameAction={gameActionLoading}
              actionsDisabledByPhase={actionsDisabledByPhase}
              gameActionSuccess={null}
              gameActionError={gameActionError}
              onGameAction={handleGameAction}
            />
          )}
        </div>

        {/*<PreferenceToggle isHighContrast={isHighContrast} onToggle={toggleHighContrast} />*/}

        <div className="border-t border-gray-200 dark:border-gray-700 my-4 py-4">
          {isAdmin && (
            <AdminSection
              isUpdatingPhase={isUpdatingPhase}
              eventPhase={eventPhase}
              phaseUpdateSuccess={phaseUpdateSuccess}
              phaseUpdateError={phaseUpdateError}
              onPhaseChange={handlePhaseChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanelModal;

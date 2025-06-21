"use client";

import { useApi } from '@/hooks/useApi';
import { GameDetail, GameStatusCode, User } from '@/types';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ControlPanelContextType {
  isPanelOpen: boolean;
  gameDetail: GameDetail | null;
  isLoading: boolean;
  error: string | null;
  gameActionLoading: boolean;
  gameActionError: string | null;
  openPanel: (gameId?: string) => void;
  closePanel: () => void;
  updateGameStatus: (gameId: number, newStatus: GameStatusCode) => Promise<void>;
}

const ControlPanelContext = createContext<ControlPanelContextType | undefined>(undefined);

export const ControlPanelProvider = ({ children }: { children: ReactNode }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { data: gameDetail, isLoading, error, execute: searchGame, setData: setGameDetail, clearError } = useApi<GameDetail>('logistics/game/');
  const { isLoading: gameActionLoading, error: gameActionError, execute: executeGameAction, clearError: clearGameActionError } = useApi('logistics/games/bulk-update-status/', { method: 'PATCH' });
  const { userId, userName } = useAuth();

  const openPanel = useCallback(async (gameId?: string) => {
    clearError();
    clearGameActionError();
    setGameDetail(null);
    setIsPanelOpen(true);
    if (gameId) {
      await searchGame(undefined, `${gameId}/detail/`).catch(() => {});
    }
  }, [searchGame, setGameDetail, clearError, clearGameActionError]);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const updateGameStatus = useCallback(async (gameId: number, newStatus: GameStatusCode) => {
    await executeGameAction({ assigned_trade_codes: [gameId], status: newStatus, change_by_id: userId });
    setGameDetail(prev => {
      if (!prev) return null;
      const updatedDetails = { ...prev, status: newStatus };
      if (newStatus === 6 && userId && userName) {
        const [firstName, ...lastNameParts] = userName.split(' ');
        updatedDetails.change_by = { id: parseInt(userId), first_name: firstName, last_name: lastNameParts.join(' ') } as User;
      }
      return updatedDetails;
    });
  }, [executeGameAction, userId, userName, setGameDetail]);

  const value = { isPanelOpen, gameDetail, isLoading, error, openPanel, closePanel, updateGameStatus, gameActionLoading, gameActionError };

  return <ControlPanelContext.Provider value={value}>{children}</ControlPanelContext.Provider>;
};

export const useControlPanel = (): ControlPanelContextType => {
  const context = useContext(ControlPanelContext);
  if (context === undefined) {
    throw new Error('useControlPanel must be used within a ControlPanelProvider');
  }
  return context;
};
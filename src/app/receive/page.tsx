"use client";

import { LoadingSpinner } from '@/components/common/ui';
import QrScanner from '@/components/qr/QrScanner';
import { StaffBanner } from '@/components/staff';
import MemberNameSearch from '@/components/staff/MemberNameSearch';
import { GameList } from '@/components/trades';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { ReceiveTrade, Trade, TradeResponse, User } from '@/types';
import { usePathname, useSearchParams } from 'next/navigation';
import { X } from 'phosphor-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

export default function ReceivePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando página..." /></div>}>
      <ReceivePageContent />
    </Suspense>
  );
}

function ReceivePageContent() {
  const { isAuthenticated, userId } = useAuth();
  const { setSuccess, setError: setActionError } = useActionStatus();
  const [qrData, setQrData] = useState<string | null>(null);
  const [games, setGames] = useState<Trade[] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // scanError replaces the screen and resets to the scanner after 3 s;
  // updateError is a banner over the list that stays until retried.
  const [scanError, setScanError] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const lastUpdate = useRef<{ ids: number[]; by: number } | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initialQrProcessed, setInitialQrProcessed] = useState(false);
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { execute: fetchGames } = useApi<TradeResponse<ReceiveTrade>>('logistics/user/');
  const { execute: bulkUpdate } = useApi<unknown>('logistics/games/bulk-update-status/', { method: 'PATCH' });
  const { execute: updateUserStatus } = useApi<any>('logistics/users/update-status/', { method: 'PATCH' });
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [userComment, setUserComment] = useState<string>('');

  const handleScan = useCallback(async (data: string) => {
    if (data && !isLoading) {
      setIsLoading(true);
      setScanError('');
      setUpdateError('');
      lastUpdate.current = null;
      setQrData(data);
      try {
        const tradesData = await fetchGames(undefined, `${data}/games/receive/`);
        if (!tradesData) throw new Error('Ups, algo falló.');
        const games = tradesData.games;
        setGames(games);
        setUser(tradesData.user);

        if (games && games.length > 0) {
          try {
            await updateUserStatus({
              user_id: tradesData.user.id,
              status: 'present'
            });
          } catch (statusErr) {
            console.error('Error al actualizar status del usuario:', statusErr);
          }
        }

        if (tradesData.user && tradesData.user.comment_on_user) {
          setUserComment(tradesData.user.comment_on_user);
          setShowCommentModal(true);
        }
      } catch (err) {
        if (err instanceof Error) {
          setScanError(err.message);
        } else {
          setScanError('Ups, algo falló.');
        }
        setTimeout(() => {
          setQrData(null);
          setGames(null);
          setScanError('');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoading, fetchGames, updateUserStatus]);

  useEffect(() => {
    if (initialQrProcessed || isLoading || games) return;

    const qrFromUrl = searchParams.get('qr');
    if (qrFromUrl) {
      handleScan(qrFromUrl);
      setInitialQrProcessed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, games, initialQrProcessed, handleScan, pathname]);

  const handleUpdateItems = useCallback(async (itemIds: number[], deliveredByUserId: number) => {
    setUpdateError('');
    if (!qrData || !games || !deliveredByUserId || games.length === 0) {
      setUpdateError('Faltan datos para la actualización.');
      return;
    }

    const itemsToUpdate = games.filter(game => itemIds.includes(game.result.assigned_trade_code) && game.result.status_display != "Delivered");
    const idsToUpdate = itemsToUpdate.map(game => game.result.assigned_trade_code);
    if (idsToUpdate.length === 0) return;

    lastUpdate.current = { ids: itemIds, by: deliveredByUserId };
    setIsUpdating(true);
    try {
      await bulkUpdate({
        status: 5,
        assigned_trade_codes: itemIds,
        change_by_id: deliveredByUserId
      });

      const updatedItems = itemsToUpdate.length;
      setSuccess(`${updatedItems} item${updatedItems === 1 ? '' : 's'} marcado${updatedItems === 1 ? '' : 's'} como recibido${updatedItems === 1 ? '' : 's'}`);

      setGames(prevGames => {
        if (!prevGames) return null;
        return prevGames.map(game =>
          itemIds.includes(game.result.assigned_trade_code)
            ? { ...game, result: { ...game.result, status_display: "In Event" } }
            : game
        );
      });
      lastUpdate.current = null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falló la actualización.';
      setUpdateError(errorMessage);
      setActionError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  }, [qrData, games, bulkUpdate, setSuccess, setActionError]);

  const retryUpdate = useCallback(() => {
    if (lastUpdate.current) handleUpdateItems(lastUpdate.current.ids, lastUpdate.current.by);
  }, [handleUpdateItems]);

  const resetToScanner = useCallback(() => {
    setQrData(null);
    setGames(null);
    setScanError('');
    setUpdateError('');
    lastUpdate.current = null;
  }, []);

  const isReceivingEnabled = eventPhase !== 0;

  if (isAuthenticated === null || (isAuthenticated === false && typeof window !== 'undefined') || isLoadingEventPhase) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page">
        <LoadingSpinner message="Validando..." />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-4 text-gray-900">
      <section className="w-full">
        {isLoading && <LoadingSpinner message="Buscando información..." />}
        {scanError && <p className="my-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-center text-danger">{scanError}</p>}

        {!isLoading && !scanError && isAuthenticated && (
          <>
            {!qrData ? (
              <>
                <QrScanner
                  onScan={handleScan}
                  disabled={!isReceivingEnabled}
                  disabledMessage="La recepción de juegos no está habilitada en la fase actual del evento." />
                <MemberNameSearch onSelect={(member) => handleScan(member.uuid)} disabled={!isReceivingEnabled} />
              </>
            ) : games && (
              <>
                {updateError && (
                  <StaffBanner onRetry={lastUpdate.current ? retryUpdate : undefined} retrying={isUpdating}>
                    {updateError}
                  </StaffBanner>
                )}
                <GameList
                  trades={games}
                  user={user}
                  onUpdateItems={handleUpdateItems}
                  disabled={!isReceivingEnabled}
                  onFinish={resetToScanner}
                  mode="receive"
                  deliveredByUserId={userId ? parseInt(userId, 10) : null}
                />
              </>
            )}
          </>
        )}
      </section>

      {showCommentModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
          <div className="staff-panel w-full max-w-md p-6 text-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-heading font-semibold">
                <span className="text-amber-500">⚠️</span>
                Advertencia
              </h3>
              <button
                onClick={() => setShowCommentModal(false)}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-body text-amber-900">{userComment}</p>
            </div>
            <button
              onClick={() => setShowCommentModal(false)}
              className="staff-btn staff-btn-primary"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

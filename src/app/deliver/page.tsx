"use client";

import { LoadingSpinner } from '@/components/common/ui';
import QrScanner from '@/components/qr/QrScanner';
import { StaffBanner, StaffEmpty } from '@/components/staff';
import MemberNameSearch from '@/components/staff/MemberNameSearch';
import GameList from '@/components/trades/GameList';
import { useEventPhase } from "@/contexts/EventPhaseContext";
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { DeliverTrade, Trade, TradeResponse, User } from "@/types";
import { useSearchParams } from 'next/navigation';
import { X } from 'phosphor-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

type ApiRejection = Error & { status?: number; body?: { code?: string; assigned_trade_codes?: unknown } | null };

/** Banner text for a failed delivery PATCH: 409 shows the backend detail, 400 a generic message. */
function deliveryErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Falló la actualización.';
  const { status, body } = err as ApiRejection;
  if (status === 409) {
    if (body?.code === 'wrong_receiver' && Array.isArray(body.assigned_trade_codes) && body.assigned_trade_codes.length > 0) {
      const n = body.assigned_trade_codes.length;
      return `${err.message} ${n === 1 ? '1 juego no es de este usuario.' : `${n} juegos no son de este usuario.`}`;
    }
    return err.message;
  }
  if (status === 400) return 'No se pudo validar la entrega. Escaneá el QR de nuevo e intentá otra vez.';
  return err.message;
}

export default function DeliverPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando página..." /></div>}>
      <DeliverPageContent />
    </Suspense>
  );
}

function DeliverPageContent() {
  const { isAuthenticated, userId, isLoading: authIsLoading } = useAuth();
  const [qrData, setQrData] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<Trade[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // scanError replaces the screen and resets to the scanner after 3 s;
  // updateError is a banner over the list that stays until retried.
  const [scanError, setScanError] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const lastUpdate = useRef<{ ids: number[]; by: number } | null>(null);
  const searchParams = useSearchParams();
  const [initialQrProcessed, setInitialQrProcessed] = useState(false);
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { execute: fetchGames } = useApi<TradeResponse<DeliverTrade>>('logistics/user/');
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
      setGames(null);
      try {
        const tradesData = await fetchGames(undefined, `${data}/games/deliver/`);
        if (!tradesData) throw new Error('Ups, algo falló al obtener los juegos a retirar.');
        const gamesData = tradesData.games
        const userData = tradesData.user
        setGames(gamesData);
        setUser(userData);

        if (gamesData && gamesData.length > 0) {
          try {
            await updateUserStatus({
              user_id: userData.id,
              status: 'receiving'
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
          setScanError('Ups, algo falló al obtener los juegos a retirar.');
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
  }, [searchParams, isLoading, games, initialQrProcessed, handleScan]);

  const handleDeliverySuccess = useCallback((deliveredTradeCodes: number[]) => {
    setGames(prevGames => {
      if (!prevGames) return null;
      return prevGames.map(game =>
        deliveredTradeCodes.includes(game.result.assigned_trade_code)
          ? { ...game, result: { ...game.result, status_display: "Delivered" } }
          : game
      );
    });
  }, []);

  const handleUpdateItems = useCallback(async (itemIds: number[], deliveredByUserId: number) => {
    setUpdateError('');
    if (!qrData || !games || !deliveredByUserId || games.length === 0) {
      setUpdateError('Faltan datos para la actualización.');
      return;
    }

    const itemsToUpdate = games.filter(game => itemIds.includes(game.result.assigned_trade_code));
    const idsToUpdate = itemsToUpdate.map(game => game.result.assigned_trade_code);
    if (idsToUpdate.length === 0) return;

    lastUpdate.current = { ids: itemIds, by: deliveredByUserId };
    setIsUpdating(true);
    try {
      await bulkUpdate({
        status: 6,
        assigned_trade_codes: itemIds,
        user_uuid: qrData,
      });

      const remainingUndelivered = games.filter(
        (game) =>
          !itemIds.includes(game.result.assigned_trade_code) &&
          game.result.status_display !== 'Delivered',
      );

      if (remainingUndelivered.length === 0) {
        updateUserStatus({
          user_id: user?.id,
          status: 'completed'
        }).catch(err => {
          console.error('Failed to update user status to completed:', err);
        });
      }

      handleDeliverySuccess(itemIds);
      lastUpdate.current = null;
    } catch (err) {
      setUpdateError(deliveryErrorMessage(err));
    } finally {
      setIsUpdating(false);
    }
  }, [qrData, games, bulkUpdate, handleDeliverySuccess, updateUserStatus, user?.id]);

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

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-screen items-center justify-center bg-page"><LoadingSpinner message="Validando sesión..." /></div>;
  }


  const isDeliveringEnabled = eventPhase === 2;

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
                  disabled={!isDeliveringEnabled}
                  disabledMessage="La entrega de juegos está deshabilitada en la fase actual del evento."
                />
                <MemberNameSearch onSelect={(member) => handleScan(member.uuid)} disabled={!isDeliveringEnabled} />
              </>
            ) : games && games.length === 0 ? (
              <>
                <StaffEmpty>No hay juegos para retirar</StaffEmpty>
                <button type="button" className="staff-btn staff-btn-outline mt-4" onClick={resetToScanner}>
                  Escanear otro
                </button>
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
                  onFinish={resetToScanner}
                  deliveredByUserId={userId ? parseInt(userId, 10) : null}
                  onUpdateItems={handleUpdateItems}
                  mode="deliver"
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
                <span className="text-warning">⚠️</span>
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
            <div className="mb-6 rounded-lg border border-warning/40 bg-warning/20 p-3">
              <p className="text-body text-gray-900">{userComment}</p>
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

"use client";

import { LoadingSpinner } from '@/components/common/ui';
import QrScanner from '@/components/qr/QrScanner';
import MemberNameSearch from '@/components/staff/MemberNameSearch';
import GameList from '@/components/trades/GameList';
import { useEventPhase } from "@/contexts/EventPhaseContext";
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { DeliverTrade, Trade, TradeResponse, User } from "@/types";
import { useSearchParams } from 'next/navigation';
import { X } from 'phosphor-react';
import { Suspense, useCallback, useEffect, useState } from 'react';

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
  const [error, setError] = useState<string>('');
  const searchParams = useSearchParams();
  const [initialQrProcessed, setInitialQrProcessed] = useState(false);
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { execute: updateUserStatus } = useApi<any>('logistics/users/update-status/', { method: 'PATCH' });
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [userComment, setUserComment] = useState<string>('');

  const handleScan = useCallback(async (data: string) => {
    const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
    if (data && !isLoading) {
      setIsLoading(true);
      setError('');
      setQrData(data);
      setGames(null);
      try {
        const response = await fetch(`${MT_API_HOST}logistics/user/${data}/games/deliver/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${localStorage.getItem('authToken')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error ${response.status}` }));
          throw new Error(errorData.message || `Error ${response.status} al buscar datos del usuario.`);
        }
        const tradesData: TradeResponse<DeliverTrade> = await response.json();
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
          setError(err.message);
        } else {
          setError('Ups, algo falló al obtener los juegos a retirar.');
        }
        setTimeout(() => {
          setQrData(null);
          setGames(null);
          setError('');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoading, updateUserStatus]);

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
    if (!qrData || !games || !deliveredByUserId || games.length === 0) {
      setError('Faltan datos para la actualización.');
      return;
    }

    const itemsToUpdate = games.filter(game => itemIds.includes(game.result.assigned_trade_code));
    const idsToUpdate = itemsToUpdate.map(game => game.result.assigned_trade_code);
    if (idsToUpdate.length === 0) return;

    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(`${MT_API_HOST}logistics/games/bulk-update-status/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          status: 6,
          assigned_trade_codes: itemIds,
          change_by_id: deliveredByUserId
        }),
      });

      if (!response.ok) throw new Error('Error al actualizar el estado de los juegos.');

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló la actualización.');
    }
  }, [qrData, games, handleDeliverySuccess, updateUserStatus, user?.id]);

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-screen items-center justify-center bg-page"><LoadingSpinner message="Validando sesión..." /></div>;
  }


  const isDeliveringEnabled = eventPhase === 2;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-4 text-gray-900">
      <section className="w-full">
        {isLoading && <LoadingSpinner message="Buscando información..." />}
        {error && <p className="my-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-center text-danger">{error}</p>}

        {!isLoading && !error && isAuthenticated && (
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
            ) : games && games.length > 0 && (
              <GameList
                trades={games}
                user={user}
                onFinish={() => { setQrData(null); setGames(null); setError(''); }}
                deliveredByUserId={userId ? parseInt(userId, 10) : null}
                onUpdateItems={handleUpdateItems}
                mode="deliver"
              />
            )}
          </>
        )}
      </section>

      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(213,220,226,0.7)] p-4 backdrop-blur-sm">
          <div className="staff-panel w-full max-w-md p-6 text-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
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
              <p className="text-sm text-amber-900">{userComment}</p>
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

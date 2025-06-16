"use client";

import type { Trade } from '@/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import AppHeader from '../../components/AppHeader';
import ControlPanelModal from '../../components/ControlPanelModal';
import GameList from '../../components/GameList';
import QrScanner from '../../components/QrScanner';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

export default function ReceiveGamesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando página..." /></div>}>
      <ReceiveGamesPageContent />
    </Suspense>
  );
}

function ReceiveGamesPageContent() {
  const { isAuthenticated, userName, userId, isAdmin, logout, isLoading: authIsLoading, isHighContrast, toggleHighContrast } = useAuth();
  const [qrData, setQrData] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initialQrProcessed, setInitialQrProcessed] = useState(false);

  const handleScan = useCallback(async (data: string) => {
    const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
    if (data && !isLoading) {
      setIsLoading(true);
      setError('');
      setQrData(data);
      try {

        const response = await fetch(`${MT_API_HOST}logistics/user/${data}/games/receive/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${localStorage.getItem('authToken')}`
          }
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error ${response.status}` }));
          throw new Error(errorData.message || `Error ${response.status} al buscar user.`);
        }
        const tradesData: Trade[] = await response.json();
        setTrades(tradesData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ups, algo falló.');
        }
        setTimeout(() => {
          setQrData(null);
          setTrades(null);
          setError('');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  useEffect(() => {
    if (initialQrProcessed || isLoading || trades) return;

    const qrFromUrl = searchParams.get('qr');
    if (qrFromUrl) {
      handleScan(qrFromUrl);
      setInitialQrProcessed(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, trades, initialQrProcessed, handleScan]);

  const handleUpdateItems = useCallback(async (itemIds: number[], deliveredByUserId: number) => {
    if (!qrData || !trades || !deliveredByUserId || trades.length === 0) {
      setError('Faltan datos para la actualización.');
      return;
    }

    const itemsToUpdate = trades.filter(trade => itemIds.includes(trade.result.assigned_trade_code) && trade.result.status_display != "Delivered");
    const idsToUpdate = itemsToUpdate.map(trade => trade.result.assigned_trade_code);
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
          status: 5,
          assigned_trade_codes: itemIds,
          change_by_id: deliveredByUserId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al actualizar.' }));
        throw new Error(errorData.message || 'Error al actualizar.');
      }

      setTrades(prevTrades => {
        if (!prevTrades) return null;
        return prevTrades.map(trade =>
          itemIds.includes(trade.result.assigned_trade_code)
            ? { ...trade, result: { ...trade.result, status_display: "In Event" } }
            : trade
        );
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló la actualización.');
    }
  }, [qrData, trades]);

  const handleModalClose = (actionWasSuccessful?: boolean) => {
    setIsPanelOpen(false);
    if (actionWasSuccessful) {
      if (qrData) {
        window.location.href = `${pathname}?qr=${qrData}`;
      } else {
        window.location.reload();
      }
    }
  };

  if (isAuthenticated === null || (isAuthenticated === false && typeof window !== 'undefined')) {
    return (
      <div className="flex justify-center items-center min-h-dvh bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner message="Validando..." />
      </div>
    );
  }

  if (authIsLoading) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Validando sesión..." /></div>;
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 flex flex-col items-center min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {isAuthenticated && (
        <AppHeader
          userName={userName}
          isAdmin={isAdmin}
          onLogoutClick={logout}
          onPanelClick={() => setIsPanelOpen(true)}
          showPanelButton={true}
          showBackButton={true}
          onBackClick={() => router.push('/')}
        />
      )}
      <div className="w-full max-w-5xl text-center mt-2">
        <div className="my-6 sm:my-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-700 dark:text-gray-200">Recibir Juegos</h1>
          <hr className="w-24 sm:w-32 h-1 mx-auto my-2 border-0 rounded bg-secondary-blue dark:bg-sky-500" />
        </div>
      </div>
      <section className="w-full max-w-xl p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
        {isLoading && <LoadingSpinner message="Buscando juegos..." />}
        {error && <p className="text-base sm:text-lg text-red-600 dark:text-red-400 my-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg text-center">{error}</p>}

        {!isLoading && !error && isAuthenticated && (
          <>
            {!qrData ? (
              <QrScanner onScan={handleScan} />
            ) : trades && (
              <GameList
                trades={trades}
                onUpdateItems={handleUpdateItems}
                onFinish={() => { setQrData(null); setTrades(null); setError(''); }}
                deliveredByUserId={userId ? parseInt(userId, 10) : null}
              />
            )}
          </>
        )}
      </section>
      {isPanelOpen && isAdmin && (
        <ControlPanelModal
          isOpen={isPanelOpen}
          onClose={handleModalClose}
          isAdmin={isAdmin}
          loggedInUserId={userId ? parseInt(userId, 10) : null}
          loggedInUserName={userName}
        />
      )}
    </main>
  );
}
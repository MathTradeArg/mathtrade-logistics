"use client";

import { useEventPhase } from "@/contexts/EventPhaseContext";
import type { Trade } from "@/types";
import { ArrowRightCircle } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import GamesToRetrieveList from '@/components/GamesToRetrieveList'; 
import { LoadingSpinner } from '@/components/ui'; 
import QrScanner from '@/components/QrScanner'; 
import { useAuth } from '@/hooks/useAuth';

export default function DeliverToUserPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando página..." /></div>}>
      <DeliverToUserPageContent />
    </Suspense>
  );
}

function DeliverToUserPageContent() {
  const { isAuthenticated, userId, isLoading: authIsLoading } = useAuth();
  const [qrData, setQrData] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initialQrProcessed, setInitialQrProcessed] = useState(false);
  const { eventPhase, isLoadingEventPhase, eventPhaseDisplay } = useEventPhase();

  const handleScan = useCallback(async (data: string) => {
    const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
    if (data && !isLoading) {
      setIsLoading(true);
      setError('');
      setQrData(data);
      setTrades(null);
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
        const tradesData: Trade[] = await response.json();
        setTrades(tradesData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ups, algo falló al obtener los juegos a retirar.');
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

  const handleDeliverySuccess = useCallback((deliveredTradeCodes: number[]) => {
    setTrades(prevTrades => {
      if (!prevTrades) return null;
      return prevTrades.map(trade =>
        deliveredTradeCodes.includes(trade.result.assigned_trade_code)
          ? { ...trade, result: { ...trade.result, status_display: "Delivered" } }
          : trade
      );
    });
  }, []);

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Validando sesión..." /></div>;
  }


  const isDeliveringEnabled = eventPhase === 2;

  return (
    <main className="flex flex-col items-center min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {isAuthenticated && (
        <AppHeader
          pageTitle="Entrega"
          pageIcon={ArrowRightCircle as any}
          showBackButton={true}
        />
      )}
      <div className="w-full max-w-3xl mx-auto text-center px-4">
      </div>

      <section className="w-full max-w-xl p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
        {isLoading && <LoadingSpinner message="Buscando información..." />}
        {error && <p className="text-base sm:text-lg text-red-600 dark:text-red-400 my-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg text-center">{error}</p>}

        {!isLoading && !error && isAuthenticated && (
          <>
            {!qrData ? (
              <QrScanner
                onScan={handleScan} 
                disabled={!isDeliveringEnabled} 
                disabledMessage="La entrega de juegos está deshabilitada en la fase actual del evento."
              />
            ) : trades && (
              <GamesToRetrieveList
                trades={trades}
                onFinish={() => { setQrData(null); setTrades(null); setError(''); }}
                volunteerId={userId ? parseInt(userId, 10) : null}
                onDeliverySuccess={handleDeliverySuccess}
              />
            )}
          </>
        )}
      </section>
    </main>
  );
}

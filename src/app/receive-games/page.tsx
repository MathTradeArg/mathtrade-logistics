"use client";

import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import AppHeader from '../../components/AppHeader';
import ControlPanelModal from '../../components/ControlPanelModal';
import GameList from '../../components/GameList';
import QrScanner from '../../components/QrScanner';
import { useAuth } from '../../hooks/useAuth';

export default function ReceiveGamesPage() {
  const { isAuthenticated, userName, userId, userRole, logout, isLoading: authIsLoading } = useAuth();

  const [qrData, setQrData] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const router = useRouter();

  const handleScan = useCallback(async (data: string) => {
    if (data && !isLoading) {
      setIsLoading(true);
      setError('');
      setQrData(data);
      try {
        const response = await fetch(`/api/user/${data}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error ${response.status}` }));
          throw new Error(errorData.message || `Error ${response.status} al buscar user.`);
        }
        const userData: User = await response.json();
        setUser(userData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ups, algo falló.');
        }
        setTimeout(() => {
          setQrData(null);
          setUser(null);
          setError('');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  const handleUpdateItems = useCallback(async (itemIds: number[], deliveredByUserId: number) => {
    if (!qrData || !user || !deliveredByUserId || itemIds.length === 0) {
      setError('Faltan datos para la actualización.');
      return;
    }

    const itemsToUpdate = user.items.filter(item => itemIds.includes(item.id) && !item.delivered);
    const idsToUpdate = itemsToUpdate.map(item => item.id);
    if (idsToUpdate.length === 0) return;

    try {
      const response = await fetch('/api/games/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'delivered',
          itemIds: itemIds,
          deliveredByUserId: deliveredByUserId,
          userRole: userRole
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al actualizar.' }));
        throw new Error(errorData.message || 'Error al actualizar.');
      }

      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          items: prevUser.items.map(item =>
            itemIds.includes(item.id) ? { ...item, delivered: true } : item
          ),
        };
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló la actualización.');
    }
  }, [qrData, user]);

  if (isAuthenticated === null || (isAuthenticated === false && typeof window !== 'undefined')) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"><p className="text-lg">Validando...</p></div>;
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 flex flex-col items-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {isAuthenticated && (
        <AppHeader
          userName={userName}
          userRole={userRole}
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
        {isLoading && <p className="text-lg text-secondary-blue dark:text-sky-400 my-4 text-center animate-pulse">Cargando juego...</p>}
        {error && <p className="text-base sm:text-lg text-red-600 dark:text-red-400 my-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg text-center">{error}</p>}

        {!isLoading && !error && isAuthenticated && (
          <>
            {!qrData ? (
              <QrScanner onScan={handleScan} />
            ) : user && (
              <GameList
                user={user}
                onUpdateItems={handleUpdateItems}
                onFinish={() => { setQrData(null); setUser(null); setError(''); }}
                deliveredByUserId={userId ? parseInt(userId, 10) : null}
              />
            )}
          </>
        )}
      </section>
      {isPanelOpen && userRole && (
        <ControlPanelModal
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          userRole={userRole}
          loggedInUserId={userId ? parseInt(userId, 10) : null}
          loggedInUserName={userName}
        />
      )}
    </main>
  );
}
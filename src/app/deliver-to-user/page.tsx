"use client";

import { useRouter } from 'next/navigation'; 
import type { Item } from '@/types';
import { useCallback, useState } from 'react';
import ControlPanelModal from '../../components/ControlPanelModal';
import GamesToRetrieveList from '../../components/GamesToRetrieveList';
import AppHeader from '../../components/AppHeader';
import QrScanner from '../../components/QrScanner';
import { useAuth } from '../../hooks/useAuth';

interface UserRetrievingGames {
  id: number | string;
  first_name: string;
  last_name: string;
  games_to_retrieve: Pick<Item, 'id' | 'title'>[];
}

export default function DeliverToUserPage() {
  const { isAuthenticated, userName, userId, userRole, logout, isLoading: authIsLoading } = useAuth(); 
  const [qrData, setQrData] = useState<string | null>(null);
  const [userRetrieving, setUserRetrieving] = useState<UserRetrievingGames | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const router = useRouter(); 

  const handleScan = useCallback(async (data: string) => {
    if (data && !isLoading) {
      setIsLoading(true);
      setError('');
      setQrData(data);
      setUserRetrieving(null);
      try {
        const response = await fetch(`/api/user/${data}/games-to-retrieve`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error ${response.status}` }));
          throw new Error(errorData.message || `Error ${response.status} al buscar datos del usuario.`);
        }
        const userData: UserRetrievingGames = await response.json();
        setUserRetrieving(userData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ups, algo falló al obtener los juegos a retirar.');
        }
        setTimeout(() => {
          setQrData(null);
          setUserRetrieving(null);
          setError('');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  if (authIsLoading || isAuthenticated === null) { 
    return <div className="flex justify-center items-center min-h-screen"><p>Cargando...</p></div>;
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
      <div className="w-full max-w-5xl text-center">
        <div className="my-6 sm:my-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-700 dark:text-gray-200">Entregar Juegos</h1>
          <hr className="w-24 sm:w-32 h-1 mx-auto my-2 border-0 rounded bg-secondary-blue dark:bg-sky-500" />
        </div>
      </div>

      <section className="w-full max-w-xl p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
        {isLoading && <p className="text-lg text-secondary-blue dark:text-sky-400 my-4 text-center animate-pulse">Buscando juegos a retirar...</p>}
        {error && <p className="text-base sm:text-lg text-red-600 dark:text-red-400 my-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg text-center">{error}</p>}

        {!isLoading && !error && isAuthenticated && (
          <>
            {!qrData ? (
              <QrScanner onScan={handleScan} />
            ) : userRetrieving && (
              <GamesToRetrieveList
                user={userRetrieving}
                onFinish={() => { setQrData(null); setUserRetrieving(null); setError(''); }}
                volunteerId={userId ? parseInt(userId, 10) : null}
                userRole={userRole}
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

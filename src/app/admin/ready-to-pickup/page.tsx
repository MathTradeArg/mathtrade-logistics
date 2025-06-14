"use client";

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

interface ReadyUser {
  id: string | number;
  name: string;
}

const POLLING_INTERVAL = 1000 * 15; // 15 segundos

export default function ReadyToPickupPage() {
  const { isAuthenticated, userName, isAdmin, logout, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [readyUsers, setReadyUsers] = useState<ReadyUser[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!authIsLoading && (isAuthenticated === false || isAdmin == false)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authIsLoading, router]);

  const fetchData = async () => {
    if (isAdmin == false) return;

    setError(null);
    try {
      const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
      const response = await fetch(`${MT_API_HOST}logistics/users/ready-to-pickup/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${localStorage.getItem('authToken')}`
        },
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener datos.`);
      }
      const data: ReadyUser[] = await response.json();

      setReadyUsers(prevReadyUsers => {
        const newUsersMap = new Map(data.map(user => [user.id, user]));
        const prevUserIds = new Set(prevReadyUsers.map(user => user.id));

        const trulyNewUsers = data.filter(user => !prevUserIds.has(user.id));

        const persistentUsers = prevReadyUsers
          .filter(user => newUsersMap.has(user.id))
          .map(user => newUsersMap.get(user.id)!);

        return [...trulyNewUsers, ...persistentUsers];
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setIsLoadingData(false);
    }
  };
  useEffect(() => {
    if (isAuthenticated && isAdmin == true) {
      fetchData();
      const intervalId = setInterval(fetchData, POLLING_INTERVAL);
      return () => clearInterval(intervalId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAdmin]);

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex justify-center items-center min-h-screen"><p>Cargando...</p></div>;
  }

  if (isAdmin === false) {
    return <div className="flex justify-center items-center min-h-screen"><p>Acceso denegado.</p></div>;
  }

  return (
    <main className="w-full p-4 md:p-6 lg:p-8 flex flex-col items-center h-screen bg-gray-800 text-gray-100 overflow-hidden">
      <div className="w-full text-center">
        <div className="my-4 md:my-6 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-100 flex items-center justify-center">
            <Users size={40} className="mr-3 text-sky-400" />
            Listos para Retirar
          </h1>
          {lastUpdated && <p className="text-sm md:text-base text-gray-400 mt-2">Última actualización: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>}
        </div>
      </div>

      <section className="w-full p-4 md:p-6 bg-gray-700 rounded-2xl shadow-2xl flex-grow overflow-y-auto">
        {isLoadingData && readyUsers.length === 0 && <p className="text-xl md:text-2xl text-sky-400 my-6 text-center">Cargando usuarios...</p>}
        {error && <p className="text-lg md:text-xl text-red-300 my-6 p-4 bg-red-900/60 border border-red-500 rounded-lg text-center">{error}</p>}

        {!isLoadingData && readyUsers.length === 0 && !error && <p className="text-gray-300 text-xl md:text-2xl text-center py-8">No hay usuarios listos para retirar.</p>}

        {readyUsers.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {readyUsers.map(user => (
              <li key={user.id} className="p-1.5 sm:p-2 bg-gray-600 rounded-lg shadow-md flex items-center justify-center min-h-[70px] md:min-h-[80px] lg:min-h-[90px]">
                <p className="font-bold text-sky-300 text-xl sm:text-2xl md:text-4xl lg:text-4xl text-center">{user.name}</p></li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
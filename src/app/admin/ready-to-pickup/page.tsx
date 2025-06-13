"use client";

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

interface ReadyUser {
  id: string | number;
  name: string;
}

const POLLING_INTERVAL = 15000; // 15 segundos

export default function ReadyToPickupPage() {
  const { isAuthenticated, userName, userRole, logout, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [readyUsers, setReadyUsers] = useState<ReadyUser[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!authIsLoading && (isAuthenticated === false || userRole !== 'ADMIN')) {
      router.push('/');
    }
  }, [isAuthenticated, userRole, authIsLoading, router]);

  const fetchData = async () => {
    if (userRole !== 'ADMIN') return;

    setError(null);
    try {
      const response = await fetch('/api/admin/ready-to-pickup');
      if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener datos.`);
      }
      const data: ReadyUser[] = await response.json();

      setReadyUsers(prevReadyUsers => {
        const newUsersMap = new Map(data.map(user => [user.id, user]));
        const prevUserIds = new Set(prevReadyUsers.map(user => user.id));

        // Usuarios que son nuevos en esta actualización
        const trulyNewUsers = data.filter(user => !prevUserIds.has(user.id));

        // Usuarios que ya estaban y siguen estando 
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
    if (isAuthenticated && userRole === 'ADMIN') {
      fetchData();
      const intervalId = setInterval(fetchData, POLLING_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, userRole]);

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex justify-center items-center min-h-screen"><p>Cargando...</p></div>;
  }

  if (userRole !== 'ADMIN') {
    return <div className="flex justify-center items-center min-h-screen"><p>Acceso denegado.</p></div>;
  }

  return (
    <main className="w-full p-6 md:p-8 lg:p-12 flex flex-col items-center min-h-screen bg-gray-800 text-gray-100">
      <div className="w-full text-center"> 
        <div className="my-8 md:my-12 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-100 flex items-center justify-center">
            <Users size={48} className="mr-4 text-sky-400" />
            Listos para Retirar
          </h1>
          {lastUpdated && <p className="text-base md:text-lg text-gray-400 mt-3">Última actualización: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>}
        </div>
      </div>

      <section className="w-full p-6 md:p-8 bg-gray-700 rounded-2xl shadow-2xl"> 
        {isLoadingData && readyUsers.length === 0 && <p className="text-2xl md:text-3xl text-sky-400 my-8 text-center">Cargando usuarios...</p>}
        {error && <p className="text-xl md:text-2xl text-red-300 my-8 p-6 bg-red-900/60 border border-red-500 rounded-lg text-center">{error}</p>}

        {!isLoadingData && readyUsers.length === 0 && !error && <p className="text-gray-300 text-2xl md:text-3xl text-center py-10">No hay usuarios listos para retirar.</p>}

        {readyUsers.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
            {readyUsers.map(user => (
              <li key={user.id} className="p-3 sm:p-4 bg-gray-600 rounded-xl shadow-lg flex items-center justify-center min-h-[90px] md:min-h-[110px] lg:min-h-[120px]">
                <p className="font-bold text-sky-300 text-4xl sm:text-3xl md:text-3xl lg:text-4xl text-center">{user.name}</p></li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
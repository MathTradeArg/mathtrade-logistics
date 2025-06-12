"use client";

import { useState, useCallback, useEffect} from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react'; 
import QrScanner from '../components/QrScanner';
import GameList from '../components/GameList';
import type { User } from '@/types'; 

export default function HomePage() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [user, setUser] = useState<User|null> (null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUserName = localStorage.getItem('userName');
    if (token && storedUserName) {
      setIsAuthenticated(true);
      setUserName(storedUserName);
    } else {
      setIsAuthenticated(false);
      setUserName(null);

      localStorage.removeItem('authToken');
      localStorage.removeItem('userName');
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserName(null);
    router.push('/login');
  };
  
  const handleScan = useCallback(async (data: string) => {
    if (data && !isLoading) { 
      setIsLoading(true);
      setError('');
      setQrData(data);
      try {
        const response = await fetch(`/api/games/${data}`); 
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

  const handleUpdateItem = useCallback(async (itemId: number, newDeliveredState: boolean) => {
    if (!qrData || !user || !newDeliveredState) {
      return;
    }
    const currentItem = user.items.find(i => i.id === itemId);
    if (!currentItem || currentItem.delivered) return;
    try {
      const response = await fetch('/api/games/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrId: qrData, 
          itemId: itemId, 
          delivered: newDeliveredState 
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
            item.id === itemId ? { ...item, delivered: true } : item 
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
      <header className="w-full max-w-5xl mb-8 sm:mb-12">
        {isAuthenticated && userName && (
        <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Hola, <span className="font-bold text-secondary-blue dark:text-sky-400">{userName}</span>!</p>
          <button
            aria-label="Salir"
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-secondary-blue dark:text-gray-400 dark:hover:text-sky-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      )}

      <h1 className="text-2xl sm:text-3xl font-bold my-4 sm:my-6 text-center text-gray-800 dark:text-white">Recibir juegos</h1>
      </header>
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
                onUpdateItem={handleUpdateItem}
                onFinish={() => { setQrData(null); setUser(null); setError(''); }}
              />
            )}
          </>
        )}
      </section>
    </main>
  );
}
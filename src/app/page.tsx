"use client";

import { useState, useCallback } from 'react';
import QrScanner from '../components/QrScanner';
import GameList from '../components/GameList';
import type { Item, User } from '@/types'; 

export default function HomePage() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [user, setUser] = useState<User|null> (null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleScan = useCallback(async (data: string) => {
    if (data && !isLoading) {
      setIsLoading(true);
      setError('');
      setQrData(data);
      try {
        const response = await fetch(`/api/games/${data}`); 
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status} al obtener datos del usuario.`);
        }
        const userData: User = await response.json();
        setUser(userData);
      } catch (err) { 
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ocurrió un error inesperado.');
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el ítem.');
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
      setError(err instanceof Error ? err.message : 'Error al actualizar el ítem.');
    }
  }, [qrData, user]); 

  return (
    <main className="container mx-auto p-4 flex flex-col items-center min-h-screen">
      <h1 className="text-3xl font-bold my-6 text-center">Lector de QR para Entrega de Juegos</h1>
      
      {isLoading && <p className="text-lg text-blue-600 my-4">Cargando datos del juego...</p>}
      {error && <p className="text-lg text-red-600 my-4 p-3 bg-red-100 border border-red-400 rounded">Error: {error}</p>}

      {!isLoading && !error && (
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
    </main>
  );
}
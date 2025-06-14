"use client";

import { ArrowRightCircle, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import AppHeader from '../components/AppHeader';
import ControlPanelModal from '../components/ControlPanelModal';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { isAuthenticated, userName, userId, isAdmin, logout, isLoading: authIsLoading } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex justify-center items-center min-h-screen"><p>Cargando...</p></div>;
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
        />
      )}

      <section className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-8">
        <Link href="/receive-games" passHref>
          <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer h-full">
            <QrCode size={48} className="text-secondary-blue mb-4" />
            <h2 className="text-2xl font-semibold text-secondary-blue dark:text-sky-400 mb-2">Recibir Juegos</h2>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Escaneá el QR de un usuario para ver los juegos que debe entregar.
            </p>
          </div>
        </Link>

        <Link href="/deliver-to-user" passHref>
          <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer h-full">
            <ArrowRightCircle size={48} className="text-accent-green mb-4" />
            <h2 className="text-2xl font-semibold text-accent-green dark:text-green-400 mb-2">Entregar Juegos</h2>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Escaneá el QR de un usuario para ver la lista de juegos que debe retirar.
            </p>
          </div>
        </Link>
      </section>

      {isPanelOpen && isAdmin && (
        <ControlPanelModal
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          isAdmin={isAdmin}
          loggedInUserId={userId ? parseInt(userId, 10) : null}
          loggedInUserName={userName}
        />
      )}
    </main>
  );
}

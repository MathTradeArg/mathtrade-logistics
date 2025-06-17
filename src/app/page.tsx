"use client";

import { ArrowRightCircle, QrCode, Settings, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import AppHeader from '../components/AppHeader';
import ControlPanelModal from '../components/ControlPanelModal';
import LandingPageLink from '../components/LandingPageLink';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { isAuthenticated, userName, userId, isAdmin, logout, isLoading: authIsLoading, isDarkMode, toggleDarkMode } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  if (authIsLoading || isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner message="Cargando aplicación..." />
      </div>
    );
  }

  const handleModalClose = (actionWasSuccessful?: boolean) => {
    setIsPanelOpen(false);
    if (actionWasSuccessful) {
      window.location.reload();
    }
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 flex flex-col items-center min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {isAuthenticated && (
        <AppHeader
          userName={userName}
          isAdmin={isAdmin}
          onLogoutClick={logout}
          onPanelClick={() => setIsPanelOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          showPanelButton={true}
          showBackButton={true} 
        />
      )}

      <section className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-8">
    <LandingPageLink
      href="/receive-games"
      icon={<QrCode size={48} className="text-secondary-blue mb-4" />}
      title="Recibir Juegos"
      description="Escaneá el QR de un usuario para ver los juegos que debe entregar."
      titleClassName="text-secondary-blue dark:text-sky-400"
    />
    <LandingPageLink
      href="/deliver-to-user"
      icon={<ArrowRightCircle size={48} className="text-accent-green mb-4" />}
      title="Entregar Juegos"
      description="Escaneá el QR de un usuario para ver la lista de juegos que debe retirar."
      titleClassName="text-accent-green dark:text-green-400"
    />
      </section>

      {isPanelOpen && (
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

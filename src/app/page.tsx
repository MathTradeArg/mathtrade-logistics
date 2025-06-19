"use client";

import { ArrowRightCircle, AlertTriangle, QrCode, Archive } from 'lucide-react';
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
    <main className="flex flex-col min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
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

      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-4 mt-4 mb-4 px-4 sm:px-6 flex-grow items-stretch">
        <LandingPageLink
          href="/receive-games"
          icon={<QrCode size={48} className="text-secondary-blue dark:text-sky-400 md:mb-4" />}
          title="Recibir Juegos"
          description="Recibí los juegos de un usuario escaneando su QR."
          titleClassName="text-secondary-blue dark:text-sky-400"
        />
        <LandingPageLink
          href="/deliver-to-user"
          icon={<ArrowRightCircle size={48} className="text-accent-green dark:text-green-400 md:mb-4" />}
          title="Entregar Juegos"
          description="Entregale sus juegos a un usuario escaneando su QR."
          titleClassName="text-accent-green dark:text-green-400"
        />
        <LandingPageLink
          href="/boxes"
          icon={<Archive size={48} className="text-teal-600 dark:text-teal-400 md:mb-4" />}
          title="Gestión de Cajas"
          description="Gestioná el armado y desarmado de cajas."
          titleClassName="text-teal-600 dark:text-teal-400"
        />
        <LandingPageLink
          href="/reports"
          icon={<AlertTriangle size={48} className="text-orange-500 dark:text-orange-400 md:mb-4" />}
          title="Reportar"
          description="Reportá un ítem o un usuario."
          titleClassName="text-orange-500 dark:text-orange-400"
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

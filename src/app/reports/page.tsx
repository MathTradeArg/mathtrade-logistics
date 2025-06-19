"use client";

import ControlPanelModal from "@/components/ControlPanelModal";
import { FileSearch, UserSearch, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando página de reportes..." /></div>}>
      <ReportsPageContent />
    </Suspense>
  );
}

function ReportsPageContent() {
  const { isAuthenticated, userName, userId, isAdmin, logout, isLoading: authIsLoading, isDarkMode, toggleDarkMode } = useAuth();
  const router = useRouter();

  const [reportItemId, setReportItemId] = useState('');
  const [reportItemReason, setReportItemReason] = useState('');
  const [searchUserName, setSearchUserName] = useState('');
  const [reportUserReason, setReportUserReason] = useState('');

  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Placeholder para la lógica de envío de reportes
  const handleReportItemSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoadingReport(true);
    setReportError('');
    setReportSuccess('');
    // TODO: Implementar lógica de envío de reporte de ítem
    console.log("Reportar ítem:", { id: reportItemId, reason: reportItemReason });
    // Simular API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // setReportSuccess("Reporte de ítem enviado.");
    setReportError("Función de reporte de ítem aún no implementada.");
    setIsLoadingReport(false);
  };

  const handleReportUserSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoadingReport(true);
    setReportError('');
    setReportSuccess('');
    // TODO: Implementar lógica de búsqueda de usuario y envío de reporte
    console.log("Reportar usuario:", { name: searchUserName, reason: reportUserReason });
    // Simular API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // setReportSuccess("Reporte de usuario enviado.");
    setReportError("Función de reporte de usuario aún no implementada.");
    setIsLoadingReport(false);
  };

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Validando sesión..." /></div>;
  }

  return (
    <main className="flex flex-col min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {isAuthenticated && (
        <AppHeader
          userName={userName}
          isAdmin={isAdmin}
          onLogoutClick={logout}
          isDarkMode={isDarkMode}
          pageTitle="Crear Reporte"
          pageIcon={AlertTriangle}
          onToggleDarkMode={toggleDarkMode}
          showPanelButton={true}
          showBackButton={true}
          onBackClick={() => router.push('/')}
          onPanelClick={() => setIsPanelOpen(true)}
        />
      )}

      <div className="w-full max-w-3xl mx-auto text-center px-4">
      </div>

      <section className="w-full max-w-xl mx-auto p-4 sm:p-6 space-y-8">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          <h2 className="text-2xl font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
            <FileSearch size={28} className="mr-2" /> Reportar Ítem
          </h2>
          <form onSubmit={handleReportItemSubmit} className="space-y-4">
            <div>
              <label htmlFor="reportItemId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID del Ítem (Assigned Trade Code)</label>
              <input type="number" id="reportItemId" value={reportItemId} onChange={(e) => setReportItemId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700" />
            </div>
            <div>
              <label htmlFor="reportItemReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo del Reporte</label>
              <textarea id="reportItemReason" value={reportItemReason} onChange={(e) => setReportItemReason(e.target.value)} rows={3} required className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700"></textarea>
            </div>
            <button type="submit" disabled={isLoadingReport} className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50">
              {isLoadingReport ? 'Enviando...' : 'Enviar Reporte de Ítem'}
            </button>
          </form>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          <h2 className="text-2xl font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
            <UserSearch size={28} className="mr-2" /> Reportar Usuario
          </h2>
          <form onSubmit={handleReportUserSubmit} className="space-y-4">
            <div>
              <label htmlFor="searchUserName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre o Nick del Usuario</label>
              <input type="text" id="searchUserName" value={searchUserName} onChange={(e) => setSearchUserName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700" />
            </div>
            <div>
              <label htmlFor="reportUserReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo del Reporte</label>
              <textarea id="reportUserReason" value={reportUserReason} onChange={(e) => setReportUserReason(e.target.value)} rows={3} required className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm bg-gray-50 dark:bg-gray-700"></textarea>
            </div>
            <button type="submit" disabled={isLoadingReport} className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-50">
              {isLoadingReport ? 'Enviando...' : 'Enviar Reporte de Usuario'}
            </button>
          </form>
        </div>

        {reportError && (
          <p className="text-center text-red-500 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/30 rounded-md">{reportError}</p>
        )}
        {reportSuccess && (
          <p className="text-center text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900/30 rounded-md">{reportSuccess}</p>
        )}

      </section>



      {isPanelOpen && (
        <ControlPanelModal
          isOpen={isPanelOpen}
          onClose={() => {setIsPanelOpen(false)}}
          isAdmin={isAdmin}
          loggedInUserId={userId ? parseInt(userId, 10) : null}
          loggedInUserName={userName}
        />
      )}
    </main>
  );
}

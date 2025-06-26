/* eslint-disable @next/next/no-img-element */
"use client";

import AppHeader from "@/components/AppHeader";
import FullScreenImageModal from "@/components/FullScreenImageModal";
import ReportCard from "@/components/ReportCard";
import { LoadingSpinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { EnrichedReport, ItemData, Report, UserData } from "@/types/index";
import { AlertTriangle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function AllReportsContent() {
  const { isAdmin, isLoading: authIsLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: reports, isLoading: isLoadingReports, error: reportsError, execute: fetchReports } = useApi<Report[]>('reports/');
  const { data: users, isLoading: isLoadingUsers, error: usersError, execute: fetchUsers } = useApi<UserData[]>('mathtrades/7/users/');
  const { data: items, isLoading: isLoadingItems, error: itemsError, execute: fetchItems } = useApi<ItemData[]>('logistics/items/');

  useEffect(() => {
    fetchReports();
    fetchUsers();
    fetchItems();
  }, [fetchReports, fetchUsers, fetchItems]);

  useEffect(() => {
    if (!authIsLoading && (!isAuthenticated || !isAdmin)) {
      router.replace('/');
    }
  }, [isAdmin, authIsLoading, isAuthenticated, router]);

  const usersMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);
  const itemsMap = useMemo(() => new Map(items?.map(i => [i.id, i])), [items]);

  const enrichedReports = useMemo((): EnrichedReport[] => {
    if (!reports) return [];
    const allEnriched = reports.map(report => ({
      ...report,
      reportedUserData: report.reported_user ? usersMap.get(report.reported_user) : undefined,
      itemData: report.item ? itemsMap.get(report.item) : undefined,
    })).reverse();

    if (!searchTerm.trim()) {
      return allEnriched;
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return allEnriched.filter(report => {
      const reportedUserName = report.reportedUserData ? `${report.reportedUserData.first_name} ${report.reportedUserData.last_name}` : '';
      const normalizedReportedUserName = reportedUserName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const itemTitle = report.itemData?.title || '';
      const normalizedItemTitle = itemTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const itemCode = report.itemData?.assigned_trade_code.toString() || '';

      return normalizedReportedUserName.includes(normalizedSearchTerm) ||
        normalizedItemTitle.includes(normalizedSearchTerm) ||
        itemCode.includes(normalizedSearchTerm);
    });
  }, [reports, usersMap, itemsMap, searchTerm]);

  if (authIsLoading || isLoadingReports || isLoadingUsers || isLoadingItems) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando reportes..." /></div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Verificando permisos..." /></div>;
  }

  const error = reportsError || usersError || itemsError;
  if (error) {
    return <div className="text-center text-red-500 mt-8">Error al cargar los datos: {error}</div>;
  }

  return (
    <main className="flex flex-col items-center min-h-dvh bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <AppHeader pageTitle="Todos los Reportes" pageIcon={AlertTriangle as any} showBackButton={true} />
      <section className="w-full max-w-4xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, título de ítem o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
        </div>
        {enrichedReports.length === 0 ? (
          <div className="text-center py-16"><p className="text-gray-500 dark:text-gray-400">{searchTerm ? 'No se encontraron reportes que coincidan con la búsqueda.' : 'No hay reportes para mostrar.'}</p></div>
        ) : (
          <div className="space-y-6">
            {enrichedReports.map((report, index) => (
              <ReportCard key={index} report={report} onImageClick={setFullScreenPhoto} />
            ))}
          </div>
        )}
      </section>
      <FullScreenImageModal
        imageUrl={fullScreenPhoto}
        onClose={() => setFullScreenPhoto(null)}
      />
    </main >
  );
}

export default function AllReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando..." /></div>}>
      <AllReportsContent />
    </Suspense>
  );
}
/* eslint-disable @next/next/no-img-element */
"use client";

import { FullScreenImageModal, ReportCard } from "@/components/common";
import AppHeader from "@/components/common/AppHeader";
import { LoadingSpinner } from "@/components/common/ui";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { EnrichedReport, Item, Report, UserData } from "@/types/index";
import { Warning, MagnifyingGlass } from "phosphor-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useHapticClick } from "@/hooks/useHapticClick";
import { triggerHaptic } from "@/utils/haptics";

function AllReportsContent() {
  const { isAdmin, isLoading: authIsLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localReports, setLocalReports] = useState<Report[] | null>(null);

  const handleCloseFullScreen = useHapticClick(() => setFullScreenPhoto(null));
  const handleImageClick = useHapticClick((imageUrl: string) => setFullScreenPhoto(imageUrl));
  const handleReportDeleted = useHapticClick((deletedReportId: number) => {
    if (localReports) {
      setLocalReports(localReports.filter(report => report.id !== deletedReportId));
    }
  });

  const { data: reports, isLoading: isLoadingReports, error: reportsError, execute: fetchReports } = useApi<Report[]>('reports/');
  const { data: items, isLoading: isLoadingItems, error: itemsError, execute: fetchItems } = useApi<Item[]>('logistics/items/');

  useEffect(() => {
    fetchReports();
    fetchItems();
  }, [fetchReports, fetchItems]);

  useEffect(() => {
    if (!authIsLoading && (!isAuthenticated || !isAdmin)) {
      router.replace('/');
    }
  }, [isAdmin, authIsLoading, isAuthenticated, router]);

  useEffect(() => {
    if (reports) {
      setLocalReports(reports);
    }
  }, [reports]);

  const itemsMap = useMemo(() => new Map(items?.map(i => [i.id, i])), [items]);

  const enrichedReports = useMemo((): EnrichedReport[] => {
    const reportsToUse = localReports || reports;
    if (!reportsToUse) return [];

    const filteredReports = reportsToUse.filter(report => report.reported_user !== null || report.item !== null);

    const allEnriched = filteredReports.map(report => {
      const enriched: EnrichedReport = {
        ...report,
        reportedUserData: report.reported_user ? {
          id: report.reported_user.id,
          first_name: report.reported_user.first_name,
          last_name: report.reported_user.last_name,
          bgg_user: report.reported_user.bgg_user
        } : undefined,
        itemData: report.item ? itemsMap.get(report.item) : undefined,
      };

      return enriched;
    }).reverse();

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
  }, [localReports, reports, itemsMap, searchTerm]);

  if (authIsLoading || isLoadingReports || isLoadingItems) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando reportes..." /></div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Verificando permisos..." /></div>;
  }

  const error = reportsError || itemsError;
  if (error) {
    return <div className="text-center text-red-500 mt-8">Error al cargar los datos: {error}</div>;
  }

  return (
    <main className="flex flex-col min-h-dvh text-gray-900 dark:text-gray-100">
      <AppHeader pageTitle="Todos los Reportes" pageIcon={Warning as any} showBackButton={true} />

      <div className="sticky top-16 z-10 bg-white-800 dark:bg-gray-900 shadow-md">
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlass className="h-5 w-5 text-gray-400" />
            </div>
            <div className=" pl-12 ">
              <input
                type="text"
                placeholder="Buscar por nombre, título de ítem o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => triggerHaptic()}
                className="w-full pr-4 py-3 nm-input"
              />
            </div>
          </div>
        </div>
      </div>

      <section className="w-full max-w-4xl mx-auto p-4 sm:p-6 pt-6">
        {enrichedReports.length === 0 ? (
          <div className="text-center py-16"><p className="text-gray-500 dark:text-gray-400">{searchTerm ? 'No se encontraron reportes que coincidan con la búsqueda.' : 'No hay reportes para mostrar.'}</p></div>
        ) : (
          <div className="space-y-6">
            {enrichedReports.map((report, index) => (
              <ReportCard
                key={report.id}
                report={report}
                onImageClick={handleImageClick}
                onReportDeleted={handleReportDeleted}
              />
            ))}
          </div>
        )}
      </section>
      <FullScreenImageModal
        imageUrl={fullScreenPhoto}
        onClose={handleCloseFullScreen}
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
"use client";

import { FullScreenImageModal, ReportCard } from '@/components/common';
import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffEmpty, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { EnrichedReport, Report } from '@/types/index';
import { Suspense, useEffect, useMemo, useState } from 'react';

function AllReportsContent() {
  const { isAdmin, isLoading: authIsLoading, isAuthenticated } = useAuth();
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localReports, setLocalReports] = useState<Report[] | null>(null);

  const { data: reports, isLoading: isLoadingReports, error: reportsError, execute: fetchReports } = useApi<Report[]>('reports/');

  useEffect(() => {
    fetchReports(undefined, '?event=1');
  }, [fetchReports]);

  useEffect(() => {
    if (reports) setLocalReports(reports);
  }, [reports]);

  const enrichedReports = useMemo((): EnrichedReport[] => {
    const reportsToUse = localReports || reports;
    if (!reportsToUse) return [];
    const allEnriched = reportsToUse.map((report) => ({
      ...report,
      reportedUserData: report.reported_user ? {
        id: report.reported_user.id,
        first_name: report.reported_user.first_name,
        last_name: report.reported_user.last_name,
        bgg_user: report.reported_user.bgg_user,
      } : undefined,
      itemData: report.item ? {
        id: report.item,
        item_id: report.item,
        title: report.item_title || `Item ${report.item}`,
        assigned_trade_code: report.assigned_trade_code || 0,
      } : undefined,
    }));
    if (!searchTerm.trim()) return allEnriched;
    const normalizedSearchTerm = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return allEnriched.filter((report) => {
      const reportedUserName = report.reportedUserData ? `${report.reportedUserData.first_name} ${report.reportedUserData.last_name}` : '';
      const itemTitle = report.item_title || report.itemData?.title || '';
      const itemCode = String(report.assigned_trade_code || report.itemData?.assigned_trade_code || '');
      const boxNumber = report.box_number != null ? String(report.box_number) : '';
      const boxId = report.box != null ? String(report.box) : '';
      return reportedUserName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearchTerm)
        || itemTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedSearchTerm)
        || itemCode.includes(normalizedSearchTerm)
        || boxNumber.includes(normalizedSearchTerm)
        || boxId.includes(normalizedSearchTerm)
        || report.comment.toLowerCase().includes(normalizedSearchTerm);
    });
  }, [localReports, reports, searchTerm]);

  if (authIsLoading || isAuthenticated === null || isLoadingReports || (reports == null && !reportsError)) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando reportes..." /></div>;
  }

  if (reportsError) {
    return <StaffPage><StaffError>{reportsError}</StaffError></StaffPage>;
  }

  return (
    <StaffPage>
      <GameRow
        href="/more/reports/amba-missing"
        title="Retiran en AMBA con faltantes"
        subtitle="Socios que reciben acá y tienen juegos reportados"
      />
      <div className="mt-4">
      <StaffSearch
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Buscar por juego, caja o comentario"
        aria-label="Buscar reportes"
      />
      {enrichedReports.length === 0 ? (
        <StaffEmpty>{searchTerm ? 'No se encontraron reportes que coincidan con la búsqueda.' : 'No hay reportes del evento.'}</StaffEmpty>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {enrichedReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              canManage={isAdmin}
              canComment
              onImageClick={setFullScreenPhoto}
              onReportDeleted={(deletedReportId) => {
                setLocalReports((prev) => (prev ? prev.filter((item) => item.id !== deletedReportId) : prev));
              }}
              onReportResolved={(updated) => {
                setLocalReports((prev) => (
                  prev ? prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) : prev
                ));
              }}
            />
          ))}
        </div>
      )}
      </div>
      <FullScreenImageModal imageUrl={fullScreenPhoto} onClose={() => setFullScreenPhoto(null)} />
    </StaffPage>
  );
}

export default function MoreReportsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>}>
      <AllReportsContent />
    </Suspense>
  );
}

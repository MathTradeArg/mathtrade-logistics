/* eslint-disable @next/next/no-img-element */
"use client";

import AppHeader from '@/components/AppHeader';
import { LoadingSpinner } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Camera, MessageSquare, Package, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo } from 'react';

interface Report {
  reported_user: number | null;
  item: number | null;
  images: string | null;
  comment: string;
  created: string;
}

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  bgg_user?: string;
  email?: string;
}

interface ItemData {
  id: number;
  title: string;
  assigned_trade_code: number;
}

interface EnrichedReport extends Report {
  reportedUserData?: UserData;
  itemData?: ItemData;
}

function AllReportsContent() {
  const { isAdmin, isLoading: authIsLoading, isAuthenticated } = useAuth();
  const router = useRouter();

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
    return reports.map(report => ({
      ...report,
      reportedUserData: report.reported_user ? usersMap.get(report.reported_user) : undefined,
      itemData: report.item ? itemsMap.get(report.item) : undefined,
    })).reverse();
  }, [reports, usersMap, itemsMap]);

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
        {enrichedReports.length === 0 ? (
          <div className="text-center py-16"><p className="text-gray-500 dark:text-gray-400">No hay reportes para mostrar.</p></div>
        ) : (
          <div className="space-y-6">
            {enrichedReports.map((report, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    {report.reportedUserData ? (
                      <><UserIcon className="w-5 h-5 mr-3 text-orange-500" /><h3 className="font-semibold text-lg">Reporte de Usuario: <span className="font-normal">{report.reportedUserData.first_name} {report.reportedUserData.last_name} {report.reportedUserData.bgg_user && `(${report.reportedUserData.bgg_user})`}</span></h3></>
                    ) : report.itemData ? (
                      <><Package className="w-5 h-5 mr-3 text-orange-500" /><h3 className="font-semibold text-lg">Reporte de Ítem: <span className="font-normal">{report.itemData.title} (#{report.itemData.assigned_trade_code})</span></h3></>
                    ) : (<h3 className="font-semibold text-lg">Reporte General</h3>)}
                  </div>
                  {report.created && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                      {report.created}
                    </span>
                  )}
                </div>

                <div className="pl-8 space-y-4">
                  <div className="flex items-start">
                    <MessageSquare className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md w-full">{report.comment}</p>
                  </div>

                  {report.images && (
                    <div className="flex items-start">
                      <Camera className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-600 dark:text-gray-400 mb-2">Imágenes adjuntas:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {report.images.split(',').map((imgUrl, imgIndex) => (
                            <Link key={imgIndex} href={imgUrl} target="_blank" rel="noopener noreferrer" className="block">
                              <img src={imgUrl} alt={`Imagen de reporte ${imgIndex + 1}`} className="w-full h-24 object-cover rounded-lg shadow-sm hover:opacity-80 transition-opacity" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function AllReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><LoadingSpinner message="Cargando..." /></div>}>
      <AllReportsContent />
    </Suspense>
  );
}
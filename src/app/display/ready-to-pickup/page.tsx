"use client";

import { Users, CheckCircle, Clock, UserX, RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import type { UserWithWindow, WindowDisplay, WindowConfig, ProcessedUserWithWindow } from '@/types/window';
import { getMaxUsersForWindow, getGlobalPollingInterval } from '@/utils/windowStorage';

export default function DisplayReadyToPickupPage() {
  const [windowsData, setWindowsData] = useState<WindowDisplay[]>([]);
  const [windowConfig, setWindowConfig] = useState<WindowConfig[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(10);

  const { execute: fetchReadyUsers } = useApi<UserWithWindow[]>('logistics/users/ready-to-pickup/', { method: 'GET' });
  const { execute: fetchWindowConfig } = useApi<WindowConfig[]>('logistics/windows/config/', { method: 'GET' });

  const organizeUsersByWindows = useCallback((users: ProcessedUserWithWindow[], config: WindowConfig[]): WindowDisplay[] => {
    const windowMap = new Map<string, WindowDisplay>();

    config.forEach(window => {
      windowMap.set(window.id.toString(), {
        id: window.id,
        name: window.name,
        users: [],
        max_users: getMaxUsersForWindow(window.id),
        ready_count: 0,
        attended_count: 0,
        no_show_count: 0
      });
    });

    const filteredUsers = users.filter(user => !user.roles?.includes('volunteer') && !user.roles?.includes('admin'));

    filteredUsers.forEach(user => {
      if (user.window_id) {
        const windowId = user.window_id.toString();
        const windowData = windowMap.get(windowId);

        if (windowData) {
          if (user.status !== 'completed') {
            windowData.users.push(user);
          }

          switch (user.status) {
            case null:
            case 'present':
              windowData.ready_count++;
              break;
            case 'receiving':
              windowData.attended_count++;
              break;
            case 'completed':
              windowData.attended_count++;
              break;
            case 'no_show':
              windowData.no_show_count++;
              break;
          }
        }
      }
    });

    windowMap.forEach(window => {
      const noShowUsers = window.users.filter(user => user.status === 'no_show');
      const otherUsers = window.users.filter(user => user.status !== 'no_show');
      window.users = [...otherUsers, ...noShowUsers];
    });

    return Array.from(windowMap.values()).filter(window => window.users.length > 0);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const configData = await fetchWindowConfig();
      const config = configData || [];
      setWindowConfig(config);

      const usersData = await fetchReadyUsers();
      console.log('[DEBUG] Usuarios recibidos del endpoint:', usersData);

      const users = (usersData || [])
        .map(user => ({
          ...user,
          status: user.status || null
        }))
        .filter(user => !user.roles?.includes('volunteer') && !user.roles?.includes('admin'));

      console.log('[DEBUG] Usuarios después del filtro de roles:', users);

      const organizedData = organizeUsersByWindows(users, config);
      console.log('[DEBUG] Datos organizados por ventana:', organizedData);
      setWindowsData(organizedData);

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error al obtener datos:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener datos.');
    } finally {
      setIsRefreshing(false);
      if (isLoadingData) {
        setIsLoadingData(false);
      }
    }
  }, [fetchReadyUsers, fetchWindowConfig, organizeUsersByWindows, isLoadingData]);

  useEffect(() => {
    const currentInterval = getGlobalPollingInterval();
    setPollingInterval(currentInterval);
    
    fetchData();
    const intervalId = setInterval(fetchData, currentInterval * 1000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newInterval = getGlobalPollingInterval();
      if (newInterval !== pollingInterval) {
        setPollingInterval(newInterval);
        window.location.reload(); 
      }
    }, 5000); 

    return () => clearInterval(interval);
  }, [pollingInterval]);

  const getUserStatusColor = (status: string | null) => {
    switch (status) {
      case null:
      case 'present':
        return 'nm-btn-primary';
      case 'receiving':
      case 'completed':
        return 'nm-btn-secondary';
      case 'no_show':
        return 'nm-btn-warning';
      default:
        return 'nm-btn-finish';
    }
  };

  const getUserStatusIcon = (status: string | null) => {
    switch (status) {
      case 'receiving':
      case 'completed':
        return <CheckCircle size={20} className="text-blue-600 dark:text-blue-400" />;
      case 'no_show':
        return <UserX size={20} className="text-red-600 dark:text-red-400" />;
      case null:
      case 'present':
      default:
        return <Clock size={20} className="text-green-600 dark:text-green-400" />;
    }
  };

  const getVisibleUsers = (users: ProcessedUserWithWindow[], maxUsers: number) => {
    return users.slice(0, maxUsers);
  };

  const capitalizeWords = (text: string) => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const totalStats = windowsData
    .filter(window => window.id !== -1)
    .reduce((acc, window) => {
      return {
        ready: acc.ready + window.ready_count,
        attended: acc.attended + window.attended_count,
        no_show: acc.no_show + window.no_show_count
      };
    }, { ready: 0, attended: 0, no_show: 0 });

  const getGridColumns = (windowCount: number) => {
    if (windowCount === 1) return 1;
    if (windowCount === 2) return 2;
    if (windowCount === 3) return 3;
    if (windowCount >= 4) return 4;
    return 4; 
  };

  const gridColumns = getGridColumns(windowsData.length);

  const getGridClasses = () => {
    const baseClasses = 'grid gap-6 flex-1';
    
    if (gridColumns === 1) return `${baseClasses} grid-cols-1`;
    if (gridColumns === 2) return `${baseClasses} grid-cols-1 md:grid-cols-2`;
    if (gridColumns === 3) return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`;
    if (gridColumns >= 4) return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    
    return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
  };

  return (
    <main className="nm-surface w-full p-4 md:p-6 lg:p-8 flex flex-col min-h-screen text-gray-900 dark:text-gray-100 nm-font">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center nm-text-shadow mb-4">
          <Users size={48} className="mr-4 text-sky-400 nm-appheader-icon" />
          Usuarios Listos para Retirar
        </h1>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {lastUpdated && (
            <span className="nm-text-shadow">
              Última actualización: {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {isLoadingData && windowsData.length === 0 && (
          <div className="nm-surface p-12 text-center">
            <p className="text-2xl md:text-3xl text-sky-600 dark:text-sky-400 nm-text-shadow">
              Cargando información...
            </p>
          </div>
        )}

        {error && (
          <div className="nm-surface p-8 bg-red-50 dark:bg-red-900/30 border-2 border-red-500 text-center mb-8">
            <p className="text-xl md:text-2xl text-red-700 dark:text-red-300 nm-text-shadow">
              {error}
            </p>
          </div>
        )}

        {!isLoadingData && windowsData.length === 0 && !error && (
          <div className="nm-surface p-12 text-center">
            <p className="text-2xl md:text-3xl text-gray-600 dark:text-gray-300 nm-text-shadow">
              No hay usuarios listos para retirar en este momento.
            </p>
          </div>
        )}

        {windowsData.length > 0 && (
          <div className={getGridClasses()}>
            {windowsData.map(window => (
              <div key={window.id} className="nm-surface overflow-hidden flex flex-col">
                <div className="nm-surface p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <h2 className="text-xl md:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center nm-text-shadow mb-3">
                    {window.name}
                  </h2>
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400 nm-text-shadow">
                    Mostrando hasta {window.max_users} usuarios
                    {process.env.NODE_ENV === 'development' && ` (${window.users.length} total)`}
                  </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                  {getVisibleUsers(window.users, window.max_users).map(user => (
                    <div
                      key={user.id}
                      className={`nm-list-item p-4 mb-3 ${getUserStatusColor(user.status)}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-3xl md:text-4xl lg:text-5xl leading-tight nm-text-shadow truncate">
                            {capitalizeWords(`${user.first_name} ${user.last_name}`)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs opacity-75 nm-text-shadow leading-tight">
                            {user.username}
                          </p>
                          {user.table_number && (
                            <p className="text-xs opacity-75 nm-text-shadow leading-tight">
                              Mesa {user.table_number}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center flex-shrink-0 ml-2">
                          {getUserStatusIcon(user.status)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {window.users.length > window.max_users && (
                    <div className="text-center p-3 nm-surface rounded-lg text-sm text-gray-600 dark:text-gray-300 nm-text-shadow">
                      +{window.users.length - window.max_users} usuarios más
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center mt-8 p-4 nm-surface rounded-2xl space-y-2">
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 nm-text-shadow">
          Esta pantalla se actualiza automáticamente cada {pollingInterval} segundos
        </p>
        
        <div className="flex justify-center items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-300">
              Listos: {totalStats.ready}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-600 dark:text-gray-300">
              Atendidos: {totalStats.attended}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

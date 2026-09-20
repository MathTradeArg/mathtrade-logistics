"use client";

import { Clock, RefreshCw, UserX, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import type { ProcessedUserWithWindow, UserWithWindow, WindowConfig, WindowDisplay } from '@/types/window';
import { getGlobalPollingInterval, getMaxUsersForWindow } from '@/utils/windowStorage';

function isStaff(user: UserWithWindow): boolean {
  return Boolean(user.roles?.includes('volunteer') || user.roles?.includes('admin'));
}

function displayName(user: ProcessedUserWithWindow): string {
  return `${user.first_name} ${user.last_name}`
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function splitByStatus(users: ProcessedUserWithWindow[]) {
  return {
    listos: users.filter((user) => user.status === 'present' || user.status == null),
    enMesa: users.filter((user) => user.status === 'receiving'),
    noShow: users.filter((user) => user.status === 'no_show'),
  };
}

function capActive(
  listos: ProcessedUserWithWindow[],
  enMesa: ProcessedUserWithWindow[],
  maxUsers: number,
) {
  const shownListos = listos.slice(0, maxUsers);
  const remaining = Math.max(0, maxUsers - shownListos.length);
  const shownMesa = enMesa.slice(0, remaining);
  const hidden = listos.length + enMesa.length - shownListos.length - shownMesa.length;
  return { shownListos, shownMesa, hidden };
}

export default function DisplayReadyToPickupPage() {
  const [windowsData, setWindowsData] = useState<WindowDisplay[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(10);

  const { execute: fetchReadyUsers } = useApi<UserWithWindow[]>('logistics/users/ready-to-pickup/', { method: 'GET' });
  const { execute: fetchWindowConfig } = useApi<WindowConfig[]>('logistics/windows/config/', { method: 'GET' });

  const organizeUsersByWindows = useCallback((users: ProcessedUserWithWindow[], config: WindowConfig[]): WindowDisplay[] => {
    const windowMap = new Map<string, WindowDisplay>();

    config.forEach((window) => {
      windowMap.set(window.id.toString(), {
        id: window.id,
        name: window.name,
        users: [],
        max_users: getMaxUsersForWindow(window.id),
        ready_count: 0,
        attended_count: 0,
        no_show_count: 0,
      });
    });

    users.filter((user) => !isStaff(user)).forEach((user) => {
      if (!user.window_id) return;
      const windowData = windowMap.get(user.window_id.toString());
      if (!windowData) return;

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
        case 'no_show':
          windowData.no_show_count++;
          break;
        default:
          break;
      }
    });

    return Array.from(windowMap.values()).filter((window) => window.users.length > 0);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const configData = await fetchWindowConfig();
      const config = configData || [];

      const usersData = await fetchReadyUsers();
      const users = (usersData || [])
        .map((user) => ({
          ...user,
          status: user.status || null,
        }))
        .filter((user) => !isStaff(user));

      setWindowsData(organizeUsersByWindows(users, config));
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
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
      const nextInterval = getGlobalPollingInterval();
      if (nextInterval !== pollingInterval) {
        setPollingInterval(nextInterval);
        window.location.reload();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingInterval]);

  const totalStats = windowsData
    .filter((window) => window.id !== -1)
    .reduce(
      (acc, window) => ({
        ready: acc.ready + window.ready_count,
        attended: acc.attended + window.attended_count,
        no_show: acc.no_show + window.no_show_count,
      }),
      { ready: 0, attended: 0, no_show: 0 },
    );

  const gridClass =
    windowsData.length <= 1
      ? 'grid grid-cols-1 gap-6'
      : windowsData.length === 2
        ? 'grid grid-cols-1 gap-6 md:grid-cols-2'
        : windowsData.length === 3
          ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
          : 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <main className="flex min-h-screen flex-col bg-page p-4 text-gray-900 md:p-6 lg:p-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 flex items-center justify-center text-4xl font-bold md:text-5xl lg:text-6xl">
          <Users size={48} className="mr-4 text-primary" />
          Listos para retirar
        </h1>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {lastUpdated && (
            <span>
              Última actualización:{' '}
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {isLoadingData && windowsData.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-2xl text-primary md:text-3xl">Cargando información...</p>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-lg border-2 border-danger bg-danger/10 p-8 text-center">
            <p className="text-xl text-danger md:text-2xl">{error}</p>
          </div>
        )}

        {!isLoadingData && windowsData.length === 0 && !error && (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-2xl text-gray-600 md:text-3xl">
              No hay usuarios listos para retirar en este momento.
            </p>
          </div>
        )}

        {windowsData.length > 0 && (
          <div className={gridClass}>
            {windowsData.map((window) => {
              const { listos, enMesa, noShow } = splitByStatus(window.users);
              const { shownListos, shownMesa, hidden } = capActive(listos, enMesa, window.max_users);

              return (
                <section key={window.id} className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <header className="shrink-0 border-b border-gray-200 p-6">
                    <h2 className="mb-3 text-center text-xl font-bold text-primary md:text-2xl">
                      {window.name}
                    </h2>
                    <p className="text-center text-xs text-gray-500">
                      Hasta {window.max_users} en Listos / En mesa
                    </p>
                  </header>

                  <div className="flex-1 overflow-y-auto p-4">
                    <WindowGroup
                      title="Listos"
                      count={listos.length}
                      accent="text-want"
                      users={shownListos}
                      variant="ready"
                    />
                    <WindowGroup
                      title="En mesa"
                      count={enMesa.length}
                      accent="text-primary"
                      users={shownMesa}
                      variant="receiving"
                    />
                    {hidden > 0 && (
                      <p className="mb-4 text-center text-sm text-gray-500">+{hidden} más</p>
                    )}
                    {noShow.length > 0 && (
                      <WindowGroup
                        title="No se presentaron"
                        count={noShow.length}
                        accent="text-danger"
                        users={noShow}
                        variant="no_show"
                      />
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-8 space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-center">
        <p className="text-lg text-gray-600 md:text-xl">
          Esta pantalla se actualiza automáticamente cada {pollingInterval} segundos
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
          <StatDot color="bg-want" label="Listos" value={totalStats.ready} />
          <StatDot color="bg-primary" label="En mesa" value={totalStats.attended} />
          <StatDot color="bg-danger" label="No show" value={totalStats.no_show} />
        </div>
      </footer>
    </main>
  );
}

function StatDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-gray-700">
        {label}: {value}
      </span>
    </div>
  );
}

function WindowGroup({
  title,
  count,
  accent,
  users,
  variant,
}: {
  title: string;
  count: number;
  accent: string;
  users: ProcessedUserWithWindow[];
  variant: 'ready' | 'receiving' | 'no_show';
}) {
  if (users.length === 0 && variant === 'no_show') {
    return null;
  }

  return (
    <div className={variant === 'no_show' ? 'mt-6 border-t border-gray-200 pt-4' : 'mb-6'}>
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accent}`}>
        {title} ({count})
      </h3>
      {users.length === 0 ? (
        <p className="text-sm text-gray-400">Nadie</p>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <UserRow key={user.id} user={user} variant={variant} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  variant,
}: {
  user: ProcessedUserWithWindow;
  variant: 'ready' | 'receiving' | 'no_show';
}) {
  const styles = {
    ready: 'border-l-[6px] border-want bg-want/10 text-gray-900',
    receiving: 'border-l-4 border-primary bg-primary/10 text-gray-900',
    no_show: 'border-l-4 border-danger bg-gray-100 text-gray-500',
  }[variant];

  const icon = {
    ready: <Clock size={20} className="text-want" />,
    receiving: <RefreshCw size={20} className="text-primary" />,
    no_show: <UserX size={20} className="text-danger" />,
  }[variant];

  return (
    <div className={`overflow-visible rounded-lg p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <p className="flex-1 whitespace-normal break-words text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
          {displayName(user)}
        </p>
        <div className="shrink-0 text-right text-xs text-gray-500">
          <p className="leading-tight">{user.username}</p>
          {user.table_number && <p className="leading-tight">Mesa {user.table_number}</p>}
        </div>
        <div className="ml-2 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

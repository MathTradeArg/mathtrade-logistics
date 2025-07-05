import { useCallback, useState } from 'react';
import type { ProcessedUserWithWindow, UserWithWindow, WindowConfig, WindowDisplay } from '@/types/window';
import { useApi } from '@/hooks/useApi';

export const useWindowManagement = () => {
  const [windowsData, setWindowsData] = useState<WindowDisplay[]>([]);
  const [windowConfig, setWindowConfig] = useState<WindowConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { execute: fetchReadyUsers } = useApi<UserWithWindow[]>('logistics/users/ready-to-pickup/', { method: 'GET' });
  const { execute: fetchWindowConfig } = useApi<WindowConfig[]>('logistics/windows/config/', { method: 'GET' });
  const { execute: updateUserStatus } = useApi<any>('logistics/users/update-status/', { method: 'PATCH' });

  const organizeUsersByWindows = useCallback((users: ProcessedUserWithWindow[], config: WindowConfig[]): WindowDisplay[] => {
    const windowMap = new Map<string, WindowDisplay>();

    config.forEach(window => {
      windowMap.set(window.id.toString(), {
        id: window.id,
        name: window.name,
        users: [],
        max_users: 999,
        ready_count: 0,
        attended_count: 0,
        no_show_count: 0
      });
    });

    const unassignedWindowId = 'unassigned';
    windowMap.set(unassignedWindowId, {
      id: unassignedWindowId,
      name: 'Sin Asignar',
      users: [],
      max_users: 999,
      ready_count: 0,
      attended_count: 0,
      no_show_count: 0
    });

    users.forEach(user => {
      const windowId = user.window_id ? user.window_id.toString() : unassignedWindowId;
      const windowData = windowMap.get(windowId);

      if (windowData) {
        windowData.users.push(user);

        switch (user.status) {
          case null:
          case 'present':
            windowData.ready_count++;
            break;
          case 'receiving':
          case 'completed':
            windowData.attended_count++;
            break;
          case 'no_show':
            windowData.no_show_count++;
            break;
        }
      }
    });

    windowMap.forEach(window => {
      window.users.sort((a: ProcessedUserWithWindow, b: ProcessedUserWithWindow) => {
        const statusOrder: Record<string, number> = { 
          null: 0, 
          'present': 1, 
          'receiving': 2, 
          'completed': 3, 
          'no_show': 4 
        };
        const statusDiff = statusOrder[a.status || 'null'] - statusOrder[b.status || 'null'];
        if (statusDiff !== 0) return statusDiff;

        return a.last_name.localeCompare(b.last_name);
      });
    });

    return Array.from(windowMap.values()).filter(window => window.users.length > 0);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const configData = await fetchWindowConfig();
      const config = configData || [];
      setWindowConfig(config);

      const usersData = await fetchReadyUsers();
      const users = (usersData || []).map(user => ({
        ...user,
        status: user.status || null
      }));

      const organizedData = organizeUsersByWindows(users, config);
      setWindowsData(organizedData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener datos.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchReadyUsers, fetchWindowConfig, organizeUsersByWindows]);

  const updateUserStatusLocal = useCallback(async (userId: string | number, newStatus: 'present' | 'receiving' | 'no_show' | 'completed') => {
    try {
      await updateUserStatus({
        user_id: userId,
        status: newStatus
      });

      setWindowsData(prevData =>
        prevData.map(window => {
          const updatedUsers = window.users.map((user: ProcessedUserWithWindow) =>
            user.id === userId ? { ...user, status: newStatus } : user
          );

          return {
            ...window,
            users: updatedUsers,
            ready_count: updatedUsers.filter((u: ProcessedUserWithWindow) => u.status === null || u.status === 'present').length,
            attended_count: updatedUsers.filter((u: ProcessedUserWithWindow) => u.status === 'receiving' || u.status === 'completed').length,
            no_show_count: updatedUsers.filter((u: ProcessedUserWithWindow) => u.status === 'no_show').length
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado del usuario.');
    }
  }, [updateUserStatus]);

  return {
    windowsData,
    windowConfig,
    isLoading,
    error,
    fetchData,
    updateUserStatusLocal,
    setError
  };
};

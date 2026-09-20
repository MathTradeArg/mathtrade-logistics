"use client";

import { useApi } from '@/hooks/useApi';
import { useHapticClick } from '@/hooks/useHapticClick';
import { Bell } from 'phosphor-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type NotificationMessage = {
  item_id?: number | null;
  item_name?: string | null;
  box_id?: number | null;
  box_number?: number | null;
  user_first_name?: string;
  user_last_name?: string;
  comment?: string;
  text?: string;
};

type StaffNotification = {
  id: number;
  type: string;
  unread: boolean;
  created: string;
  message: NotificationMessage | string;
};

type NotificationList = {
  unread: number;
  admin_unread: number;
  results: StaffNotification[];
};

function asMessage(message: StaffNotification['message']): NotificationMessage {
  if (message && typeof message === 'object') return message;
  return { text: String(message || '') };
}

function notificationTitle(notification: StaffNotification): string {
  const message = asMessage(notification.message);
  if (message.item_name) return message.item_name;
  if (message.box_number != null) return `Caja #${message.box_number}`;
  if (message.box_id) return `Caja id ${message.box_id}`;
  return message.text || 'Nuevo reporte';
}

export default function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, execute: fetchNotifications } = useApi<NotificationList>('notifications/');
  const { execute: patchNotification } = useApi('notifications/', { method: 'PATCH' });
  const { execute: markAllRead } = useApi('notifications-bulk/', { method: 'POST' });

  const refresh = useCallback(() => {
    fetchNotifications(undefined, '?type=admin&page_size=20').catch(() => undefined);
  }, [fetchNotifications]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 20000);
    const onReportsChanged = () => refresh();
    window.addEventListener('staff-notifications-changed', onReportsChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('staff-notifications-changed', onReportsChanged);
    };
  }, [refresh]);

  const unread = data?.admin_unread ?? data?.unread ?? 0;
  const results = data?.results || [];

  const handleToggle = useHapticClick(() => {
    setOpen((prev) => {
      if (!prev) refresh();
      return !prev;
    });
  });

  const handleOpenReport = useHapticClick(async (notification: StaffNotification) => {
    if (notification.unread) {
      try {
        await patchNotification({ unread: false }, `${notification.id}/`);
      } catch {
        // still navigate; the next poll will refresh unread state
      }
    }
    setOpen(false);
    router.push('/more/reports');
  });

  const handleMarkAll = useHapticClick(async () => {
    try {
      await markAllRead({ unread: false });
      refresh();
    } catch {
      // ignore — unread badge stays until the next successful poll
    }
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-full p-2 hover:bg-gray-100"
        aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-transparent"
            aria-label="Cerrar notificaciones"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-3 top-[4.5rem] z-[70] flex max-h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] w-auto max-w-sm flex-col overflow-hidden rounded-main bg-white shadow-main sm:inset-x-auto sm:right-3">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold">Notificaciones</p>
              {unread > 0 && (
                <button type="button" onClick={handleMarkAll} className="text-xs font-medium text-primary">
                  Marcar leídas
                </button>
              )}
            </div>
            {results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No hay avisos del evento.</p>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {results.map((notification) => {
                  const message = asMessage(notification.message);
                  const reporter = [message.user_first_name, message.user_last_name].filter(Boolean).join(' ');
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenReport(notification)}
                        className={`w-full px-4 py-3 text-left ${notification.unread ? 'bg-primary/10' : ''}`}
                      >
                        <p className="text-sm font-semibold text-gray-900">{notificationTitle(notification)}</p>
                        {message.box_id && (
                          <p className="text-xs text-gray-500">
                            Caja {message.box_number != null ? `#${message.box_number}` : ''} id {message.box_id}
                            {message.item_id ? ` · item ${message.item_id}` : ''}
                          </p>
                        )}
                        {message.comment && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{message.comment}</p>}
                        {reporter && <p className="mt-1 text-xs text-gray-400">{reporter}</p>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

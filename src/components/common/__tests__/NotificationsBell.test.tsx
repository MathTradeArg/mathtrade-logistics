import { useApi } from '@/hooks/useApi';
import { useRouter } from 'next/navigation';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationsBell from '../NotificationsBell';

jest.mock('@/hooks/useApi');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseApi = useApi as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('NotificationsBell', () => {
  const fetchNotifications = jest.fn();
  const patchNotification = jest.fn();
  const markAllRead = jest.fn();
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push });
    mockUseApi.mockImplementation((endpoint: string) => {
      if (endpoint === 'notifications/') {
        return {
          data: {
            unread: 1,
            admin_unread: 1,
            results: [{
              id: 9,
              type: 'RI',
              unread: true,
              created: '2026-09-20',
              message: {
                item_id: 88,
                item_name: 'Catan',
                box_id: 392,
                box_number: 16,
                comment: 'Faltante en caja #16',
                user_first_name: 'Vol',
                user_last_name: 'Demo',
              },
            }],
          },
          execute: endpoint === 'notifications/' && fetchNotifications.mockResolvedValue(undefined)
            ? fetchNotifications
            : patchNotification,
        };
      }
      return { data: null, execute: markAllRead.mockResolvedValue(undefined) };
    });
  });

  it('shows unread reports and opens the event reports view', async () => {
    mockUseApi.mockImplementation((endpoint: string, options?: { method?: string }) => {
      if (endpoint === 'notifications/' && options?.method === 'PATCH') {
        return { data: null, execute: patchNotification.mockResolvedValue(undefined) };
      }
      if (endpoint === 'notifications-bulk/') {
        return { data: null, execute: markAllRead };
      }
      return {
        data: {
          unread: 1,
          admin_unread: 1,
          results: [{
            id: 9,
            type: 'RI',
            unread: true,
            created: '2026-09-20',
            message: {
              item_id: 88,
              item_name: 'Catan',
              box_id: 392,
              box_number: 16,
              comment: 'Faltante en caja #16',
              user_first_name: 'Vol',
              user_last_name: 'Demo',
            },
          }],
        },
        execute: fetchNotifications.mockResolvedValue(undefined),
      };
    });

    render(<NotificationsBell />);

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones, 1 sin leer' }));
    expect(screen.getByText('Catan')).toBeInTheDocument();
    expect(screen.getByText(/Caja #16/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Catan'));
    await waitFor(() => {
      expect(patchNotification).toHaveBeenCalledWith({ unread: false }, '9/');
      expect(push).toHaveBeenCalledWith('/more/reports');
    });
  });
});

import { http, type PaginatedData } from './client';

export type NotificationType = 'system' | 'publish' | 'review' | 'team' | 'account';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  link: string;
  isRead: boolean;
  readAt: string | null;
  teamId: number | null;
  createdAt: string;
}

export interface UnreadCount {
  total: number;
  byType: Record<NotificationType, number>;
}

export interface NotificationListQuery {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
}

export const notificationsApi = {
  list: (query: NotificationListQuery = {}) =>
    http.get<PaginatedData<AppNotification>>('/notifications', {
      query: {
        type: query.type,
        isRead: query.isRead === undefined ? undefined : String(query.isRead),
        page: query.page,
        pageSize: query.pageSize,
      },
    }),
  unreadCount: () => http.get<UnreadCount>('/notifications/unread-count'),
  markRead: (id: number) =>
    http.post<AppNotification>(`/notifications/${id}/read`),
  markAllRead: (type?: NotificationType) =>
    http.post<{ updated: number }>('/notifications/read-all', type ? { type } : {}),
};

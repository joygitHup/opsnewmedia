import { http, paginatedGet } from './client';

export interface PublishTask {
  id: number;
  draft: number;
  draftTitle: string;
  account: number;
  accountName: string;
  platform: string;
  platformName: string;
  status: 'pending' | 'publishing' | 'success' | 'failed' | 'canceled';
  statusName: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  platformContentId: string;
  errorMsg: string;
  retryCount: number;
  maxRetries: number;
  createdByName: string;
  createdAt: string;
}

export interface PublishTaskBody {
  draft: number;
  account: number;
  scheduledAt?: string | null;
  payload?: Record<string, unknown>;
}

export const publishApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    paginatedGet<PublishTask>('/publish/', query),
  detail: (id: number) => http.get<PublishTask & { logs: unknown[] }>(`/publish/${id}/`),
  create: (body: PublishTaskBody) =>
    http.post<PublishTask>('/publish/', body),
  retry: (id: number) => http.post<PublishTask>(`/publish/${id}/retry/`),
  cancel: (id: number, reason?: string) =>
    http.post<PublishTask>(`/publish/${id}/cancel/`, { reason }),
};

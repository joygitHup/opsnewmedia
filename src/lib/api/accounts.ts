import { http, paginatedGet } from './client';
import type { PlatformType } from '@/types';

export interface Account {
  id: number;
  platform: PlatformType;
  platformName: string;
  name: string;
  avatar: string;
  status: 'active' | 'expired' | 'error';
  statusName: string;
  followers: number;
  accountGroup: string;
  platformAccountId: string;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  isExpired: boolean;
  addedByName: string;
  rawExtra?: Record<string, unknown>;
  createdAt: string;
}

export interface AccountWriteBody {
  platform: PlatformType;
  name: string;
  avatar?: string;
  followers?: number;
  accountGroup?: string;
  platformAccountId?: string;
}

export interface OAuthStartBody {
  platform: PlatformType;
  redirectUri?: string;
}

export interface OAuthStartResult {
  authorizeUrl: string;
  state: string;
}

export interface OAuthCallbackBody {
  platform: PlatformType;
  code: string;
  state?: string;
  redirectUri?: string;
}

export const accountsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    paginatedGet<Account>('/accounts/', query),
  detail: (id: number) => http.get<Account>(`/accounts/${id}/`),
  create: (body: AccountWriteBody) => http.post<Account>('/accounts/', body),
  update: (id: number, body: Partial<AccountWriteBody>) =>
    http.patch<Account>(`/accounts/${id}/`, body),
  remove: (id: number) => http.delete<{ message: string }>(`/accounts/${id}/`),
  setStatus: (id: number, status: Account['status']) =>
    http.patch<Account>(`/accounts/${id}/status/`, { status }),
  oauthStart: (body: OAuthStartBody) =>
    http.post<OAuthStartResult>('/accounts/oauth/start/', body),
  oauthCallback: (body: OAuthCallbackBody) =>
    http.post<Account>('/accounts/oauth/callback/', body),
};

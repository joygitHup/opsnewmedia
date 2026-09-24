import { http, paginatedGet } from './client';
import type { PlatformType } from '@/types';

export interface ContentDraft {
  id: number;
  title: string;
  coverUrl: string;
  status: 'draft' | 'pending' | 'published' | 'failed';
  statusName: string;
  versionNo: number;
  platforms: PlatformType[];
  tags: string[];
  authorName: string;
  versionCount: number;
  contentMd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentVersionBrief {
  id: number;
  versionNo: number;
  title: string;
  changelog: string;
  createdByName: string;
  createdAt: string;
}

export interface ContentVersionDetail extends ContentVersionBrief {
  contentMd: string;
  coverUrl: string;
  tags: string[];
  platforms: PlatformType[];
}

export interface ContentDraftDetail extends ContentDraft {
  contentMd: string;
  versions: ContentVersionBrief[];
}

export interface ContentDraftBody {
  title: string;
  contentMd?: string;
  coverUrl?: string;
  tags?: string[];
  platforms?: PlatformType[];
}

export interface ContentPreviewResult {
  platform: PlatformType;
  title: string;
  content: string;
  wordCount: number;
  truncated: boolean;
  images: string[];
  warnings: string[];
}

export const contentApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    paginatedGet<ContentDraft>('/content/', query),
  detail: (id: number) => http.get<ContentDraftDetail>(`/content/${id}/`),
  create: (body: ContentDraftBody) =>
    http.post<ContentDraftDetail>('/content/', body),
  update: (id: number, body: Partial<ContentDraftBody>) =>
    http.patch<ContentDraftDetail>(`/content/${id}/`, body),
  remove: (id: number) =>
    http.delete<{ message: string }>(`/content/${id}/`),
  versions: (id: number) =>
    http.get<ContentVersionBrief[]>(`/content/${id}/versions/`),
  versionDetail: (id: number, versionNo: number) =>
    http.get<ContentVersionDetail>(`/content/${id}/versions/${versionNo}/`),
  rollback: (id: number, versionNo: number, changelog?: string) =>
    http.post<ContentDraftDetail>(`/content/${id}/versions/${versionNo}/rollback/`, { changelog }),
  preview: (id: number, platform: PlatformType) =>
    http.post<ContentPreviewResult>(`/content/${id}/preview/`, { platform }),
  setStatus: (id: number, status: ContentDraft['status']) =>
    http.patch<ContentDraftDetail>(`/content/${id}/status/`, { status }),
};

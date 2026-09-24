import { http, paginatedGet } from './client';
import type { MaterialType } from '@/types';

export interface Material {
  id: number;
  type: MaterialType;
  typeName: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  hashSha256: string;
  tags: string[];
  uploaderName: string;
  createdAt: string;
}

export interface UploadUrlBody {
  filename: string;
  type: MaterialType;
  size?: number;
  contentType?: string;
  sha256?: string;
}

export interface UploadUrlResult {
  duplicate: boolean;
  materialId?: number;
  url?: string;
  objectKey?: string;
  uploadUrl?: string;
  contentType?: string;
  method?: string;
}

export interface UploadCallbackBody {
  objectKey: string;
  filename: string;
  type: MaterialType;
  size?: number;
  contentType?: string;
  sha256?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export const materialsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    paginatedGet<Material>('/materials/', query),
  detail: (id: number) => http.get<Material & { objectKey: string; meta: Record<string, unknown> }>(`/materials/${id}/`),
  create: (body: UploadCallbackBody) =>
    http.post<Material>('/materials/', body),
  update: (id: number, body: { name?: string; tags?: string[]; meta?: Record<string, unknown> }) =>
    http.patch<Material>(`/materials/${id}/`, body),
  remove: (id: number) => http.delete<{ message: string }>(`/materials/${id}/`),
  requestUploadUrl: (body: UploadUrlBody) =>
    http.post<UploadUrlResult>('/materials/upload-url/', body),
  /**
   * 同源代理上传（推荐）：multipart 直传后端，由后端流式转发 MinIO。
   * 规避浏览器直传 MinIO 的 CORS 限制；同内容 sha256 自动去重。
   * 返回新建/复用的素材列表。
   */
  upload: (files: File[], opts?: { type?: MaterialType; tags?: string[] }) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    if (opts?.type) form.append('type', opts.type);
    if (opts?.tags && opts.tags.length) form.append('tags', opts.tags.join(','));
    return http.upload<Material[]>('/materials/upload', form);
  },
};

/** 直传文件到 MinIO：PUT presigned URL，不带 Authorization */
export async function uploadToMinio(
  presignedUrl: string,
  file: File,
  contentType?: string,
): Promise<void> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;
  const resp = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers,
  });
  if (!resp.ok) {
    throw new Error(`上传失败：${resp.status}`);
  }
}

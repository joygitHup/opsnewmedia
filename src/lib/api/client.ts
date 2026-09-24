/**
 * API client: fetch 封装 + 401 自动 refresh + Bearer 注入。
 *
 * 与后端约定：
 * - 成功：{ code:0, message:"ok", data:{...} | { list,total,page,pageSize } }
 * - 失败：{ code:40001, message:"参数错误", errors?:{...} }
 * - 401 → 尝试一次 refresh，失败则跳 /login
 */
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api/v1';
const TOKEN_KEY = 'opsnewmedia.accessToken';
const REFRESH_KEY = 'opsnewmedia.refreshToken';

export interface ApiError {
  code: number;
  message: string;
  errors?: Record<string, unknown>;
}

export class ApiException extends Error {
  code: number;
  errors?: Record<string, unknown>;
  status: number;
  constructor(code: number, message: string, status: number, errors?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.errors = errors;
    this.status = status;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set: (access: string, refresh?: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

async function doRefresh(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const resp = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const data = json.data || {};
    // 后端字段为 accessToken / refreshToken
    if (!data.accessToken) return null;
    tokenStorage.set(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

async function refreshIfNeeded(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = doRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  rawResponse?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  // 归一化：补前导斜杠、去掉尾部斜杠。
  // 尾部斜杠统一由 next.config rewrites 转发到 Django 时补上，
  // 避免「路径自带斜杠 + rewrite 补斜杠」产生双斜杠被 Next 308 重定向丢 body。
  let normalized = path.startsWith('/') ? path : `/${path}`;
  normalized = normalized.replace(/\/+$/, '');
  const url = `${API_BASE}${normalized}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      params.append(k, String(v));
    }
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth, rawResponse, query, headers, ...rest } = options;
  const url = buildUrl(path, query);
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };
  // FormData 必须由浏览器自动设置 multipart boundary，不能手动指定 Content-Type
  if (typeof FormData !== 'undefined' && rest.body instanceof FormData) {
    delete finalHeaders['Content-Type'];
  }
  if (!skipAuth) {
    const token = tokenStorage.get();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const doRequest = (authToken?: string | null) => {
    if (authToken) {
      finalHeaders.Authorization = `Bearer ${authToken}`;
    }
    return fetch(url, { ...rest, headers: finalHeaders });
  };

  let resp = await doRequest();

  if (resp.status === 401 && !skipAuth) {
    const newToken = await refreshIfNeeded();
    if (newToken) {
      resp = await doRequest(newToken);
    } else {
      tokenStorage.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        toast.error('登录已过期，请重新登录');
        window.location.href = '/login';
      }
      throw new ApiException(40101, '未登录或登录已过期', 401);
    }
  }

  if (rawResponse) {
    return resp as unknown as T;
  }

  let json: { code: number; message: string; data?: T; errors?: Record<string, unknown> };
  try {
    json = await resp.json();
  } catch {
    throw new ApiException(50000, '响应解析失败', resp.status);
  }

  if (!resp.ok || json.code !== 0) {
    const code = json.code || 50000;
    throw new ApiException(code, json.message || '请求失败', resp.status, json.errors);
  }
  return json.data as T;
}

export const http = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
  upload: <T = unknown>(path: string, form: FormData, opts?: RequestOptions) => {
    const headers = { ...(opts?.headers || {}) } as Record<string, string>;
    delete headers['Content-Type'];
    return request<T>(path, { ...opts, method: 'POST', body: form, headers });
  },
};

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function paginatedGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<PaginatedData<T>> {
  return http.get<PaginatedData<T>>(path, { query });
}

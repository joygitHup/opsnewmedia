import { http } from './client';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatar: string;
  phone: string;
  displayName: string;
  currentTeamId: number | null;
  is_staff?: boolean;
}

export interface LoginResult {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

/**
 * 后端登录/注册响应：用户字段平铺 + tokens 嵌套。
 * 与 services._generate_tokens 字段名保持一致。
 */
interface BackendAuthResponse extends AuthUser {
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
  };
}

function toLoginResult(data: BackendAuthResponse): LoginResult {
  const { tokens, ...user } = data;
  return {
    access: tokens.accessToken,
    refresh: tokens.refreshToken,
    user,
  };
}

export const authApi = {
  register: async (body: RegisterBody): Promise<LoginResult> => {
    const data = await http.post<BackendAuthResponse>('/auth/register/', body);
    return toLoginResult(data);
  },
  login: async (body: LoginBody): Promise<LoginResult> => {
    const data = await http.post<BackendAuthResponse>('/auth/login/', body);
    return toLoginResult(data);
  },
  logout: (refresh: string) =>
    http.post<{ message: string }>('/auth/logout/', { refresh }),
  me: () => http.get<AuthUser>('/auth/me/'),
  changePassword: (body: ChangePasswordBody) =>
    http.post<{ message: string }>('/auth/change-password/', body),
};

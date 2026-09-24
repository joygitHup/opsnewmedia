import { http, paginatedGet, type PaginatedData } from './client';

export interface Team {
  id: number;
  name: string;
  avatar: string;
  description: string;
  ownerName: string;
  memberCount: number;
  role: string;
  createdAt: string;
  plan: string;
}

export interface TeamMember {
  id: number;
  userId: number;
  name: string;
  avatar: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string | null;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface InvitationBody {
  email: string;
  role: string;
}

export interface Invitation {
  id: number;
  teamName: string;
  inviterName: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface RoleMatrix {
  roles: { value: string; label: string }[];
  resources: { value: string; label: string }[];
  actionLabels: Record<string, string>;
  permissions: Record<string, Record<string, string[] | string>>;
}

export interface PlanLimits {
  maxAccounts: number | null;
  maxPlatforms: number | null;
  maxMembers: number | null;
  scheduledPublish: boolean;
  reviewFlow: boolean;
  apiAccess: boolean;
}

export interface PlanItem {
  value: string;
  label: string;
  price: number;
  features: string[];
  limits: PlanLimits;
}

export interface PlanInfo {
  currentPlan: string;
  plans: PlanItem[];
  usage: {
    accounts: number;
    platforms: number;
    members: number;
  };
}

export const teamsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    paginatedGet<Team>('/teams/', query),
  detail: (id: number) => http.get<TeamDetail>(`/teams/${id}/`),
  create: (body: Partial<Team>) => http.post<TeamDetail>('/teams/', body),
  update: (id: number, body: Partial<Team>) =>
    http.patch<TeamDetail>(`/teams/${id}/`, body),
  remove: (id: number) => http.delete<{ message: string }>(`/teams/${id}/`),
  members: (id: number) =>
    http.get<TeamMember[]>(`/teams/${id}/members/`),
  updateMember: (id: number, memberId: number, body: { role: string; status?: string }) =>
    http.patch<TeamMember>(`/teams/${id}/members/${memberId}/`, body),
  removeMember: (id: number, memberId: number) =>
    http.delete<{ message: string }>(`/teams/${id}/members/${memberId}/`),
  invite: (id: number, body: InvitationBody) =>
    http.post<Invitation>(`/teams/${id}/invite/`, body),
  upgrade: (id: number, plan: string) =>
    http.post<TeamDetail>(`/teams/${id}/upgrade/`, { plan }),
  current: () => http.get<TeamDetail>('/teams/current/'),
  switchCurrent: (teamId: number) =>
    http.post<{ teamId: number }>('/teams/current/', { teamId }),
  accept: (token: string) =>
    http.post<TeamMember>('/teams/accept/', { token }),
  roles: () => http.get<RoleMatrix>('/teams/roles/'),
  plan: () => http.get<PlanInfo>('/teams/plan/'),
};

import { http } from './client';

export interface ReviewFlow {
  id: number;
  draft: number;
  draftTitle: string;
  currentStage: string;
  submittedByName: string;
  submittedAt: string | null;
  approvedAt: string | null;
  records: ReviewRecord[];
  createdAt: string;
}

export interface ReviewRecord {
  id: number;
  action: string;
  stage: string;
  comment: string;
  reviewerName: string;
  createdAt: string;
}

export interface SensitiveCheckResult {
  ok: boolean;
  hits: string[];
  masked: string;
}

export const reviewsApi = {
  pending: () => http.get<ReviewFlow[]>('/reviews/pending/'),
  submit: (draftId: number, comment?: string) =>
    http.post<ReviewFlow>(`/reviews/drafts/${draftId}/submit/`, { comment }),
  approve: (flowId: number, comment?: string) =>
    http.post<ReviewFlow>(`/reviews/flows/${flowId}/approve/`, { comment }),
  reject: (flowId: number, comment: string) =>
    http.post<ReviewFlow>(`/reviews/flows/${flowId}/reject/`, { comment }),
  rollback: (flowId: number, comment?: string) =>
    http.post<ReviewFlow>(`/reviews/flows/${flowId}/rollback/`, { comment }),
  sensitiveCheck: (text: string) =>
    http.post<SensitiveCheckResult>('/reviews/sensitive-check/', { text }),
};

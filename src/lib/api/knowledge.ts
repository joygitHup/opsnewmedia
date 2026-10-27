import { http, type PaginatedData } from './client';

export type KnowledgeDocStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type KnowledgeDocSource = 'upload' | 'paste';

export interface KnowledgeDoc {
  id: number;
  title: string;
  sourceType: KnowledgeDocSource;
  sourceTypeName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: KnowledgeDocStatus;
  statusName: string;
  chunkCount: number;
  errorMsg: string;
  hitCount: number;
  createdByName: string;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: number;
  doc: number;
  docTitle: string;
  idx: number;
  content: string;
  tokenCount: number;
  createdAt: string;
}

export interface KnowledgeSearchHit {
  docId: number;
  docTitle: string;
  chunkIdx: number;
  content: string;
  score: number;
}

export interface KnowledgeQASource {
  docId: number;
  docTitle: string;
  chunkIdx: number;
  score: number;
}

export interface KnowledgeQAHistoryMsg {
  role: 'user' | 'assistant';
  content: string;
  sources?: KnowledgeQASource[];
}

export interface KnowledgeQAAnswer {
  answer: string;
  sources: KnowledgeQASource[];
}

export const knowledgeApi = {
  /** multipart 上传文档（md/txt/pdf/docx ≤20MB），异步解析 */
  upload: (file: File, title?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return http.upload<KnowledgeDoc>('/knowledge/upload', form);
  },
  /** 粘贴文本导入，异步解析 */
  paste: (title: string, content: string) =>
    http.post<KnowledgeDoc>('/knowledge/paste', { title, content }),
  list: (query: Record<string, string | number | undefined> = {}) =>
    http.get<PaginatedData<KnowledgeDoc>>('/knowledge/docs', { query }),
  chunks: (docId: number, page = 1, pageSize = 20) =>
    http.get<PaginatedData<KnowledgeChunk>>(`/knowledge/docs/${docId}/chunks`, {
      query: { page, pageSize },
    }),
  remove: (id: number) => http.delete(`/knowledge/docs/${id}`),
  /** 批量删除 */
  batchRemove: (ids: number[]) =>
    http.delete<{ count: number }>('/knowledge/batch', {
      body: JSON.stringify({ ids }),
      headers: { 'Content-Type': 'application/json' },
    }),
  /** 重新解析失败/待处理文档 */
  reparse: (id: number) => http.post<null>(`/knowledge/docs/${id}/reparse`),
  /** 更新文档标题 */
  updateTitle: (id: number, title: string) =>
    http.patch<KnowledgeDoc>(`/knowledge/docs/${id}`, { title }),
  /** 检索测试 */
  search: (query: string, topK = 5, docIds?: number[]) =>
    http.post<{ results: KnowledgeSearchHit[] }>('/knowledge/search', {
      query,
      topK,
      ...(docIds && docIds.length ? { docIds } : {}),
    }),
  /** 知识库问答（RAG + 多轮历史） */
  ask: (question: string, topK = 5, history?: KnowledgeQAHistoryMsg[]) =>
    http.post<KnowledgeQAAnswer>('/knowledge/qa/ask', {
      question,
      topK,
      ...(history && history.length ? { history } : {}),
    }),
};

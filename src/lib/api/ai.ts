import { http } from './client';
import type { PlatformType } from '@/types';

export interface GenerateBody {
  prompt: string;
  platform?: PlatformType;
  length?: number;
  tone?: string;
  keywords?: string[];
  useKnowledge?: boolean;
}

export interface PolishBody {
  content: string;
  platform?: PlatformType;
  mode?: 'lite' | 'formal' | 'casual' | 'rewrite';
  useKnowledge?: boolean;
}

export interface TitleBody {
  content: string;
  platform?: PlatformType;
  count?: number;
  useKnowledge?: boolean;
}

export interface TagsBody {
  content: string;
  platform?: PlatformType;
  count?: number;
  useKnowledge?: boolean;
}

export interface GenerateResult {
  output: string;
  sources?: { docId: number; docTitle: string; chunkIdx: number; score: number }[];
}

export interface TitleResult {
  options: string[];
}

export interface TagsResult {
  tags: string[];
}

export const aiApi = {
  generate: (body: GenerateBody) => http.post<GenerateResult>('/ai/generate/', body),
  polish: (body: PolishBody) => http.post<GenerateResult>('/ai/polish/', body),
  title: (body: TitleBody) => http.post<TitleResult>('/ai/title/', body),
  tags: (body: TagsBody) => http.post<TagsResult>('/ai/tags/', body),
};

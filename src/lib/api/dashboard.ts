import { http } from './client';

export interface OverviewData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalFollowers: number;
  followerGrowth: number;
  publishCount: number;
  accountCount: number;
}

export interface TrendPoint {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followerGrowth: number;
}

export interface PlatformDistributionItem {
  platform: string;
  platformName: string;
  followers: number;
  views: number;
  likes: number;
  accountCount: number;
}

export interface TopContentItem {
  id: number;
  title: string;
  platform: string;
  views: number;
  likes: number;
  publishedAt: string | null;
}

export interface PublishQueueItem {
  id: number;
  title: string;
  platform: string;
  accountName: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  errorMsg: string;
}

export interface DateRange {
  start?: string;
  end?: string;
  days?: number;
}

export const dashboardApi = {
  overview: (range?: DateRange) =>
    http.get<OverviewData>('/dashboard/overview/', { query: range as Record<string, string | number | undefined> }),
  trend: (range?: DateRange) =>
    http.get<{ points: TrendPoint[] }>('/dashboard/trend/', { query: range as Record<string, string | number | undefined> }),
  distribution: (range?: DateRange) =>
    http.get<{ items: PlatformDistributionItem[] }>('/dashboard/distribution/', { query: range as Record<string, string | number | undefined> }),
  topContents: (limit = 10) =>
    http.get<{ items: TopContentItem[] }>('/dashboard/top-contents/', { query: { limit } }),
  publishQueue: (limit = 20) =>
    http.get<{ items: PublishQueueItem[] }>('/dashboard/publish-queue/', { query: { limit } }),
};

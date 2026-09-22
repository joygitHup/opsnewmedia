// 平台类型
export type PlatformType =
  | 'wechat'
  | 'xiaohongshu'
  | 'douyin'
  | 'zhihu'
  | 'weibo'
  | 'bilibili';

export const PLATFORM_CONFIG: Record<
  PlatformType,
  { name: string; color: string; icon: string }
> = {
  wechat: { name: '公众号', color: '#07C160', icon: 'message-circle' },
  xiaohongshu: { name: '小红书', color: '#FF2442', icon: 'book-open' },
  douyin: { name: '抖音', color: '#000000', icon: 'music' },
  zhihu: { name: '知乎', color: '#0066FF', icon: 'help-circle' },
  weibo: { name: '微博', color: '#E6162D', icon: 'at-sign' },
  bilibili: { name: 'B站', color: '#FB7299', icon: 'play-circle' },
};

// 账号
export interface Account {
  id: string;
  platform: PlatformType;
  name: string;
  avatar?: string;
  status: 'active' | 'expired' | 'error';
  followers: number;
  group?: string;
  bindTime: string;
}

// 内容草稿
export interface ContentDraft {
  id: string;
  title: string;
  content: string;
  coverImage?: string;
  tags: string[];
  status: 'draft' | 'pending' | 'published' | 'failed';
  createdAt: string;
  updatedAt: string;
  platforms: PlatformType[];
}

// 发布任务
export interface PublishTask {
  id: string;
  draftId: string;
  title: string;
  platform: PlatformType;
  accountId: string;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  scheduledAt?: string;
  publishedAt?: string;
  errorMessage?: string;
}

// 素材
export interface Material {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  size: number;
  tags: string[];
  createdAt: string;
}

// 数据统计
export interface PlatformStats {
  platform: PlatformType;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followers: number;
  followerGrowth: number;
}

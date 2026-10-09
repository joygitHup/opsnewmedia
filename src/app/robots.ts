import { MetadataRoute } from 'next';

// 生产域名通过 NEXT_PUBLIC_SITE_URL 注入；未配置时使用占位域名
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gaodingfenfa.com';

// 主流 AI 检索 / 生成式引擎爬虫（显式允许抓取，GEO）
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'Baiduspider',
  'Sogou',
  'Yisouspider',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/static/', '/content', '/editor', '/team', '/invite'],
      },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

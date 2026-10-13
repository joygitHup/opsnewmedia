import type { NextConfig } from 'next';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

const nextConfig: NextConfig = {
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
  serverExternalPackages: ['coze-coding-dev-sdk'],
  output: 'standalone',
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev && config.cache && config.cache.type === 'filesystem') {
      config.cache.cacheDirectory = path.resolve(
        'node_modules/.cache/next-webpack',
      );
    }
    return config;
  },
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return {
      // beforeFiles 优先于文件系统路由：根路径直接出宣传页（URL 保持 /）
      beforeFiles: [
        {
          source: '/',
          destination: '/gaodinintriduce/index.html',
        },
      ],
      afterFiles: [
        {
          // 宣传页干净路径（与 canonical 保持一致，地址栏不显示 index.html）
          source: '/gaodinintriduce',
          destination: '/gaodinintriduce/index.html',
        },
        {
          source: '/gaodinintriduce/',
          destination: '/gaodinintriduce/index.html',
        },
        {
          // 转发到后端时统一补尾部斜杠，匹配 Django APPEND_SLASH 期望
          source: '/api/v1/:path*',
          destination: `${BACKEND_URL}/api/v1/:path*/`,
        },
        {
          source: '/api/health',
          destination: `${BACKEND_URL}/api/health/`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;

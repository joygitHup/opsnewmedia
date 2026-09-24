import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: {
    default: '稿定分发 - 多平台内容一键发布',
    template: '%s | 稿定分发',
  },
  description:
    '一站式多平台内容创作与分发工具，支持公众号、小红书、抖音、知乎等平台，一次创作多端分发，统一管理数据聚合。',
  keywords: [
    '内容分发',
    '多平台发布',
    '公众号运营',
    '小红书运营',
    '自媒体工具',
    '内容创作',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
